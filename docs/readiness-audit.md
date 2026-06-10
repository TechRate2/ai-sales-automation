# Readiness Audit - Trạng thái hiện tại

Ngày audit: 2026-06-10

## 1. Kết luận ngắn

Source hiện tại **đúng hướng và tuân thủ nguyên tắc an toàn cốt lõi**. Sau kiểm tra ngày 2026-06-10, credentials local cho Botcake và Pancake POS đã gọi được API thật, nhưng **chưa thể chạy production thật cho khách hàng cuối** vì còn thiếu webhook payload thật, database/state, dữ liệu Knowledge Base đầy đủ và quy trình vận hành thật của shop.

Mức sẵn sàng hiện tại:

| Hạng mục | Mức đạt | Lý do |
| --- | ---: | --- |
| Nền backend TypeScript strict | 65% | Đã có config, logger, HTTP client, adapters, guardrails, doctor |
| Tuân thủ tài liệu/an toàn | 70% | Không tự chốt đơn, không hardcode secret, draft order tắt mặc định |
| Botcake live integration | 45% | Token/Page ID local đã đọc được tag thật; còn thiếu webhook payload thật, tag/flow IDs chuẩn hóa và test gửi tin bằng PSID nội bộ |
| Pancake POS live integration | 55% | API key local đã đọc được shop/kho/sản phẩm/tồn kho thật; còn thiếu xác minh draft status và luồng tạo đơn nháp an toàn |
| AI tư vấn với dữ liệu thật | 20% | Có prompt/rule, nhưng Knowledge Base chưa có sản phẩm/chính sách thật |
| Vận hành cho người không rành code | 58% | Có doctor/runbook và dashboard readiness nội bộ; chưa có dữ liệu hội thoại live |
| Sẵn sàng production tổng thể | 45% | Đã có kết nối API thật ở local; còn thiếu webhook public, database, Knowledge Base và monitoring production |

## 2. Những phần đã đúng theo yêu cầu

- Chỉ dùng định hướng Pancake ecosystem: Botcake, Pancake POS, Botcake Flow/Tag/Automation.
- Không tích hợp hoặc thay thế bằng ManyChat/Gorgias/Tidio/tool bên thứ ba.
- TypeScript strict đang build được.
- Secret/API key chỉ đi qua `.env`, không hardcode trong source.
- Logger có cơ chế redaction key nhạy cảm.
- HTTP client có timeout và retry.
- Draft order bị khóa mặc định bằng `ENABLE_POS_DRAFT_ORDER=false`.
- Status `1` bị chặn vì là trạng thái đơn đã xác nhận, không dùng làm draft.
- POS mapper không tự tạo `product_id`/`variation_id` giả. Nếu thiếu field thật, mapper trả lỗi.
- Doctor không in secret và không tự gọi API tạo đơn.
- Repo production hiện không chứa thư mục/file code test.

## 3. Những phần chưa đủ để chạy thật

### Botcake

- Đã có `BOTCAKE_API_TOKEN` local và gọi được API tag thật.
- `BOTCAKE_PAGE_ID` có thể nhập thủ công hoặc suy ra từ token JWT nếu có field `id`.
- Chưa có webhook payload thật từ Botcake để map chính xác 100%.
- Chưa xác minh cơ chế webhook auth: signature header, token, secret URL hay IP allowlist.
- Đã đọc được danh sách tag thật bước đầu; cần chuẩn hóa tag ID dùng cho dự án.
- Chưa có flow ID thật cho handoff/follow-up.

### Pancake POS

- Đã có `PANCAKE_POS_API_KEY` local và gọi được `GET /shops`.
- Đã xác định được `PANCAKE_POS_SHOP_ID` và warehouse ID local.
- Đã query được sản phẩm/biến thể/tồn kho thật từ shop.
- Chưa xác minh status nào là draft an toàn: `0` hay `17`.
- Chưa xác minh payload tạo đơn nháp chính xác với shop thật.

### Knowledge Base

- `docs/knowledge-base.md` vẫn là template, chưa có sản phẩm thật.
- Chưa có bảng size thật.
- Chưa có chính sách đổi trả/vận chuyển/thanh toán thật.
- Chưa có script bán hàng thật theo sản phẩm, nhóm khách và objection thực tế.

### Hệ thống chạy thật

- Chưa có public webhook server.
- Chưa có database lưu conversation state/idempotency.
- Đã có dashboard readiness nội bộ; chưa có dữ liệu hội thoại live vì chưa có webhook/database.
- Chưa có monitoring/cảnh báo bỏ sót khách.
- Chưa có lịch follow-up/remarketing theo chính sách từng kênh.

## 4. Dữ liệu thật cần chủ shop cung cấp

### 4.1 Botcake

| Cần cung cấp | Cách dùng |
| --- | --- |
| `BOTCAKE_PAGE_ID` | Gửi tin nhắn/tag/flow đúng page |
| `BOTCAKE_API_TOKEN` | Gọi Botcake Public API |
| Một `psid` nội bộ để kiểm tra gửi tin | Kiểm tra `send_content` không ảnh hưởng khách thật |
| Webhook sample thật từ Botcake | Viết parser chính xác, không đoán field |
| Cách Botcake xác thực webhook | Chặn request giả |
| Danh sách tag thật + tag ID | Gắn tag chính xác |
| Flow IDs cho handoff/follow-up | Kích hoạt Flow/Automation đúng |
| Channel đang dùng: Facebook/Zalo/Instagram/WhatsApp | Áp dụng chính sách gửi tin đúng kênh |

### 4.2 Pancake POS

| Cần cung cấp | Cách dùng |
| --- | --- |
| `PANCAKE_POS_API_KEY` | Đọc sản phẩm/tồn kho/đơn |
| `PANCAKE_POS_SHOP_ID` | Xác định shop |
| Warehouse IDs | Kiểm tra tồn kho đúng kho |
| Page IDs liên kết POS nếu có | Tạo đơn đúng nguồn |
| 10-20 sản phẩm thật đại diện | Xác minh mapper và tư vấn |
| Danh sách biến thể thật: size, màu, SKU, giá | Tư vấn và kiểm tồn chính xác |
| Xác nhận status draft an toàn | Bật tạo đơn nháp sau khi đủ điều kiện |
| Quy trình sale duyệt đơn | Không tự chốt đơn |

### 4.3 Knowledge Base vận hành

| Cần cung cấp | Cách dùng |
| --- | --- |
| Bảng size chính thức | Tư vấn size đúng |
| Chính sách đổi trả | Trả lời khách hoặc handoff khi chưa chắc |
| Chính sách vận chuyển/phí ship | Tư vấn trước khi tạo đơn |
| Phương thức thanh toán | Thu thập thông tin đặt hàng |
| Sản phẩm bán chạy/mẫu ưu tiên | Gợi ý sản phẩm tốt hơn |
| Objection thường gặp | Xử lý từ chối tự nhiên |
| Giọng điệu thương hiệu | Làm prompt sát shop hơn |

### 4.4 Quy trình sale

| Cần cung cấp | Cách dùng |
| --- | --- |
| Sale xem tag ở đâu | Handoff không bị bỏ sót |
| SLA phản hồi khách nóng | Cảnh báo quá hạn |
| Khung giờ có sale trực | AI biết khi nào cần trấn an khách |
| Quy tắc follow-up | Không spam, đúng chính sách kênh |
| Nhóm khách cũ/khách mua lại | Remarketing sau này |

### 4.5 Hạ tầng chạy thật

| Cần cung cấp | Cách dùng |
| --- | --- |
| Server/VPS/cloud muốn dùng | Deploy backend |
| Domain/subdomain webhook HTTPS | Botcake gọi webhook |
| Quyền cấu hình DNS/SSL | Chạy webhook an toàn |
| Database được phép dùng | Lưu state/idempotency/log |
| Yêu cầu backup/log retention | Vận hành dài hạn |

## 5. Nguyên tắc xử lý dữ liệu thật

- Không commit `.env` lên GitHub.
- Không paste API token vào file docs.
- Nếu cần nhập secret, nhập trực tiếp vào `.env` trên máy/server hoặc kênh bảo mật.
- Mọi dữ liệu sản phẩm/giá/tồn kho phải đến từ Pancake POS hoặc Knowledge Base đã xác nhận.
- Nếu dữ liệu thiếu hoặc API lỗi, hệ thống phải handoff, không đoán.

## 6. Kết luận

Source hiện đạt mức **nền móng kỹ thuật an toàn**, chưa đạt mức **sản phẩm chạy thật hoàn chỉnh**.

Để nâng từ 35% lên khoảng 60-70%, bước tiếp theo cần:

1. Capture webhook Botcake thật.
2. Chuẩn hóa tag/flow IDs cho handoff/follow-up.
3. Điền Knowledge Base thật.
4. Xây webhook server + state store.
5. Xác minh draft order status/payload bằng dữ liệu shop thật.

Để đạt 90%+, cần thêm dashboard vận hành, monitoring, follow-up engine, quy trình sale thật và kiểm tra end-to-end với khách nội bộ trước khi mở cho khách quảng cáo.
