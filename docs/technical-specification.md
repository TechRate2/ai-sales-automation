# Technical Specification - AI Sales Automation

## 1. Mục tiêu tài liệu

Tài liệu này định nghĩa chuẩn kỹ thuật nội bộ để developer có thể bắt đầu triển khai backend TypeScript cho hệ thống AI Sales Automation theo đúng định hướng:

- Chỉ dùng Pancake ecosystem: Botcake Public API, Botcake Flow/Tag/Automation và Pancake POS Open API.
- AI chỉ tư vấn, thu thập thông tin, tạo tóm tắt handoff và tạo đơn nháp khi đủ điều kiện.
- Không tự động chốt đơn hoàn tất trong giai đoạn hiện tại.
- Không bịa sản phẩm, giá, tồn kho, chính sách hoặc cam kết ngoài Knowledge Base và Pancake POS.
- Khi không chắc chắn, bắt buộc handoff cho sale.

Tài liệu này không thay thế tài liệu chính thức của Botcake/Pancake POS. Các endpoint, payload và authentication method bên ngoài phải được xác minh lại từ tài liệu chính thức trước khi code tích hợp thật.

## 2. Phạm vi kỹ thuật

### Được phép triển khai

- Nhận webhook tin nhắn từ Botcake.
- Gửi phản hồi cho khách qua Botcake Public API `send_content`.
- Gắn tag hoặc kích hoạt handoff bằng Botcake Tag/Flow/Automation nếu tài liệu chính thức xác nhận cách làm.
- Đọc sản phẩm, biến thể, giá và tồn kho từ Pancake POS.
- Tạo đơn nháp trong Pancake POS khi đã có đủ thông tin và sale vẫn là người duyệt.
- Lưu trạng thái hội thoại nội bộ để điều phối tư vấn, handoff và draft order.

### Không được triển khai ở giai đoạn này

- Tự động xác nhận/chốt đơn hoàn tất.
- Dùng công cụ ngoài Pancake ecosystem để thay thế Botcake hoặc Pancake POS trong luồng chính.
- Gợi ý sản phẩm nếu không có dữ liệu đáng tin cậy từ Knowledge Base hoặc Pancake POS.
- Log API key, token, số điện thoại đầy đủ, địa chỉ đầy đủ hoặc nội dung nhạy cảm không cần thiết.

## 3. Kiến trúc module backend đề xuất

```text
src/
├── ai/
│   ├── conversation-engine.ts
│   ├── handoff-rules.ts
│   ├── prompt-loader.ts
│   └── response-policy.ts
├── botcake/
│   ├── botcake-client.ts
│   ├── botcake-types.ts
│   └── webhook-parser.ts
├── pos/
│   ├── pancake-pos-client.ts
│   ├── pancake-pos-types.ts
│   └── product-catalog.ts
├── utils/
│   ├── config.ts
│   ├── errors.ts
│   ├── http-client.ts
│   ├── logger.ts
│   └── retry.ts
└── types/
    ├── domain.ts
    ├── api.ts
    └── state.ts
```

Ghi chú: cấu trúc trên là đề xuất triển khai TypeScript. Nếu repo muốn giữ đúng 4 thư mục hiện tại (`src/botcake`, `src/pos`, `src/ai`, `src/utils`) thì có thể đặt `types/` trong `src/utils/types.ts` ở giai đoạn đầu, sau đó tách khi code lớn hơn.

## 4. Internal Data Contracts / Types

Các contract dưới đây là chuẩn nội bộ. Khi tích hợp API thật, developer phải viết mapper riêng để chuyển payload Botcake/Pancake POS sang các type này. Không dùng trực tiếp payload ngoài làm domain object.

### 4.1 Primitive aliases

```ts
export type ISODateTimeString = string;
export type MoneyVnd = number;
export type NonEmptyString = string;

export type Channel =
  | "facebook"
  | "instagram"
  | "zalo_oa"
  | "whatsapp"
  | "tiktok"
  | "unknown";
```

### 4.2 Product

```ts
export interface Product {
  id: string;
  source: "pancake_pos" | "knowledge_base";
  name: string;
  description?: string;
  category?: string;
  material?: string;
  careInstructions?: string;
  fitNotes?: string;
  images: ProductImage[];
  variants: ProductVariant[];
  policies?: ProductPolicyNote[];
  updatedAt: ISODateTimeString;
}

export interface ProductImage {
  url: string;
  alt?: string;
  source?: "pancake_pos" | "manual";
}

export interface ProductPolicyNote {
  type: "return" | "shipping" | "payment" | "warranty" | "other";
  content: string;
  source: "knowledge_base" | "pancake_pos";
  verifiedAt?: ISODateTimeString;
}
```

Quy tắc:

- `Product.id` phải map được về ID/SKU/mã sản phẩm từ Pancake POS hoặc Knowledge Base.
- Nếu sản phẩm đến từ Knowledge Base nhưng không tìm thấy trong POS, AI chỉ được mô tả thông tin chung và phải handoff nếu khách hỏi giá/tồn kho.
- `updatedAt` bắt buộc để biết dữ liệu có thể đã cũ hay chưa.

### 4.3 ProductVariant

```ts
export interface ProductVariant {
  id: string;
  productId: string;
  sku?: string;
  barcode?: string;
  size?: string;
  color?: string;
  price?: MoneyVnd;
  salePrice?: MoneyVnd;
  inventory?: InventorySnapshot;
  isActive: boolean;
  updatedAt: ISODateTimeString;
}
```

Quy tắc:

- Không tư vấn giá nếu `price` và `salePrice` đều không có dữ liệu xác minh.
- Không nói "còn hàng" nếu không có `InventorySnapshot` mới hoặc trạng thái POS xác nhận.
- Nếu variant thiếu size/màu nhưng khách cần chọn size/màu, AI phải hỏi lại hoặc handoff.

### 4.4 Inventory

```ts
export interface InventorySnapshot {
  productId: string;
  variantId?: string;
  warehouseId?: string;
  availableQuantity?: number;
  reservedQuantity?: number;
  status: "in_stock" | "low_stock" | "out_of_stock" | "unknown";
  checkedAt: ISODateTimeString;
  source: "pancake_pos";
}
```

Quy tắc xác định tồn kho nội bộ:

| Trạng thái | Điều kiện nội bộ | AI được nói với khách |
| --- | --- | --- |
| `in_stock` | POS xác nhận còn hàng, dữ liệu còn mới | Có thể nói còn hàng |
| `low_stock` | POS xác nhận số lượng thấp hoặc gần hết | Nói còn ít, nên để sale kiểm tra lại |
| `out_of_stock` | POS xác nhận hết hàng | Nói hiện chưa có hàng, gợi ý mẫu khác nếu có dữ liệu |
| `unknown` | Không gọi được POS hoặc dữ liệu quá cũ | Không nói chắc, handoff nếu khách muốn mua |

Ngưỡng `low_stock` cần cấu hình bằng env hoặc config nội bộ, ví dụ `LOW_STOCK_THRESHOLD=3`.

### 4.5 CustomerIntent

```ts
export type IntentType =
  | "greeting"
  | "product_question"
  | "size_advice"
  | "price_question"
  | "stock_question"
  | "purchase_intent"
  | "order_info_provided"
  | "complaint"
  | "human_request"
  | "policy_question"
  | "unknown";

export interface CustomerIntent {
  type: IntentType;
  confidence: number;
  signals: string[];
  extractedSlots: ConversationSlots;
  requiresHandoff: boolean;
  handoffReason?: HandoffReason;
}
```

Quy tắc:

- `confidence` nằm trong khoảng `0..1`.
- Nếu `confidence < 0.65`, không thực hiện hành động rủi ro; chỉ hỏi làm rõ hoặc handoff.
- Nếu intent là `purchase_intent`, `order_info_provided`, `complaint` hoặc `human_request`, phải đánh dấu `requiresHandoff = true`.

### 4.6 ConversationSlots

```ts
export interface ConversationSlots {
  customerName?: string;
  phone?: string;
  address?: string;
  desiredUseCase?: string;
  stylePreference?: string;
  budgetRange?: string;
  currentSize?: string;
  bodyShapeNote?: string;
  preferredColors?: string[];
  productIds?: string[];
  variantIds?: string[];
  size?: string;
  color?: string;
  quantity?: number;
  paymentMethod?: string;
  shippingNote?: string;
}
```

Quy tắc:

- Slot PII như `phone`, `address` phải được redact khi log.
- Không tạo đơn nháp nếu thiếu thông tin bắt buộc theo Pancake POS API chính thức.
- Nếu khách cung cấp thông tin đặt hàng nhưng còn thiếu field, AI hỏi bổ sung một cách nhẹ nhàng rồi handoff.

### 4.7 ConversationState

```ts
export type ConversationStage =
  | "new"
  | "qualifying_need"
  | "advising_product"
  | "collecting_order_info"
  | "handoff_required"
  | "draft_order_ready"
  | "waiting_for_sale"
  | "closed";

export interface ConversationState {
  conversationId: string;
  channel: Channel;
  customerId?: string;
  stage: ConversationStage;
  lastCustomerMessageAt: ISODateTimeString;
  lastBotMessageAt?: ISODateTimeString;
  slots: ConversationSlots;
  lastIntent?: CustomerIntent;
  handoff?: HandoffSummary;
  draftOrder?: DraftOrderContext;
  safetyFlags: SafetyFlag[];
  version: number;
  updatedAt: ISODateTimeString;
}
```

Quy tắc:

- `version` dùng cho optimistic locking nếu lưu DB/cache.
- Khi `stage = "handoff_required"` hoặc `"waiting_for_sale"`, AI không tiếp tục tư vấn sâu nếu chưa có tín hiệu sale xử lý hoặc rule cho phép.
- Không chuyển từ `draft_order_ready` sang `closed` bằng AI ở giai đoạn này.

### 4.8 HandoffSummary

```ts
export type HandoffTag =
  | "Sẵn sàng chốt đơn"
  | "Cần sale hỗ trợ"
  | "Đã tạo đơn nháp";

export type HandoffReason =
  | "purchase_intent"
  | "order_info_provided"
  | "complaint_or_difficult_customer"
  | "uncertain_product_info"
  | "uncertain_price"
  | "uncertain_inventory"
  | "uncertain_policy"
  | "human_requested"
  | "sensitive_info"
  | "api_error";

export interface HandoffSummary {
  tag: HandoffTag;
  reason: HandoffReason;
  statusText: string;
  customerNeed?: string;
  interestedProducts: string[];
  knownInfo: string[];
  missingInfo: string[];
  conversationNotes: string;
  createdAt: ISODateTimeString;
}
```

Mẫu render bắt buộc cho sale:

```text
Tình trạng: [Sẵn sàng chốt đơn / Cần sale hỗ trợ / Đã tạo đơn nháp]
Nhu cầu khách: [Mặc đi đâu, phong cách, ngân sách]
Sản phẩm quan tâm: [Tên sản phẩm / mã sản phẩm nếu có]
Thông tin đã có: [Size, màu, số lượng, số điện thoại, địa chỉ, thanh toán]
Thông tin còn thiếu: [Các thông tin cần sale hỏi tiếp]
Lý do handoff: [Khách muốn mua / khiếu nại / AI không chắc / cần người thật]
Ghi chú hội thoại: [Tóm tắt ngắn gọn]
```

### 4.9 DraftOrderContext

```ts
export interface DraftOrderContext {
  draftOrderId?: string;
  source: "pancake_pos";
  customer: DraftOrderCustomer;
  items: DraftOrderItem[];
  paymentMethod?: string;
  shippingAddress?: string;
  note?: string;
  status: "not_created" | "ready_to_create" | "created" | "failed";
  createdAt?: ISODateTimeString;
  errorCode?: InternalErrorCode;
}

export interface DraftOrderCustomer {
  name?: string;
  phone?: string;
  address?: string;
}

export interface DraftOrderItem {
  productId: string;
  variantId?: string;
  sku?: string;
  name: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice?: MoneyVnd;
}
```

Quy tắc:

- Giai đoạn hiện tại chỉ cho phép `created` là đơn nháp/chờ sale duyệt.
- Không gọi API tạo đơn nếu `items` rỗng, thiếu số điện thoại/địa chỉ khi API yêu cầu, hoặc tồn kho không chắc.
- Nếu tạo đơn nháp thất bại, phải handoff với reason `api_error`.

## 5. State Management trong hội thoại

### 5.1 State transition chuẩn

```text
new
  -> qualifying_need
  -> advising_product
  -> collecting_order_info
  -> handoff_required
  -> waiting_for_sale

collecting_order_info
  -> draft_order_ready
  -> waiting_for_sale

any stage
  -> handoff_required
```

### 5.2 Điều kiện chuyển stage

| Từ stage | Sang stage | Điều kiện |
| --- | --- | --- |
| `new` | `qualifying_need` | Khách bắt đầu hội thoại hoặc hỏi sản phẩm chung |
| `qualifying_need` | `advising_product` | Đã có nhu cầu cơ bản: dịp mặc, style, size hoặc ngân sách |
| `advising_product` | `collecting_order_info` | Khách có tín hiệu muốn mua |
| `collecting_order_info` | `handoff_required` | Có thông tin đặt hàng hoặc còn thiếu thông tin cần sale hỏi |
| `collecting_order_info` | `draft_order_ready` | Đủ field bắt buộc và POS/tồn kho xác nhận |
| `draft_order_ready` | `waiting_for_sale` | Đã tạo đơn nháp hoặc cần sale duyệt |
| bất kỳ | `handoff_required` | Complaint, khách cần người thật, API lỗi, dữ liệu không chắc |

### 5.3 TTL và dữ liệu cũ

- Product cache: đề xuất TTL ngắn, ví dụ 5-15 phút, tùy rate limit POS.
- Inventory cache: đề xuất TTL rất ngắn, ví dụ 1-3 phút, hoặc gọi real-time trước khi tư vấn tồn kho.
- Conversation state: giữ theo chính sách vận hành, ví dụ 30-90 ngày, nhưng log phải hạn chế PII.

Các TTL cụ thể cần xác nhận sau khi biết rate limit và khả năng Pancake POS API.

## 6. Safety Guardrails & Rule Engine cho handoff

### 6.1 Rule priority

Rule engine phải chạy trước khi AI gửi phản hồi cuối cùng cho khách. Nếu nhiều rule cùng match, lấy rule có priority cao nhất.

| Priority | Rule | Điều kiện | Hành động |
| --- | --- | --- | --- |
| 100 | Human requested | Khách yêu cầu gặp người thật/sale | Tag "Cần sale hỗ trợ" |
| 95 | Complaint/difficult customer | Khiếu nại, bức xúc, thái độ căng | Tag "Cần sale hỗ trợ" |
| 90 | Purchase intent | Khách nói muốn mua/chốt/lấy hàng | Tag "Sẵn sàng chốt đơn" |
| 88 | Order info provided | Khách gửi số điện thoại/địa chỉ/thông tin đặt hàng | Tag "Sẵn sàng chốt đơn" |
| 85 | Uncertain inventory | Không xác minh được tồn kho | Tag "Cần sale hỗ trợ" |
| 80 | Uncertain product/price/policy | Không có dữ liệu chắc chắn | Tag "Cần sale hỗ trợ" |
| 75 | API error | Botcake/POS lỗi khi cần dữ liệu | Tag "Cần sale hỗ trợ" |
| 60 | Low intent confidence | Không hiểu rõ ý khách | Hỏi làm rõ, handoff nếu lặp lại |

### 6.2 SafetyFlag

```ts
export type SafetyFlag =
  | "NEEDS_HUMAN"
  | "CUSTOMER_COMPLAINT"
  | "PURCHASE_INTENT"
  | "ORDER_INFO_DETECTED"
  | "PRODUCT_DATA_MISSING"
  | "PRICE_UNVERIFIED"
  | "INVENTORY_UNVERIFIED"
  | "POLICY_UNVERIFIED"
  | "API_ERROR"
  | "PII_DETECTED"
  | "LOW_CONFIDENCE";
```

### 6.3 Hành vi bắt buộc khi rule match

- Không nói "em đã chốt đơn" hoặc "đơn đã hoàn tất".
- Chỉ nói theo hướng: "Em đã ghi nhận thông tin, em chuyển sale kiểm tra và xác nhận lại cho chị."
- Nếu thiếu dữ liệu: "Em chưa muốn báo sai cho chị, em chuyển sale kiểm tra lại chính xác giúp mình."
- Nếu API lỗi: không đổ lỗi kỹ thuật cho khách; dùng lời tự nhiên và chuyển sale.

## 7. AI Response Policy

### 7.1 Nguyên tắc nội dung

- Trả lời ngắn, rõ, đúng trọng tâm.
- Tư vấn như nhân viên sale senior, không như bot cứng nhắc.
- Mọi gợi ý sản phẩm phải có nguồn dữ liệu.
- Nếu chỉ có Knowledge Base nhưng chưa có tồn kho POS, không nói chắc còn hàng.
- Khi cần handoff, vừa trấn an khách vừa tạo summary cho sale.

### 7.2 Response object nội bộ

```ts
export interface AiDecision {
  customerReply: string;
  nextStage: ConversationStage;
  confidence: number;
  usedSources: KnowledgeSourceRef[];
  handoff?: HandoffSummary;
  draftOrderAction?: "none" | "prepare" | "create_draft";
  safetyFlags: SafetyFlag[];
}

export interface KnowledgeSourceRef {
  type: "knowledge_base" | "pancake_pos" | "system_prompt" | "handoff_protocol";
  id?: string;
  label: string;
  checkedAt?: ISODateTimeString;
}
```

### 7.3 Điều kiện chặn phản hồi

Không gửi phản hồi AI tự do nếu:

- AI định nói giá nhưng không có nguồn giá.
- AI định nói còn hàng nhưng tồn kho `unknown`.
- AI định xác nhận đơn hoàn tất.
- Câu trả lời chứa thông tin chính sách chưa xác minh.
- Khách đang khiếu nại hoặc yêu cầu người thật.

Trong các trường hợp trên, chuyển sang handoff-safe reply.

## 8. API Response & Error Code chuẩn nội bộ

### 8.1 API success envelope

```ts
export interface ApiSuccess<T> {
  ok: true;
  data: T;
  requestId: string;
  timestamp: ISODateTimeString;
}
```

### 8.2 API error envelope

```ts
export interface ApiFailure {
  ok: false;
  error: {
    code: InternalErrorCode;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
  requestId: string;
  timestamp: ISODateTimeString;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
```

### 8.3 InternalErrorCode

```ts
export type InternalErrorCode =
  | "CONFIG_MISSING"
  | "CONFIG_INVALID"
  | "WEBHOOK_SIGNATURE_INVALID"
  | "WEBHOOK_PAYLOAD_INVALID"
  | "BOTCAKE_API_TIMEOUT"
  | "BOTCAKE_API_ERROR"
  | "BOTCAKE_TAG_FAILED"
  | "POS_API_TIMEOUT"
  | "POS_API_ERROR"
  | "PRODUCT_NOT_FOUND"
  | "INVENTORY_UNKNOWN"
  | "DRAFT_ORDER_VALIDATION_FAILED"
  | "DRAFT_ORDER_CREATE_FAILED"
  | "AI_LOW_CONFIDENCE"
  | "AI_POLICY_BLOCKED"
  | "UNEXPECTED_ERROR";
```

### 8.4 Mapping lỗi sang hành động

| Error code | Retry? | Hành động hệ thống | Hành động với khách |
| --- | --- | --- | --- |
| `CONFIG_MISSING` | Không | Fail startup | Không nhận traffic |
| `WEBHOOK_SIGNATURE_INVALID` | Không | Reject webhook | Không gửi phản hồi |
| `BOTCAKE_API_TIMEOUT` | Có | Retry theo policy | Nếu vẫn fail, log alert |
| `POS_API_TIMEOUT` | Có | Retry rồi fallback | Không nói tồn kho, handoff |
| `PRODUCT_NOT_FOUND` | Không | Không gợi ý sản phẩm đó | Hỏi lại hoặc gợi ý nhóm sản phẩm khác nếu có dữ liệu |
| `INVENTORY_UNKNOWN` | Không/Có tùy nguyên nhân | Handoff | Nói sale sẽ kiểm tra lại |
| `DRAFT_ORDER_CREATE_FAILED` | Có nếu retryable | Handoff | Nói sale sẽ hỗ trợ hoàn tất |
| `AI_POLICY_BLOCKED` | Không | Handoff | Không gửi nội dung rủi ro |

## 9. Error Handling Strategy

### 9.1 Timeout

Đề xuất mặc định cho backend:

- Botcake send message: 5-10 giây.
- Pancake POS product/inventory lookup: 5-10 giây.
- Draft order creation: 10-15 giây.
- AI generation: 20-45 giây tùy model và hạ tầng.

Các con số này là mặc định nội bộ, cần điều chỉnh theo thực tế hạ tầng và rate limit.

### 9.2 Retry

Chỉ retry với lỗi có khả năng tạm thời:

- HTTP 408, 429, 500, 502, 503, 504.
- Network timeout.
- Connection reset.

Không retry:

- 400 payload invalid.
- 401/403 authentication/permission.
- 404 product/order not found, trừ khi tài liệu API nói có eventual consistency.
- Validation error khi tạo đơn nháp.

Đề xuất retry policy:

```ts
export interface RetryPolicy {
  maxAttempts: number; // default: 3
  baseDelayMs: number; // default: 300
  maxDelayMs: number; // default: 3000
  jitter: boolean; // default: true
}
```

### 9.3 Idempotency

- Webhook handler phải chống xử lý trùng message nếu Botcake retry webhook.
- Dùng `messageId`/`eventId` từ webhook nếu có. Nếu không có, tạo fingerprint từ `conversationId + senderId + timestamp + textHash`.
- Draft order creation phải có idempotency key nội bộ để tránh tạo nhiều đơn nháp cho cùng một intent mua hàng.
- Cần xác minh Pancake POS Open API có hỗ trợ idempotency key hay không.

## 10. Logging Standards

### 10.1 Log levels

| Level | Khi dùng | Ví dụ |
| --- | --- | --- |
| `debug` | Chẩn đoán local/staging, không bật rộng ở production | Parser webhook nhận field nào |
| `info` | Luồng nghiệp vụ thành công | Đã xử lý message, đã handoff |
| `warn` | Có fallback nhưng vẫn xử lý được | POS timeout, chuyển sale |
| `error` | Lỗi không xử lý được hoặc mất chức năng | Botcake send failed sau retry |

### 10.2 Field bắt buộc trong log

```ts
export interface LogContext {
  requestId: string;
  conversationId?: string;
  customerId?: string;
  channel?: Channel;
  eventName?: string;
  stage?: ConversationStage;
  errorCode?: InternalErrorCode;
}
```

### 10.3 Redaction sensitive data

Phải redact trước khi log:

| Loại dữ liệu | Cách log |
| --- | --- |
| API key/token | `[REDACTED]` |
| Số điện thoại | `******1234` |
| Địa chỉ | Chỉ log quận/tỉnh nếu cần, không log nhà/số hẻm |
| Nội dung chat nhạy cảm | Tóm tắt hoặc hash |
| Webhook raw body | Chỉ log ở local, không log production |
| Payment info | Không log |

Ví dụ:

```ts
logger.info("handoff_created", {
  requestId,
  conversationId,
  phone: redactPhone(customer.phone),
  handoffReason: "purchase_intent",
});
```

## 11. Webhook Processing Flow nội bộ

```text
Botcake webhook
  -> verify signature/auth
  -> parse payload
  -> deduplicate event
  -> load conversation state
  -> detect intent + extract slots
  -> query Knowledge Base/POS nếu cần
  -> run safety rules
  -> generate AiDecision
  -> if handoff: apply tag/automation + send safe reply
  -> else: send reply via send_content
  -> persist state
  -> log metrics
```

Nếu bất kỳ bước nào không chắc hoặc lỗi ở phần dữ liệu sản phẩm/tồn kho/chính sách, hệ thống phải ưu tiên handoff.

## 12. Metrics tối thiểu

| Metric | Ý nghĩa |
| --- | --- |
| `messages_received_total` | Tổng số tin nhắn nhận từ Botcake |
| `messages_replied_by_ai_total` | Số tin AI trả lời |
| `handoff_total` | Tổng số lần chuyển sale |
| `handoff_by_reason_total` | Số handoff theo lý do |
| `pos_lookup_total` | Số lần gọi POS |
| `pos_lookup_failed_total` | Lỗi POS |
| `botcake_send_failed_total` | Lỗi gửi Botcake |
| `draft_order_created_total` | Số đơn nháp tạo thành công |
| `draft_order_failed_total` | Số đơn nháp tạo lỗi |
| `ai_policy_blocked_total` | Số lần chặn câu trả lời rủi ro |

Mục tiêu đo lường phải bám theo `docs/implementation-plan.md`.

## 13. Environment requirements liên quan

Các biến môi trường chi tiết sẽ nằm trong `docs/environment-and-config.md`. Tối thiểu backend cần:

```text
NODE_ENV=
APP_PORT=
LOG_LEVEL=

BOTCAKE_PAGE_ID=
BOTCAKE_API_TOKEN=
BOTCAKE_WEBHOOK_SECRET=
BOTCAKE_API_BASE_URL=

PANCAKE_API_USER_ACCESS_TOKEN=
PANCAKE_API_PAGE_ACCESS_TOKEN=
PANCAKE_API_PAGE_ID=
PANCAKE_API_BASE_URL=
PANCAKE_API_V2_BASE_URL=

PANCAKE_POS_SHOP_ID=
PANCAKE_POS_API_KEY=
PANCAKE_POS_DEFAULT_WAREHOUSE_ID=
PANCAKE_POS_API_BASE_URL=

LOW_STOCK_THRESHOLD=
PRODUCT_CACHE_TTL_SECONDS=
INVENTORY_CACHE_TTL_SECONDS=
```

Ghi chú:

- `BOTCAKE_PAGE_ID` có thể để trống nếu `BOTCAKE_API_TOKEN` là page token dạng JWT có field `id`; backend sẽ suy ra và ghi `pageIdSource = "token"`.
- `PANCAKE_API_USER_ACCESS_TOKEN` dùng cho page discovery qua Pancake API `GET /pages`.
- `PANCAKE_API_PAGE_ACCESS_TOKEN` dùng cho conversations/messages/tags/customers của Pancake API.
- `PANCAKE_POS_SHOP_ID` lấy bằng `GET /shops`.
- `PANCAKE_POS_DEFAULT_WAREHOUSE_ID` lấy bằng `GET /shops/{SHOP_ID}/warehouses`.

Không commit file `.env` thật lên GitHub.

## 14. Quality Gate & Real-Data Verification

Theo yêu cầu vận hành production-only, repo không chứa file code test/mock/demo trong source chính. Chất lượng được kiểm soát bằng các lớp sau:

### 14.1 Static quality gate

- `npm run typecheck`: TypeScript strict, không cho lỗi type lọt qua.
- `npm run build`: xác nhận source build được.
- `npm run doctor`: kiểm tra prompt, cấu hình, credentials và khóa an toàn.
- Secret scan trước khi commit: không để API key/token thật trong GitHub.

### 14.2 Real-data verification khi có credentials thật

- Verify webhook signature hoặc lớp bảo vệ webhook được cấu hình đúng.
- Capture payload Botcake thật và map vào internal message event.
- Gửi `send_content` tới `psid` nội bộ do shop cung cấp.
- Query product/variant/inventory từ Pancake POS shop thật.
- Kiểm tra mapper Pancake POS product -> `Product`.
- Kiểm tra mapper Pancake POS inventory -> `InventorySnapshot`.
- Chỉ kiểm tra tạo đơn nháp sau khi đã xác minh status draft an toàn và dùng khách nội bộ.
- Xác nhận AI không tự chốt đơn hoàn tất.

### 14.3 Manual audit bắt buộc trước production

- Handoff rule engine đúng với `docs/handoff-protocol.md`.
- Handoff summary đúng mẫu.
- Logger không in phone/token/address/API key.
- API error mapper không làm AI nói chắc khi POS/Botcake lỗi.
- State transition không cho AI chuyển thẳng sang trạng thái chốt đơn hoàn tất.

## 15. Những điểm cần xác minh thêm

### Botcake

- Cấu trúc webhook payload chính thức và field nhận diện message/customer/conversation.
- Cơ chế xác thực webhook: signature header, secret, token hoặc IP allowlist.
- Endpoint đầy đủ của `send_content`, body mẫu, giới hạn nội dung và attachment.
- Cơ chế gắn tag: API trực tiếp, Flow, Automation hoặc đồng bộ qua Pancake.
- Rate limit, timeout, retry behavior và error code chính thức.
- Cách lấy `conversation_id`, customer profile, page/channel ID.

Cần kiểm tra tài liệu chính thức tại `https://docs.pancake.biz/botcake/`.

### Pancake POS

- Base URL Open API chính thức theo shop/region.
- Cách tạo và phân quyền API key.
- Endpoint danh sách sản phẩm, chi tiết biến thể, tồn kho.
- Endpoint tạo đơn nháp và field bắt buộc.
- Trạng thái đơn nháp/chờ duyệt/xác nhận.
- Rate limit, timeout, retry behavior và error code chính thức.
- Có hỗ trợ idempotency key khi tạo đơn hay không.

Cần kiểm tra tài liệu chính thức tại `https://docs.pancake.biz/pos/`.

## 16. Checklist trước khi developer bắt đầu code

- Đã có tài liệu API chính thức của Botcake và Pancake POS.
- Đã xác định env vars và secret management.
- Đã thống nhất database/cache dùng để lưu `ConversationState`.
- Đã có ít nhất một bộ sản phẩm thật hoặc dữ liệu test từ Pancake POS.
- Đã có chính sách cửa hàng thật: đổi trả, giao hàng, thanh toán.
- Đã thống nhất tag trong Botcake: "Sẵn sàng chốt đơn", "Cần sale hỗ trợ", "Đã tạo đơn nháp".
- Đã thống nhất quy trình sale nhận handoff và xử lý tiếp.
