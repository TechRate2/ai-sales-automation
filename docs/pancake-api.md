# Pancake API & Webhooks - Technical Integration Guide

Ngày cập nhật: 2026-06-10

## 1. Mục tiêu

Tài liệu này mô tả cách dùng **Pancake API** để gom phần hội thoại, tin nhắn, page, khách hàng, tag, nhân viên và webhook vào dự án AI Sales Automation.

Phân biệt rõ:

- **Pancake API**: quản lý page, hội thoại, message, customer, tag, staff, thống kê, upload media, webhook messaging.
- **Pancake POS Open API**: quản lý shop, sản phẩm, biến thể, tồn kho, đơn hàng, khách hàng POS, khuyến mãi, thống kê bán hàng.
- **Botcake Public API**: gửi flow/content, dynamic block, tag/automation chatbot.

Nguồn chính thức đã đọc:

- Pancake API docs: `https://docs.pancake.biz/pancake/st-f12/st-p1?lang=en`
- Pancake API reference: `https://developer.pancake.biz/`
- Pancake API OpenAPI YAML: `https://developer.pancake.biz/openapi/openapi.yaml`
- Pancake Webhook docs: `https://docs.pancake.biz/pancake/st-f12/st-p2?lang=en`
- Pancake Webhook OpenAPI YAML: `https://developer.pancake.biz/openapi/webhook.yaml`

## 2. Authentication model

Pancake API dùng token qua **query parameter**, không dùng `Authorization` header theo OpenAPI hiện tại.

| Token | Query param | Base URL | Mục đích | Vòng đời |
| --- | --- | --- | --- | --- |
| User Access Token | `access_token` | `https://pages.fm/api/v1` | List pages, generate page access token | Tối đa 90 ngày hoặc tới khi user logout |
| Page Access Token | `page_access_token` | `https://pages.fm/api/public_api/v1`, `https://pages.fm/api/public_api/v2` | Conversations, messages, customers, tags, statistics, uploads | Không hết hạn trừ khi xóa/regenerate |

### 2.1 Cách lấy User Access Token

Theo tài liệu:

1. Đăng nhập `https://pages.fm`.
2. Vào **Account -> Personal Settings**.
3. Copy **API Access Token**.

User Access Token là secret cấp account, có thể truy cập các page user quản lý. Không commit lên GitHub, không đưa ra frontend.

### 2.2 Tự lấy page đang quản lý

Endpoint:

```http
GET https://pages.fm/api/v1/pages?access_token={PANCAKE_USER_ACCESS_TOKEN}
```

Mục tiêu trong dự án:

- Auto-discovery danh sách page.
- Cho chủ shop chọn page cần AI xử lý.
- Không bắt nhập page ID thủ công nếu có User Access Token.

### 2.3 Tạo Page Access Token bằng API

Endpoint:

```http
POST https://pages.fm/api/v1/pages/{page_id}/generate_page_access_token?access_token={PANCAKE_USER_ACCESS_TOKEN}
```

Điều kiện:

- User phải là admin của page.
- Token cũ có thể bị thay thế khi regenerate, cần xác minh vận hành trước khi gọi tự động.

Quy tắc an toàn:

- Không tự regenerate token nếu chưa có nút xác nhận trong admin UI.
- Mặc định chỉ đọc page list; tạo/regenerate token là action nhạy cảm.
- Ghi audit log: ai bấm, page nào, thời điểm nào.

## 3. Endpoint chính đã xác minh từ OpenAPI

OpenAPI hiện có 27 path chính.

| Nhóm | Endpoint | Method | Mục đích cho dự án |
| --- | --- | --- | --- |
| Pages | `/pages` | GET | List pages bằng User Access Token |
| Pages | `/pages/{page_id}/generate_page_access_token` | POST | Generate page token |
| Conversations | `/pages/{page_id}/conversations` | GET | Lấy 60 hội thoại mới nhất, phân trang bằng `last_conversation_id` |
| Conversation tags | `/pages/{page_id}/conversations/{conversation_id}/tags` | POST | Gắn tag hội thoại |
| Assignment | `/pages/{page_id}/conversations/{conversation_id}/assign` | POST | Assign hội thoại cho nhân viên |
| Read state | `/pages/{page_id}/conversations/{conversation_id}/read` | POST | Mark read |
| Read state | `/pages/{page_id}/conversations/{conversation_id}/unread` | POST | Mark unread |
| Messages | `/pages/{page_id}/conversations/{conversation_id}/messages` | GET | Lấy message history |
| Messages | `/pages/{page_id}/conversations/{conversation_id}/messages` | POST | Gửi inbox/private reply/comment reply/WhatsApp template |
| Tags | `/pages/{page_id}/tags` | GET | Lấy tag Pancake |
| Customers | `/pages/{page_id}/page_customers` | GET | Lấy thông tin khách theo page |
| Customers | `/pages/{page_id}/page_customers/{page_customer_id}` | PUT | Cập nhật thông tin khách |
| Customer notes | `/pages/{page_id}/page_customers/{page_customer_id}/notes` | POST/PUT/DELETE | Ghi chú khách |
| Avatar | `/pages/{page_id}/avatar/{psid}` | GET | Lấy avatar khách |
| Posts | `/pages/{page_id}/posts` | GET | Lấy bài viết |
| Users | `/pages/{page_id}/users` | GET | Danh sách nhân viên/user page |
| Round robin | `/pages/{page_id}/round_robin_users` | POST | Cập nhật chia hội thoại |
| Upload | `/pages/{page_id}/upload_contents` | POST | Upload media để dùng trong message |
| Statistics | `/pages/{page_id}/statistics/*` | GET | Ads, engagement, tags, users, customers |
| Export | `/pages/{page_id}/export_data` | GET | Export conversations từ ads |
| Call logs | `/pages/{page_id}/sip_call_logs` | GET | Lịch sử cuộc gọi |
| Chat plugin | `/pke_chat_plugin/messages` | GET/POST | Chat plugin messages |

## 4. Conversations API

Endpoint:

```http
GET https://pages.fm/api/public_api/v2/pages/{page_id}/conversations?page_access_token={PAGE_ACCESS_TOKEN}
```

Thông tin chính từ spec:

- Trả về 60 hội thoại mới nhất nếu không có `last_conversation_id`.
- Dùng `last_conversation_id` để lấy các hội thoại cũ hơn.
- Có filter theo tag IDs, conversation types như `INBOX`, `COMMENT`, post IDs.

Ứng dụng trong dự án:

- Đồng bộ Unified Inbox.
- Backfill hội thoại khi mới cài hệ thống.
- Phát hiện hội thoại bị bỏ sót nếu webhook lỗi.
- Lead scoring theo snippet, tag, type, thời gian cập nhật.

Không nên dùng polling liên tục thay webhook. Dùng polling như cơ chế backfill/reconcile.

## 5. Messages API

Endpoint lấy tin:

```http
GET https://pages.fm/api/public_api/v1/pages/{page_id}/conversations/{conversation_id}/messages?page_access_token={PAGE_ACCESS_TOKEN}
```

Endpoint gửi tin:

```http
POST https://pages.fm/api/public_api/v1/pages/{page_id}/conversations/{conversation_id}/messages?page_access_token={PAGE_ACCESS_TOKEN}
```

Spec mô tả endpoint POST dùng cho:

- Inbox message.
- Private reply.
- Comment reply.
- WhatsApp template message.

Ứng dụng trong dự án:

- Nên dùng Pancake Messages API cho Unified Inbox trực tiếp trong dự án.
- Nên dùng Botcake `send_content`/`send_flow` khi cần flow chatbot, dynamic block, quick reply, tag/automation Botcake.
- Nếu cả Pancake API và Botcake đều gửi được cùng một kênh, phải có policy chọn một đường gửi chính để tránh double-send.

Khuyến nghị:

| Tình huống | Kênh gửi ưu tiên |
| --- | --- |
| AI trả lời text đơn giản trong Unified Inbox | Pancake Messages API hoặc Botcake, tùy route đã test ổn định |
| Kích hoạt flow, quick reply, dynamic block | Botcake |
| Handoff cần tag/automation Botcake | Botcake |
| Sale gửi thủ công từ dashboard dự án | Pancake Messages API, nếu đã test message policy |
| WhatsApp template | Pancake Messages API, cần cấu hình template hợp lệ |

## 6. Tags, assignment và staff workflow

### 6.1 Lấy tag Pancake

```http
GET https://pages.fm/api/public_api/v1/pages/{page_id}/tags?page_access_token={PAGE_ACCESS_TOKEN}
```

Mục tiêu:

- Map tag Pancake với tag Botcake.
- Thống nhất các tag trong dashboard dự án.
- Dùng tag để lọc hội thoại/handoff.

### 6.2 Gắn tag hội thoại

```http
POST https://pages.fm/api/public_api/v1/pages/{page_id}/conversations/{conversation_id}/tags?page_access_token={PAGE_ACCESS_TOKEN}
```

Ứng dụng:

- Gắn `Sẵn sàng chốt đơn`.
- Gắn `Cần sale hỗ trợ`.
- Gắn `Cần kiểm tra tồn kho`.
- Gắn `Khách im lặng`.

Cần xác minh request body chính xác trong OpenAPI trước khi code mapper.

### 6.3 Assign hội thoại

```http
POST https://pages.fm/api/public_api/v1/pages/{page_id}/conversations/{conversation_id}/assign?page_access_token={PAGE_ACCESS_TOKEN}
```

Ứng dụng:

- Giao khách nóng cho sale theo round robin.
- Giao khách VIP cho sale phụ trách.
- Giao khách khi AI handoff.

Không auto-assign nếu chưa có danh sách nhân viên và quy tắc vận hành rõ ràng.

## 7. Customer 360

Các endpoint liên quan:

```http
GET /pages/{page_id}/page_customers
PUT /pages/{page_id}/page_customers/{page_customer_id}
GET /pages/{page_id}/avatar/{psid}
POST /pages/{page_id}/page_customers/{page_customer_id}/notes
PUT /pages/{page_id}/page_customers/{page_customer_id}/notes
DELETE /pages/{page_id}/page_customers/{page_customer_id}/notes
```

Ứng dụng trong dự án:

- Hồ sơ khách: tên, avatar, nguồn page/channel, tag, ghi chú.
- AI biết khách cũ/từng chat/từng mua khi map thêm POS order/customer.
- Sale nhìn lịch sử tư vấn, sản phẩm quan tâm, đơn nháp, note.
- Follow-up dựa trên trạng thái thật, không spam mù.

Quy tắc:

- Không tự sửa thông tin khách nếu chưa có confidence cao.
- Note do AI tạo phải có prefix `[AI NOTE]`.
- Thông tin nhạy cảm cần redact trong log.

## 8. Pancake Webhooks

Pancake Webhooks cho phép nhận HTTP POST real-time thay vì polling.

### 8.1 Setup theo tài liệu

Yêu cầu:

1. Tạo server endpoint nhận HTTP POST và trả `200`.
2. Cung cấp `page_id` hoặc URL page cho Pancake support để enable webhook.
3. Mỗi page bật webhook tiêu tốn thêm 1 connection slot trong subscription.
4. Cấu hình webhook URL trong page tools settings, cần quyền admin.

### 8.2 Event types

Theo webhook spec:

| Event | Ý nghĩa |
| --- | --- |
| `messaging` | Message mới hoặc message update trong inbox/comment |
| `subscription` | Thay đổi liên quan subscription/users/pages đã subscribe |
| `post` | Post được tạo hoặc field của post thay đổi |

### 8.3 Messaging payload quan trọng

Webhook `messaging` có ví dụ payload gồm:

- `page_id`
- `event_type`
- `data.conversation.id`
- `data.conversation.from.id`
- `data.conversation.from.name`
- `data.conversation.tags`
- `data.conversation.type`: `INBOX` hoặc `COMMENT`
- `data.message.id`
- `data.message.conversation_id`
- `data.message.page_id`
- `data.message.message`
- `data.message.original_message`
- `data.message.type`
- `data.message.inserted_at`
- `data.message.from`
- `data.customer`

Ứng dụng:

- Đây là nguồn event tốt nhất cho AI phản hồi real-time.
- Backend phải normalize về `ConversationEvent` nội bộ.
- Dùng `message.id` làm idempotency key.
- Nếu event là message do page/bot/sale gửi, không để AI tự phản hồi chính mình.

### 8.4 Suspension rule

Pancake có thể tạm dừng webhook nếu trong 30 phút:

- Error rate vượt 80%.
- Số request fail >= 300.

Fail gồm:

- HTTP ngoài 2xx.
- Endpoint timeout hoặc không phản hồi.
- Network error.

Thiết kế bắt buộc:

- Webhook endpoint phải trả `200` nhanh sau khi validate/enqueue.
- AI xử lý dài phải chạy async job, không chặn request webhook.
- Có queue retry nội bộ.
- Có dashboard cảnh báo `webhook_error_rate`.
- Có runbook re-enable webhook.

## 9. Environment variables đề xuất cho Pancake API

```text
PANCAKE_API_USER_ACCESS_TOKEN=
PANCAKE_API_PAGE_ACCESS_TOKEN=
PANCAKE_API_PAGE_ID=
PANCAKE_API_BASE_URL=https://pages.fm/api/public_api/v1
PANCAKE_API_V2_BASE_URL=https://pages.fm/api/public_api/v2
PANCAKE_API_USER_BASE_URL=https://pages.fm/api/v1
PANCAKE_WEBHOOK_SECRET=
PANCAKE_WEBHOOK_TIMEOUT_MS=8000
PANCAKE_API_TIMEOUT_MS=10000
PANCAKE_API_RETRY_MAX_ATTEMPTS=3
```

Ghi chú:

- `PANCAKE_API_USER_ACCESS_TOKEN` dùng để list pages và generate page token.
- `PANCAKE_API_PAGE_ACCESS_TOKEN` dùng cho conversations/messages/tags/customers.
- Nếu chưa có User Access Token, vẫn có thể nhập Page Access Token thủ công từ Page settings -> Tools.
- Không commit các token này.

## 10. Vai trò của Pancake API trong sản phẩm hoàn chỉnh

| Năng lực | Pancake API | Botcake | POS |
| --- | --- | --- | --- |
| List page đang quản lý | Chính | Không thấy endpoint public list page trong Botcake docs | Shop/pages trong POS chỉ là shop context |
| Unified Inbox | Chính | Có thể hỗ trợ qua Botcake flow/message | Không |
| Webhook message real-time | Chính | Cần xác minh Botcake inbound webhook | POS chỉ webhook/order/config |
| Gửi tin sale/manual | Chính nếu đã test policy | Chính nếu dùng flow/dynamic | Không |
| Flow/quick reply/chatbot action | Không phải trọng tâm | Chính | Không |
| Product/inventory/order | Không phải trọng tâm | Không | Chính |
| Customer 360 | Hội thoại/customer page | Chatbot tags/flow | Đơn hàng/khách mua |
| Analytics quảng cáo/hội thoại | Chính | Một phần | Doanh thu/tồn kho |

## 11. Thiết kế tích hợp khuyến nghị

### 11.1 Inbound

```text
Pancake Webhook messaging
  -> Webhook Receiver
  -> Normalize ConversationEvent
  -> Idempotency by message.id
  -> Save Conversation State
  -> AI Orchestrator
```

### 11.2 Context loading

```text
ConversationEvent
  -> Pancake API: messages + customer + tags
  -> Pancake POS: product + inventory + order history
  -> Botcake: tag/flow mapping
  -> Knowledge Base
  -> AI response decision
```

### 11.3 Outbound

```text
AI decision
  -> if simple/manual inbox reply: Pancake Messages API
  -> if flow/quick reply/tag automation: Botcake send_content/send_flow
  -> if purchase intent and safe: POS draft order then handoff
```

### 11.4 Reconciliation

```text
Every 5-15 minutes:
  -> GET /conversations latest
  -> compare with local state
  -> recover missed webhook events
  -> alert if webhook drift high
```

## 12. Những điểm cần xác minh thêm

- Request body chính xác của `POST /conversations/{conversation_id}/messages`.
- Request body chính xác của `POST /conversations/{conversation_id}/tags`.
- Request body chính xác của `POST /conversations/{conversation_id}/assign`.
- Message policy theo từng kênh: Facebook, Instagram, Zalo, WhatsApp, TikTok.
- Cách nhận biết message do page/sale/bot gửi để tránh vòng lặp AI.
- Webhook có signature header hay không; OpenAPI hiện nhấn mạnh endpoint trả `200` nhưng chưa thấy signature auth rõ.
- Có thể enable webhook self-service hay phải qua Pancake support cho tài khoản hiện tại.

## 13. Kết luận

Để dự án thật sự gom được Pancake + POS + Botcake, cần thêm **Pancake API layer** bên cạnh Botcake và POS:

- Pancake API là xương sống cho Unified Inbox, page discovery, message history, customer và webhook.
- Botcake là lớp chatbot automation/flow/tag động.
- Pancake POS là nguồn chuẩn cho sản phẩm, tồn kho, đơn hàng và lịch sử mua.

Nếu chỉ có Botcake token + POS API key thì có thể làm chatbot/POS cơ bản. Nếu muốn dashboard đẳng cấp thay việc mở qua lại Pancake/Botcake/POS, cần thêm Pancake User Access Token hoặc Page Access Token.
