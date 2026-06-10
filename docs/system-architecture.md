# System Architecture - AI Sales Automation

## Mô hình tổng quát

- Pancake API: Lớp page, hội thoại, message, khách hàng, tag, nhân viên và webhook.
- Botcake: Lớp flow/chatbot automation, dynamic content, quick replies và tag/action Botcake.
- Pancake POS: Nguồn dữ liệu sản phẩm, tồn kho, khách mua và tạo đơn hàng.
- AI Layer: Xử lý logic tư vấn, đọc Knowledge Base và ra quyết định hội thoại.
- Handoff Layer: Chuyển tiếp cho sale khi khách cần người thật hoặc khi AI không đủ chắc chắn.

## Flow chính

1. Khách nhắn tin/comment vào kênh đang kết nối với Pancake/Botcake.
2. Pancake Webhook `messaging` gửi event về server; Botcake inbound webhook chỉ dùng khi đã xác minh schema chính thức.
3. Server normalize event, chống duplicate và lưu Conversation State.
4. Server đọc thêm hội thoại/khách/tag từ Pancake API nếu cần.
5. Server kiểm tra Knowledge Base và dữ liệu Pancake POS nếu khách hỏi sản phẩm/tồn kho/đặt hàng.
6. AI tạo câu trả lời tư vấn theo prompt "Chị Hương".
7. Safety Guardrails quyết định: trả lời, hỏi lại, tạo handoff hoặc tạo đơn nháp nếu đủ điều kiện.
8. Server gửi phản hồi qua Pancake Messages API hoặc Botcake Public API `send_content`/`send_flow` theo outbound policy.
9. Nếu cần handoff, hệ thống gắn tag phù hợp, assign sale nếu đã cấu hình và tạo tóm tắt cho sale xử lý.

## Nguyên tắc an toàn

- AI không tự bịa sản phẩm, giá, tồn kho, chính sách hoặc cam kết ngoài Knowledge Base và Pancake POS.
- Giai đoạn đầu ưu tiên tư vấn, thu thập thông tin và handoff thay vì tự chốt đơn.
- Tạo đơn nháp chỉ thực hiện khi đã có đủ thông tin và sale vẫn là người kiểm tra/duyệt.
- Mọi quyết định kỹ thuật phải nằm trong giới hạn Botcake Public API, Pancake POS Open API, Botcake Flow, Tag và Automation.

## Thành phần chính

### Botcake Layer

- Gửi tin nhắn phản hồi dạng dynamic block bằng `send_content`.
- Kích hoạt flow bằng `send_flow`.
- Gắn tag hoặc set custom field bằng Dynamic Block actions khi đã test.
- Điều phối Botcake Flow/Automation cho handoff/follow-up.

### Pancake API Layer

- List pages bằng User Access Token.
- Generate hoặc nhập Page Access Token.
- Đồng bộ conversations/messages/customers/tags/users.
- Nhận Pancake Webhook `messaging` để xử lý real-time.
- Gắn tag/assign hội thoại nếu đã xác minh body request.
- Là nguồn chính cho Unified Inbox trong dashboard dự án.

### Pancake POS Layer

- Đọc danh sách sản phẩm và biến thể.
- Kiểm tra tồn kho trước khi tư vấn sản phẩm còn hàng.
- Tạo đơn nháp trong giai đoạn sau, khi đã có đủ thông tin khách hàng.

### AI Layer

- Sử dụng `docs/sales-prompt.md` và `prompts/system-prompt.txt` làm chuẩn giọng điệu.
- Kết hợp Knowledge Base với dữ liệu POS để tư vấn.
- Trả lời ngắn gọn, rõ ràng, phù hợp khách nữ trung niên.

### Handoff Layer

- Phát hiện các tình huống cần sale can thiệp.
- Gắn tag như "Sẵn sàng chốt đơn", "Cần sale hỗ trợ" hoặc "Đã tạo đơn nháp".
- Tạo tóm tắt hội thoại gồm nhu cầu, sản phẩm quan tâm, size/màu/số lượng và thông tin còn thiếu.
