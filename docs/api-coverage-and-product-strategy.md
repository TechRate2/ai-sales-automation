# API Coverage And Product Strategy

Ngày cập nhật: 2026-06-10

## 1. Kết luận ngắn

Dự án có thể trở thành **AI Sales Control Center** gom Pancake, Pancake POS và Botcake vào một giao diện riêng, nhưng **không thể mặc định có 100% chức năng nội bộ của cả 3 ứng dụng** nếu API công khai không expose toàn bộ chức năng đó.

Cách hiểu đúng:

- API nào Pancake/POS/Botcake cho phép đọc/ghi thì dự án có thể gom vào UI riêng và tự động hóa.
- API nào chưa expose hoặc chưa có quyền thì dự án chỉ có thể mở link, hướng dẫn thao tác, hoặc chờ xác minh.
- Mục tiêu tốt nhất không phải clone 3 app, mà là xây một lớp vận hành thông minh hơn cho shop: inbox + sản phẩm + tồn kho + đơn nháp + handoff + follow-up + analytics + LLM sales agent.

## 2. Dự án giống sản phẩm quốc tế nào?

| Sản phẩm quốc tế | Năng lực nổi bật | Áp dụng vào dự án |
| --- | --- | --- |
| Gorgias | Helpdesk + AI Agent cho ecommerce, unified conversations, automation, hỗ trợ bán hàng dựa trên dữ liệu store, inventory và shopper context | Dự án nên giống một Gorgias phiên bản Pancake ecosystem: inbox, AI tư vấn, handoff, revenue dashboard |
| Intercom Fin | AI Agent xử lý câu hỏi 24/7, có handoff cho agent, tùy chỉnh vai trò/tone, dùng knowledge để trả lời tốt hơn | Dự án cần AI role rõ: tư vấn, thu thập thông tin, handoff, follow-up; không trả lời ngoài nguồn dữ liệu |
| Zendesk AI | AI service platform với AI agents, workflow, QA, analytics, ticket/inbox và escalation | Dự án cần Risk Center, SLA, quality review, lý do AI trả lời/handoff |
| Klaviyo | B2C CRM, marketing automation, segmentation, personalized campaigns/flows bằng dữ liệu khách | Dự án cần follow-up planner, khách cũ, segment theo sản phẩm/size/lịch sử mua |

Kết luận vị thế sản phẩm: **AI Sales OS cho shop đang dùng Pancake**, gần với Gorgias + Intercom Fin + Klaviyo, nhưng tập trung vào bán hàng livestream/inbox/comment/POS trong hệ Pancake.

## 3. API đang dùng thật trong source hiện tại

### 3.1 Botcake Public API

| Endpoint | Trạng thái trong source | Đang dùng thật? | Mục đích |
| --- | --- | --- | --- |
| `GET /pages/{page_id}/get_list_tag` | Đã code `BotcakeClient.listTags` | Có | Đọc tag thật để dashboard hiển thị và chuẩn bị tag mapping |
| `POST /pages/{page_id}/flows/send_content` | Đã code `BotcakeClient.sendContent` | Chưa gửi thật | Gửi dynamic content, text, quick reply, actions/tag |
| `POST /pages/{page_id}/flows/send_flow` | Đã code `BotcakeClient.sendFlow` | Chưa gửi thật | Kích hoạt Botcake Flow |
| Dynamic Block `actions.add_tag` | Đã tài liệu hóa | Chưa test thật | Gắn tag qua dynamic message |

Kết quả live hiện tại:

- Botcake API pass.
- Đọc được 14 tag thật.
- UI hiển thị tag thật trong mục **Dữ liệu thật**.

Chưa dùng:

- Gửi tin thật cho khách vì chưa có PSID/khách nội bộ để test an toàn.
- Trigger flow thật vì chưa có flow ID chuẩn.
- Webhook inbound Botcake vì chưa có payload/auth chính thức.

### 3.2 Pancake POS Open API

| Endpoint | Trạng thái trong source | Đang dùng thật? | Mục đích |
| --- | --- | --- | --- |
| `GET /shops` | Đã code `PancakePosClient.listShops` | Có | Tự xác định shop thật |
| `GET /shops/{SHOP_ID}/warehouses` | Đã code `listWarehouses` | Có | Đọc kho, kho mặc định |
| `GET /shops/{SHOP_ID}/products/variations` | Đã code `listProductVariations` | Có | Đọc sản phẩm/variant/giá/tồn kho |
| `GET /shops/{SHOP_ID}/products/{PRODUCT_SKU}` | Đã code `getProduct` | Chưa dùng UI | Lấy chi tiết sản phẩm khi khách hỏi sâu |
| `POST /shops/{SHOP_ID}/orders` | Đã code `createDraftOrder` có safety gate | Chưa bật | Tạo đơn nháp sau khi xác minh status draft |

Kết quả live hiện tại:

- POS API pass.
- Shop: `Góc Pass Đồ MG`.
- Đọc được 2 kho.
- Đọc được 348 biến thể sản phẩm.
- UI hiển thị sản phẩm mẫu, size, màu, giá, tồn kho thật.

Chưa dùng nhưng có giá trị cao:

- `GET /shops/{SHOP_ID}/orders`: xem đơn, trạng thái đơn, báo cáo đơn.
- `GET /shops/{SHOP_ID}/orders/{ORDER_ID}`: chi tiết đơn.
- `GET /shops/{SHOP_ID}/customers`: khách hàng POS.
- `GET /shops/{SHOP_ID}/analytics/sale`: thống kê bán hàng.
- `GET /shops/{SHOP_ID}/inventory_analytics/*`: báo cáo tồn kho.
- `GET /shops/{SHOP_ID}/vouchers`, `promotion_advance`: ưu đãi/campaign nếu shop dùng.
- `GET /shops/{SHOP_ID}/users`: nhân viên.
- `PUT /shops/{SHOP_ID}` Webhook configuration: cần xác minh kỹ trước khi tự động cấu hình.

Không nên dùng trong giai đoạn đầu:

- Update inventory.
- Create/update product.
- Confirm/fulfill order.
- Shipment/export/transaction/debt operations.

Lý do: các API này có rủi ro vận hành cao, dễ ảnh hưởng kho/đơn/doanh thu nếu sai.

### 3.3 Pancake API

| Endpoint | Trạng thái trong source | Đang dùng thật? | Mục đích |
| --- | --- | --- | --- |
| `GET /pages` | Đã code `PancakeApiClient.listPages` | Chờ token thật | Tự list page bằng User Access Token |
| `POST /pages/{page_id}/generate_page_access_token` | Chỉ tài liệu hóa, chưa code action ghi | Chưa | Tạo Page Access Token, cần xác nhận trước khi dùng |
| `GET /pages/{page_id}/conversations` | Đã code `PancakeApiClient.listConversations` | Chờ Page Access Token thật | Unified Inbox |
| `GET /pages/{page_id}/conversations/{conversation_id}/messages` | Đã tài liệu hóa | Chưa | Lịch sử chat |
| `POST /pages/{page_id}/conversations/{conversation_id}/messages` | Đã tài liệu hóa | Chưa | Gửi tin qua Pancake API |
| `GET /pages/{page_id}/tags` | Đã code `PancakeApiClient.listTags` | Chờ Page Access Token thật | Tag Pancake |
| `POST /pages/{page_id}/conversations/{conversation_id}/tags` | Đã tài liệu hóa | Chưa | Gắn tag hội thoại |
| `POST /pages/{page_id}/conversations/{conversation_id}/assign` | Đã tài liệu hóa | Chưa | Assign sale |
| `GET /pages/{page_id}/page_customers` | Đã tài liệu hóa | Chưa | Customer 360 |
| Pancake Webhook `messaging` | Đã tài liệu hóa | Chưa | Event real-time cho chatbot |

Lý do chưa dùng: chưa có `PANCAKE_API_USER_ACCESS_TOKEN` hoặc `PANCAKE_API_PAGE_ACCESS_TOKEN`.

Đây là mảnh bắt buộc để UI của dự án hoạt động như một Unified Inbox thật thay vì chỉ xem readiness/live integration.

## 4. Có thể dùng full chức năng 3 app không?

| Nhóm chức năng | Có thể đưa vào dự án? | Điều kiện |
| --- | --- | --- |
| Inbox/conversations/messages | Có | Cần Pancake Page Access Token + webhook |
| Chatbot flow/dynamic reply | Có | Dùng Botcake `send_content`, `send_flow`, flow IDs thật |
| Tag/handoff | Có | Map tag Pancake + Botcake, xác minh body gắn tag |
| Sản phẩm/variant/giá/tồn kho | Có | Đang đọc được từ POS |
| Tạo đơn nháp | Có sau khi xác minh | Phải xác nhận status draft an toàn, không dùng status confirmed |
| Đơn hàng/report doanh thu | Có | Dùng POS orders/analytics |
| Khách cũ/CRM | Có một phần | Kết hợp Pancake page customers + POS customers/orders |
| Follow-up/remarketing | Có điều kiện | Phải tuân thủ chính sách từng kênh, ưu tiên Botcake Flow/Automation |
| Quản lý cấu hình sâu nội bộ của 3 app | Không chắc | Chỉ làm nếu API expose và quyền cho phép |
| Thao tác rủi ro kho/đơn/tiền | Không nên tự động giai đoạn đầu | Cần approval và audit log |

## 5. UI thật nên thiết kế như thế nào?

UI không nên là demo. UI hoàn chỉnh phải là một workspace vận hành thật gồm:

| Màn hình | Chức năng thật | API nền |
| --- | --- | --- |
| Command Center | KPI, API health, khách chờ, đơn nháp, lỗi webhook | Internal DB + Pancake/POS/Botcake |
| Unified Inbox | Chat thật, tag, lead score, AI/sale status | Pancake conversations/messages/webhook |
| AI Sales Agent | Tư vấn sản phẩm, trả lời, hỏi lại, handoff | LLM + POS + KB + Pancake/Botcake |
| Product Intelligence | Search sản phẩm, tồn kho, mẫu thay thế, hàng sắp hết | POS product variations/inventory |
| Customer 360 | Lịch sử chat, lịch sử mua, note, size preference | Pancake customers + POS orders |
| Handoff Center | Khách nóng, summary, assign sale, SLA | Pancake tag/assign + Botcake flow/tag |
| Follow-up Planner | Nhắc khách im lặng, chăm sóc khách cũ | Internal scheduler + Pancake/Botcake |
| Order Desk | Đơn nháp, chi tiết đơn, sale duyệt | POS orders |
| Analytics | Conversion, sản phẩm được hỏi, nguồn ads, sale performance | Pancake stats + POS analytics |
| Risk Center | Webhook fail, API timeout, AI low confidence, tồn kho lệch | Logs + metrics |

## 6. LLM nên tích hợp thế nào để "siêu thông minh" nhưng an toàn?

Không nên hiểu "train bằng chat" là cứ lấy toàn bộ chat khách để fine-tune ngay. Cách đúng và an toàn hơn:

### 6.1 Giai đoạn đầu: RAG + Memory + Rules

- LLM đọc prompt Chị Hương.
- LLM truy xuất Knowledge Base: size, chất liệu, chính sách, script objection.
- LLM truy xuất POS live: sản phẩm, variant, giá, tồn kho.
- LLM truy xuất conversation state: khách hỏi gì, đã tư vấn gì, đang thiếu gì.
- Safety Guardrails kiểm tra trước khi gửi.

Ưu điểm: cập nhật nhanh, ít rủi ro, không cần training lại model.

### 6.2 Giai đoạn sau: Conversation Learning

- Tự tổng hợp các câu hỏi thường gặp.
- Tự phát hiện gap: câu nào AI handoff nhiều, sản phẩm nào khách hỏi nhiều.
- Sale đánh dấu câu trả lời tốt/xấu.
- Tạo suggestion để cập nhật Knowledge Base.
- Chỉ fine-tune nếu đã có dữ liệu sạch, ẩn thông tin cá nhân và có mục tiêu rõ.

### 6.3 Agent workflow

LLM không được tự làm mọi thứ. Nên chia agent:

| Agent | Vai trò |
| --- | --- |
| Intent Agent | Phân loại ý định khách |
| Product Advisor | Gợi ý sản phẩm từ POS + KB |
| Order Readiness Agent | Kiểm tra đủ thông tin tạo đơn nháp |
| Handoff Agent | Tạo summary cho sale |
| Follow-up Agent | Chọn thời điểm/câu nhắc lại |
| QA Agent | Chấm rủi ro câu trả lời trước khi gửi |

## 7. Roadmap từ UI hiện tại đến sản phẩm hoàn chỉnh

### Phase 1 - Real Integration Dashboard

Trạng thái: đang làm.

- Đã đọc Botcake tags thật.
- Đã đọc POS shop/kho/sản phẩm thật.
- UI hiển thị dữ liệu thật, không mock.

### Phase 2 - Pancake API Connector + Unified Inbox

Cần `PANCAKE_API_USER_ACCESS_TOKEN` hoặc `PANCAKE_API_PAGE_ACCESS_TOKEN`.

- List pages.
- Sync conversations.
- Sync messages.
- Sync customers/tags.
- UI inbox thật.

### Phase 3 - Database + Webhook

- Lưu conversation state.
- Nhận Pancake Webhook `messaging`.
- Chống duplicate.
- Reconcile nếu webhook miss.

### Phase 4 - LLM Sales Agent

- RAG theo KB + POS.
- Intent/lead scoring.
- Safe reply.
- Handoff khi không chắc.

### Phase 5 - Handoff + Follow-up

- Tag/assign sale.
- Handoff queue thật.
- Follow-up khách im lặng.
- Segment khách cũ.

### Phase 6 - Draft Order + Analytics

- Tạo đơn nháp an toàn.
- Sale duyệt.
- Dashboard conversion, doanh thu, campaign.

## 8. Những thứ cần cung cấp để làm tiếp ngay

| Cần cung cấp | Bắt buộc? | Dùng để làm gì |
| --- | --- | --- |
| `PANCAKE_API_USER_ACCESS_TOKEN` | Rất nên có | Tự list pages, tạo page token |
| `PANCAKE_API_PAGE_ACCESS_TOKEN` | Có thể thay thế user token | Đọc inbox/messages/tags/customers |
| Domain HTTPS public | Bắt buộc cho webhook | Nhận message real-time |
| Webhook bật cho page | Bắt buộc cho chatbot live | Pancake gửi event |
| PSID/test customer nội bộ | Bắt buộc để gửi tin test | Test Botcake/Pancake outbound an toàn |
| Flow IDs Botcake | Cần cho automation | Handoff/follow-up/chốt đơn |
| Tag mapping chuẩn | Cần cho vận hành | Tag thống nhất Pancake/Botcake |
| Bảng size/chính sách thật | Cần cho LLM | Không bịa tư vấn |

## 9. Quyết định sản phẩm

Thiết kế sản phẩm hoàn chỉnh nên là:

```text
Pancake API = Inbox + customer timeline + webhook
Pancake POS = Product + inventory + order + revenue
Botcake = Chatbot flow + dynamic content + automation
LLM Orchestrator = Brain tư vấn/chấm điểm/handoff/follow-up
Dashboard = Nơi chủ shop/sale vận hành tất cả
```

Đây là hướng đủ thực tế để dùng dữ liệu thật, đủ mạnh để giảm thủ công, và đủ an toàn để không làm sai đơn/tồn kho/chính sách.
