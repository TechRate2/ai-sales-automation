# Botcake Capabilities - Technical Integration Guide

## 1. Mục tiêu tài liệu

Tài liệu này mô tả cách backend AI Sales Automation tích hợp với Botcake trong phạm vi được phép của dự án:

- Nhận tin nhắn khách qua webhook hoặc cơ chế tương đương do Botcake cung cấp.
- Gửi phản hồi bằng Botcake Public API `send_content`.
- Gắn tag, kích hoạt flow/automation và tạo handoff cho sale.
- Không dùng công cụ ngoài Pancake ecosystem để thay thế luồng chính.

Các endpoint đã xác minh được lấy từ Botcake API References và Dynamic Block docs trên `docs.pancake.biz`. Những phần chưa thấy schema chính thức, đặc biệt webhook payload inbound, được ghi rõ là **Cần xác minh từ tài liệu chính thức**.

## 2. Thông tin nền tảng đã xác minh

| Hạng mục | Giá trị |
| --- | --- |
| Public API base URL | `https://botcake.io/api/public_api/v1` |
| Auth header | `access-token: <BOTCAKE_API_TOKEN>` |
| Nơi tạo token | Botcake Settings/API hoặc Cấu hình/Tích hợp/Public API, cần xác minh tên menu theo giao diện hiện tại |
| Gửi content | `POST /pages/{page_id}/flows/send_content` |
| Gửi flow | `POST /pages/{page_id}/flows/send_flow` |
| Lấy danh sách tag | `GET /pages/{page_id}/get_list_tag` |
| Dynamic message version | `v2` |
| Dynamic message limit | Tối đa 10 `messages`, 11 `quick_replies`, 5 `actions` |

Lưu ý: tài liệu Botcake hiện có một đoạn endpoint tag render dạng `pages/[:page_id/get_list_tag` bị thiếu dấu `]` trong placeholder. Khi code, dùng dạng URL thực tế trong example chính thức: `/pages/{page_id}/get_list_tag`, nhưng vẫn cần test bằng page thật.

## 3. Environment variables đề xuất

```text
BOTCAKE_API_BASE_URL=https://botcake.io/api/public_api/v1
BOTCAKE_PAGE_ID=
BOTCAKE_API_TOKEN=
BOTCAKE_WEBHOOK_SECRET=
BOTCAKE_WEBHOOK_ALLOWED_IPS=
BOTCAKE_DEFAULT_TIMEOUT_MS=8000
BOTCAKE_RETRY_MAX_ATTEMPTS=3
BOTCAKE_RETRY_BASE_DELAY_MS=300
```

Quy tắc:

- Không hardcode `BOTCAKE_API_TOKEN`.
- Không log `BOTCAKE_API_TOKEN`, raw webhook body production hoặc thông tin khách đầy đủ.
- `BOTCAKE_WEBHOOK_SECRET` chỉ dùng khi Botcake hỗ trợ secret/signature hoặc khi backend tự thêm lớp bảo vệ reverse proxy.
- Nếu chưa có tài liệu chính thức về webhook auth, endpoint webhook public của backend phải được bảo vệ bằng secret path, allowlist IP hoặc xác thực bổ sung.

## 4. Authentication

### 4.1 Public API outbound

Mọi request gọi Botcake Public API dùng header:

```http
access-token: <BOTCAKE_API_TOKEN>
Content-Type: application/json
```

Ví dụ wrapper TypeScript:

```ts
interface BotcakeRequestOptions {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  requestId: string;
}

async function callBotcake<T>(options: BotcakeRequestOptions): Promise<T> {
  const response = await fetch(`${BOTCAKE_API_BASE_URL}${options.path}`, {
    method: options.method,
    headers: {
      "access-token": BOTCAKE_API_TOKEN,
      "Content-Type": "application/json",
      "X-Request-Id": options.requestId,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(BOTCAKE_DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new BotcakeApiError(response.status, await response.text());
  }

  return response.json() as Promise<T>;
}
```

`X-Request-Id` là header nội bộ để trace. Cần xác minh Botcake có lưu/forward header này không; nếu không, vẫn hữu ích ở log backend.

### 4.2 Webhook inbound

Cần xác minh từ tài liệu chính thức:

- Botcake có gửi signature header hay không.
- Tên header nếu có, ví dụ `x-botcake-signature`, `x-signature`, `x-hub-signature-256`.
- Thuật toán ký: HMAC-SHA256, HMAC-SHA1 hay dạng khác.
- Có retry webhook khi backend trả non-2xx hay không.

Trong lúc chưa xác minh, backend phải áp dụng tối thiểu một trong các guard sau:

- Secret URL path: `/webhooks/botcake/{BOTCAKE_WEBHOOK_SECRET}`.
- Header shared secret do mình cấu hình nếu Botcake cho phép custom header.
- IP allowlist nếu Botcake cung cấp dải IP cố định.
- Rate limit theo IP + page/channel + conversation.

## 5. Webhook nhận tin nhắn

### 5.1 Trạng thái xác minh

Hiện tài liệu repo chưa có webhook payload chính thức, và phần Botcake API References đã tra chưa bóc được schema inbound webhook. Vì vậy, mọi payload dưới đây là **mẫu chuẩn hóa đề xuất cho backend nội bộ**, không được coi là payload Botcake chính thức cho tới khi kiểm tra tài liệu chính thức hoặc capture webhook thật.

### 5.2 Normalized inbound event nội bộ

Backend nên parse payload Botcake về shape nội bộ này trước khi đưa vào AI layer:

```ts
export interface BotcakeInboundEvent {
  eventId: string;
  eventType: "message_created" | "message_updated" | "postback" | "unknown";
  pageId: string;
  conversationId: string;
  psid: string;
  channel: "facebook" | "instagram" | "zalo_oa" | "whatsapp" | "tiktok" | "unknown";
  message: BotcakeInboundMessage;
  sender: BotcakeSender;
  recipient?: BotcakeRecipient;
  timestamp: string;
  raw: unknown;
}

export interface BotcakeInboundMessage {
  messageId: string;
  type: "text" | "image" | "audio" | "video" | "file" | "postback" | "unknown";
  text?: string;
  attachments?: BotcakeAttachment[];
  payload?: Record<string, unknown>;
  isEcho?: boolean;
}

export interface BotcakeAttachment {
  type: "image" | "audio" | "video" | "file" | "unknown";
  url?: string;
  title?: string;
  payload?: Record<string, unknown>;
}

export interface BotcakeSender {
  id: string;
  psid?: string;
  name?: string;
  phone?: string;
  email?: string;
}

export interface BotcakeRecipient {
  id: string;
  pageId?: string;
}
```

### 5.3 Payload mẫu để dev test parser

Payload dưới đây là mẫu nội bộ để viết unit test parser. Cần thay bằng payload Botcake thật sau khi có webhook sample chính thức.

```json
{
  "event_id": "evt_20260610_000001",
  "event_type": "message_created",
  "page_id": "123456789",
  "conversation_id": "123456789_987654321",
  "psid": "987654321",
  "channel": "facebook",
  "message": {
    "id": "mid.$example",
    "type": "text",
    "text": "Chị muốn mua áo này size L còn không em?",
    "attachments": []
  },
  "sender": {
    "id": "987654321",
    "name": "Nguyễn Thị A",
    "phone": "+8490123xxxx"
  },
  "timestamp": "2026-06-10T12:00:00.000Z"
}
```

### 5.4 Field quan trọng cần map

| Field nội bộ | Bắt buộc | Mục đích | Nếu thiếu |
| --- | --- | --- | --- |
| `eventId` | Có | Idempotency, chống xử lý trùng | Tạo fingerprint từ `conversationId + psid + timestamp + textHash` |
| `pageId` | Có | Chọn token/page khi gửi reply | Reject nếu không map được page |
| `conversationId` | Có | Lưu state hội thoại | Tạo từ page + psid nếu Botcake không gửi |
| `psid` | Có | Gửi `send_content`/`send_flow` | Không thể trả lời tự động, handoff/log alert |
| `channel` | Có | Policy gửi tin theo kênh | Default `unknown`, hạn chế message_tag |
| `message.text` | Không | Input cho AI | Nếu attachment-only, hỏi sale/flow xử lý sau |
| `timestamp` | Có | Ordering, retry, stale check | Dùng thời điểm server nhận nhưng log warning |

### 5.5 Idempotency webhook

Webhook handler phải idempotent vì Botcake hoặc network có thể retry khi backend timeout/non-2xx.

Đề xuất:

```ts
function getDedupeKey(event: BotcakeInboundEvent): string {
  if (event.eventId) return `botcake:event:${event.eventId}`;

  const textHash = sha256(event.message.text ?? JSON.stringify(event.message.payload ?? {}));
  return [
    "botcake:fingerprint",
    event.pageId,
    event.conversationId,
    event.psid,
    event.timestamp,
    textHash,
  ].join(":");
}
```

Flow xử lý:

1. Verify webhook/auth.
2. Parse payload về `BotcakeInboundEvent`.
3. Tạo dedupe key.
4. Nếu key đã xử lý, trả `200 OK` ngay.
5. Lưu raw event tối giản hoặc hash để audit.
6. Đưa event vào conversation engine.
7. Persist state sau khi gửi reply/handoff.

### 5.6 Retry inbound

Cần xác minh Botcake có retry webhook và lịch retry chính thức. Backend nên:

- Trả `200 OK` nhanh khi event hợp lệ đã nhận vào queue/state.
- Trả `401/403` khi auth webhook sai.
- Trả `400` khi payload invalid không thể parse.
- Trả `500` chỉ với lỗi tạm thời thật sự, vì có thể gây retry nhiều lần.
- Không xử lý AI dài trực tiếp trong request webhook nếu timeout Botcake ngắn; nên enqueue job nội bộ.

## 6. Gửi tin nhắn với `send_content`

### 6.1 Endpoint

```http
POST https://botcake.io/api/public_api/v1/pages/{page_id}/flows/send_content
```

Headers:

```http
access-token: <BOTCAKE_API_TOKEN>
Content-Type: application/json
```

### 6.2 Request body đã xác minh

| Field | Required | Type | Ý nghĩa |
| --- | --- | --- | --- |
| `psid` | Có | string | Customer ID string returned on Facebook page hoặc ID khách theo kênh |
| `data` | Có | object | Dynamic message payload, format `version: "v2"` |
| `message_tag` | Không | string | Message tag theo policy kênh, cần kiểm tra trước khi dùng |
| `payload` | Không | object | Biến truyền vào dynamic content, có thể dùng `{{variable}}` trong text |

Response thành công:

```json
{
  "success": true
}
```

### 6.3 Text message mẫu

```bash
curl --location "https://botcake.io/api/public_api/v1/pages/${BOTCAKE_PAGE_ID}/flows/send_content" \
  --header "access-token: ${BOTCAKE_API_TOKEN}" \
  --header "Content-Type: application/json" \
  --data '{
    "psid": "123456789",
    "payload": {
      "user_full_name": "chị Lan"
    },
    "data": {
      "version": "v2",
      "content": {
        "messages": [
          {
            "type": "text",
            "text": "Dạ chị {{user_full_name}}, em đã ghi nhận nhu cầu của mình. Chị cho em xin thêm size mình hay mặc để em tư vấn chuẩn hơn nhé?"
          }
        ],
        "actions": [],
        "quick_replies": []
      }
    }
  }'
```

### 6.4 Text + button mẫu

Dynamic Block docs xác nhận text message có thể dùng button `url`, `flow`, `call`. Body mẫu:

```json
{
  "psid": "123456789",
  "data": {
    "version": "v2",
    "content": {
      "messages": [
        {
          "type": "text",
          "text": "Em gửi chị vài lựa chọn phù hợp, chị muốn xem mẫu nào trước ạ?",
          "buttons": [
            {
              "type": "flow",
              "title": "Xem mẫu áo",
              "flow_id": 12345
            },
            {
              "type": "flow",
              "title": "Tư vấn size",
              "flow_id": 12346
            }
          ]
        }
      ],
      "actions": [],
      "quick_replies": []
    }
  }
}
```

Cần xác minh:

- Giới hạn số button trên từng loại message.
- `flow_id` thật của Botcake flow.
- Button `call` hoạt động với kênh nào.

### 6.5 Quick replies mẫu

```json
{
  "psid": "123456789",
  "data": {
    "version": "v2",
    "content": {
      "messages": [
        {
          "type": "text",
          "text": "Chị muốn em tư vấn theo tiêu chí nào trước ạ?"
        }
      ],
      "quick_replies": [
        {
          "type": "flow",
          "caption": "Theo size",
          "flow_id": 20001
        },
        {
          "type": "flow",
          "caption": "Theo dáng người",
          "flow_id": 20002
        },
        {
          "type": "flow",
          "caption": "Theo ngân sách",
          "flow_id": 20003
        }
      ],
      "actions": []
    }
  }
}
```

Giới hạn đã xác minh: tối đa 11 `quick_replies`.

### 6.6 Image/attachment mẫu

Dynamic Block docs có mục sending image nhưng schema chi tiết cần kiểm tra lại bằng tài liệu chính thức và test sandbox. Đề xuất body cần xác minh:

```json
{
  "psid": "123456789",
  "data": {
    "version": "v2",
    "content": {
      "messages": [
        {
          "type": "image",
          "url": "https://example.com/product-image.jpg"
        },
        {
          "type": "text",
          "text": "Mẫu này dáng suông nhẹ, hợp với chị thích mặc thoải mái."
        }
      ],
      "actions": [],
      "quick_replies": []
    }
  }
}
```

Cần xác minh:

- Field image chính xác là `url`, `attachment`, hay object khác.
- File type/size được Botcake và kênh chat hỗ trợ.
- Botcake có cần upload media trước hay chấp nhận URL public.

### 6.7 Gửi tin nhắn kèm tag

Dynamic message format hỗ trợ `actions`, trong đó có action:

```json
{
  "action": "add_tag",
  "tag_id": 12345
}
```

Mẫu gửi safe handoff reply và gắn tag "Cần sale hỗ trợ":

```json
{
  "psid": "123456789",
  "payload": {
    "customer_name": "chị Lan"
  },
  "data": {
    "version": "v2",
    "content": {
      "messages": [
        {
          "type": "text",
          "text": "Dạ chị {{customer_name}}, em chưa muốn báo sai thông tin cho mình. Em chuyển sale kiểm tra lại chính xác và hỗ trợ chị ngay nhé."
        }
      ],
      "actions": [
        {
          "action": "add_tag",
          "tag_id": 90002
        }
      ],
      "quick_replies": []
    }
  }
}
```

Quy tắc:

- `tag_id` phải lấy từ Botcake qua `get_list_tag`, không hardcode tên tag thành ID nếu chưa sync.
- Nếu add tag qua `send_content` thất bại nhưng message gửi thành công, backend vẫn phải log `BOTCAKE_TAG_FAILED` và tạo alert cho sale.
- Nếu khách đã cần handoff, reply phải ngắn, trấn an, không tiếp tục tư vấn sâu.

## 7. Gửi flow với `send_flow`

### 7.1 Endpoint

```http
POST https://botcake.io/api/public_api/v1/pages/{page_id}/flows/send_flow
```

Headers:

```http
access-token: <BOTCAKE_API_TOKEN>
Content-Type: application/json
```

Request body đã xác minh:

| Field | Required | Type | Ý nghĩa |
| --- | --- | --- | --- |
| `psid` | Có | string | Customer ID |
| `flow_id` | Có | integer | ID flow cần gửi |
| `payload` | Không | object | Biến truyền vào flow/dynamic block |

Ví dụ:

```json
{
  "psid": "123456789",
  "flow_id": 123456,
  "payload": {
    "user_full_name": "chị Lan",
    "handoff_reason": "purchase_intent"
  }
}
```

Response thành công:

```json
{
  "success": true
}
```

Use case trong dự án:

- Kích hoạt flow thu thập thêm size/màu/số lượng.
- Kích hoạt flow chuyển sale/handoff nếu Botcake flow đã được cấu hình.
- Kích hoạt flow xác nhận thông tin trước khi tạo đơn nháp ở giai đoạn sau.

## 8. Tag & Handoff

### 8.1 Lấy danh sách tag

Endpoint:

```http
GET https://botcake.io/api/public_api/v1/pages/{page_id}/get_list_tag?page=1
```

Headers:

```http
access-token: <BOTCAKE_API_TOKEN>
```

Tham số đã xác minh:

| Param | Required | Type | Ý nghĩa |
| --- | --- | --- | --- |
| `page` | Không | integer | Phân trang, tài liệu ghi mỗi lần gọi lấy tối đa 50 tag |

Response mẫu từ tài liệu:

```json
{
  "data": [
    {
      "id": 49261532,
      "name": "Sẵn sàng chốt đơn",
      "pancake_tag_id": 67
    },
    {
      "id": 49261139,
      "name": "Cần sale hỗ trợ",
      "pancake_tag_id": 66
    }
  ]
}
```

Quy tắc cache:

- Cache mapping `tagName -> tagId` 5-15 phút.
- Refresh ngay khi tag not found.
- Không tự tạo tag nếu chưa có API/permission chính thức; yêu cầu admin tạo trong Botcake trước.

### 8.2 Tag khuyến nghị cho dự án

| Tag | Mục đích | Khi gắn |
| --- | --- | --- |
| `Sẵn sàng chốt đơn` | Sale ưu tiên xử lý khách có ý định mua | Khách muốn mua hoặc gửi thông tin đặt hàng |
| `Cần sale hỗ trợ` | Sale kiểm tra/tư vấn trực tiếp | Khiếu nại, hỏi khó, cần người thật, AI/POS không chắc |
| `Đã tạo đơn nháp` | Sale duyệt đơn nháp | Chỉ dùng khi Pancake POS draft order đã tạo thành công |
| `Thiếu thông tin đặt hàng` | Sale hoặc flow hỏi bổ sung | Khách muốn mua nhưng thiếu size/màu/số lượng/địa chỉ/điện thoại |
| `Cần kiểm tra tồn kho` | Sale kiểm lại POS/kho | POS timeout, tồn kho unknown hoặc low stock |
| `Khách hỏi chính sách` | Sale/flow giải thích chính sách | Chính sách đổi trả/vận chuyển/thanh toán chưa chắc |

Ba tag bắt buộc theo tài liệu dự án:

- `Sẵn sàng chốt đơn`
- `Cần sale hỗ trợ`
- `Đã tạo đơn nháp`

### 8.3 Cách gắn tag

Thứ tự ưu tiên:

1. Gắn tag trong `send_content` bằng dynamic `actions.add_tag` nếu đã test thành công.
2. Kích hoạt `send_flow` tới flow handoff đã cấu hình để flow tự gắn tag.
3. Dùng Botcake Automation rule nếu tag được tạo/sync từ Pancake.
4. Nếu tất cả cơ chế tag lỗi, log alert và gửi safe reply cho khách, không tiếp tục tự động hóa.

Cần xác minh thêm:

- Botcake Public API có endpoint gắn tag trực tiếp cho customer ngoài `actions.add_tag` hay không.
- `actions.add_tag` có hoạt động trong `send_content` cho tất cả channel không.
- `pancake_tag_id` khác gì với `id` trong response tag khi cần sync sang Pancake.

### 8.4 Handoff summary qua payload

Khi kích hoạt flow handoff, gửi payload tóm tắt để Botcake flow/custom field có thể hiển thị cho sale:

```json
{
  "psid": "123456789",
  "flow_id": 30001,
  "payload": {
    "handoff_status": "Cần sale hỗ trợ",
    "handoff_reason": "uncertain_inventory",
    "customer_need": "Muốn mua áo dáng suông mặc đi tiệc",
    "interested_products": "Áo suông A123 màu xanh size L",
    "known_info": "Size L; thích màu xanh; cần giao Hà Nội",
    "missing_info": "Số điện thoại; địa chỉ chi tiết",
    "conversation_notes": "Khách hỏi tồn kho nhưng POS timeout, cần sale kiểm tra lại."
  }
}
```

Nếu flow không hỗ trợ payload/custom field, backend vẫn lưu summary nội bộ và gắn tag để sale tìm hội thoại.

## 9. Trigger Flow/Automation từ code

### 9.1 Trigger bằng `send_flow`

Dùng khi cần đưa khách vào flow Botcake đã thiết kế sẵn:

```ts
await botcake.sendFlow({
  pageId,
  psid,
  flowId: HANDOFF_FLOW_ID,
  payload: {
    handoff_status: summary.tag,
    handoff_reason: summary.reason,
    conversation_notes: summary.conversationNotes,
  },
});
```

### 9.2 Trigger bằng quick reply/flow button

Dùng khi muốn khách tự chọn nhánh:

```json
{
  "type": "flow",
  "caption": "Gặp sale",
  "flow_id": 30001
}
```

### 9.3 Trigger bằng tag/automation

Dùng khi Botcake Automation đã cấu hình rule: "Khi customer có tag X -> thông báo sale/chuyển flow".

Luồng đề xuất:

```text
AI rule detects handoff
  -> send_content safe reply
  -> actions.add_tag(tag_id)
  -> Botcake Automation sees tag
  -> Sale receives queue/notification inside Botcake/Pancake
```

Cần xác minh từ Botcake admin:

- Automation rule nào đang tồn tại.
- Tag nào trigger notification.
- Sale nhìn handoff ở đâu: Live Chat, Pancake, custom field, note hay flow.

## 10. Rate limit, timeout và retry

### 10.1 Rate limit

Botcake API References chưa thấy rate limit chính thức trong nội dung đã tra. Cần xác minh từ tài liệu chính thức hoặc support Botcake.

Mặc định nội bộ đề xuất:

| API | Timeout | Retry | Ghi chú |
| --- | --- | --- | --- |
| `send_content` | 8 giây | 3 attempts | Retry 408/429/5xx/network |
| `send_flow` | 8 giây | 3 attempts | Không retry nếu validation/flow_id sai |
| `get_list_tag` | 8 giây | 2 attempts | Có thể cache để giảm gọi |

### 10.2 Retry policy

```ts
const BOTCAKE_RETRY_POLICY = {
  maxAttempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 3000,
  jitter: true,
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
};
```

Không retry:

- `400` invalid payload.
- `401`/`403` token sai hoặc thiếu quyền.
- `404` sai `page_id`, `psid`, `flow_id` hoặc endpoint.
- Lỗi policy do channel không cho gửi tin.

### 10.3 Circuit breaker

Nếu Botcake liên tục lỗi:

- Sau 5 lỗi liên tiếp trong 1 phút với cùng endpoint, bật circuit breaker 60 giây.
- Trong thời gian này, không spam API; chuyển event sang queue chờ retry.
- Nếu handoff quan trọng, log alert nội bộ để sale kiểm tra thủ công.

## 11. Error codes và cách xử lý

### 11.1 HTTP/API errors

| HTTP/status | Nguyên nhân thường gặp | Retry | Hành động |
| --- | --- | --- | --- |
| 400 | Body sai schema, thiếu `psid`, thiếu `data` | Không | Log `BOTCAKE_API_ERROR`, fix mapper |
| 401 | Sai/thiếu `access-token` | Không | Dừng gửi, alert cấu hình |
| 403 | Token không có quyền page | Không | Alert admin Botcake |
| 404 | Sai page/flow/customer/endpoint | Không | Kiểm tra `page_id`, `flow_id`, `psid` |
| 408 | Timeout | Có | Retry |
| 429 | Rate limit | Có, backoff dài hơn | Giảm tốc, queue |
| 500/502/503/504 | Lỗi tạm thời Botcake/network | Có | Retry rồi alert nếu vẫn fail |

### 11.2 Business errors

| Tình huống | Cách xử lý |
| --- | --- |
| `{ "success": false }` | Treat as failure dù HTTP 200; đọc field lỗi nếu có |
| Message gửi được nhưng tag không gắn | Log `BOTCAKE_TAG_FAILED`, refresh tag mapping, retry tag qua flow nếu có |
| Flow không tồn tại | Không retry; alert cấu hình `flow_id` |
| Customer không nhận được do channel policy | Handoff sale, tránh spam retry |
| Another app controls thread | Theo Handover Protocol docs, cần xử lý quyền điều khiển thread; sale hoặc admin kiểm tra app control |

### 11.3 Internal error mapping

| Botcake failure | InternalErrorCode |
| --- | --- |
| Timeout | `BOTCAKE_API_TIMEOUT` |
| Non-2xx response | `BOTCAKE_API_ERROR` |
| Webhook auth failed | `WEBHOOK_SIGNATURE_INVALID` |
| Payload parse failed | `WEBHOOK_PAYLOAD_INVALID` |
| Tag action failed | `BOTCAKE_TAG_FAILED` |
| Unexpected | `UNEXPECTED_ERROR` |

## 12. Best practices khi tích hợp

### 12.1 Security

- Không log token, raw header auth, raw webhook body production.
- Redact số điện thoại: `******1234`.
- Không đưa API key vào URL query string.
- Rotate token định kỳ hoặc khi nghi ngờ rò rỉ.
- Chỉ cấp quyền token đúng page cần dùng.

### 12.2 Reliability

- Luôn dùng timeout cho mọi request Botcake.
- Dùng idempotency cho webhook và draft-order/handoff events.
- Cache tag list, nhưng refresh khi tag not found.
- Không xử lý AI dài trong webhook request nếu Botcake có timeout ngắn.
- Tách outbound sending thành job queue nếu traffic 1000-2000 tin/ngày tăng đột biến.

### 12.3 Safety

- Khi không chắc, dùng tag `Cần sale hỗ trợ`.
- Không gửi câu "đã chốt đơn" hoặc "đơn đã hoàn tất".
- Không nói chắc tồn kho/giá/chính sách nếu chưa có dữ liệu POS/Knowledge Base.
- Khi khách muốn mua, gắn `Sẵn sàng chốt đơn` và tạo summary cho sale.
- Khi tạo đơn nháp ở phase sau, gắn `Đã tạo đơn nháp`; sale vẫn duyệt.

### 12.4 Observability

Log mỗi request Botcake với context tối thiểu:

```ts
logger.info("botcake_send_content_result", {
  requestId,
  pageId,
  psid: redactPsid(psid),
  conversationId,
  status: "success",
  messageCount: data.content.messages.length,
  actionCount: data.content.actions?.length ?? 0,
});
```

Metrics đề xuất:

- `botcake_webhook_received_total`
- `botcake_webhook_duplicate_total`
- `botcake_send_content_total`
- `botcake_send_content_failed_total`
- `botcake_send_flow_total`
- `botcake_send_flow_failed_total`
- `botcake_tag_applied_total`
- `botcake_tag_failed_total`
- `botcake_api_latency_ms`

## 13. Implementation checklist cho developer

Trước khi code:

- Có `BOTCAKE_PAGE_ID` thật.
- Có `BOTCAKE_API_TOKEN` thật từ Botcake Settings/API.
- Có ít nhất một `psid` test.
- Có danh sách `flow_id` cho flow cần dùng.
- Có tag thật trong Botcake cho 3 tag bắt buộc.
- Có webhook sample thật hoặc cách capture webhook.

Khi code:

- Viết `BotcakeClient.sendContent`.
- Viết `BotcakeClient.sendFlow`.
- Viết `BotcakeClient.getListTag`.
- Viết `WebhookParser` map raw payload -> normalized event.
- Viết `TagResolver` map tag name -> tag ID.
- Viết retry/timeout wrapper.
- Viết tests cho success, timeout, 401, 404, 429, `{ success: false }`.

Trước khi production:

- Test gửi text.
- Test gửi quick replies.
- Test gửi flow.
- Test add tag.
- Test handoff automation sau khi tag.
- Test duplicate webhook.
- Test token sai.
- Test Botcake timeout.

## 14. Những điểm cần xác minh thêm

### Webhook

- Payload inbound chính thức của Botcake.
- Header xác thực webhook và thuật toán signature.
- Botcake có retry webhook không, retry bao nhiêu lần, khoảng cách thế nào.
- Botcake có gửi event ID/message ID ổn định không.
- Cách nhận biết message do bot/sale gửi để tránh AI tự phản hồi chính mình.

### Send content

- Schema đầy đủ cho image, file, audio, video và product card.
- Giới hạn button theo từng channel.
- `message_tag` nào được phép dùng theo từng kênh.
- Lỗi chi tiết khi gửi ngoài policy window.

### Tag/Flow/Automation

- Có endpoint gắn tag trực tiếp cho customer không.
- `actions.add_tag` có chạy đồng nhất trên mọi channel không.
- `pancake_tag_id` và Botcake tag `id` khác nhau thế nào trong các API khác.
- Cách trigger Automation từ code ngoài tag/flow.
- Cách sale nhận notification khi tag được gắn.

Nguồn cần kiểm tra tiếp:

- Botcake API References: `https://docs.pancake.biz/botcake/st-f7/st-p2`
- Botcake Dynamic Block docs: `https://docs.pancake.biz/botcake/st-f7/st-p1`
- Botcake Handover Protocol: `https://docs.pancake.biz/botcake/st-f7/st-p3`

