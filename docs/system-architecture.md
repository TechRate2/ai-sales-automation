# System Architecture - AI Sales Automation

## Mô hình tổng quát

- Botcake: Lớp nhận và gửi tin nhắn (Messaging Layer).
- Pancake POS: Nguồn dữ liệu sản phẩm, tồn kho và tạo đơn hàng.
- AI Layer: Xử lý logic tư vấn, đọc Knowledge Base và ra quyết định hội thoại.
- Handoff Layer: Chuyển tiếp cho sale khi khách cần người thật hoặc khi AI không đủ chắc chắn.

## Flow chính

1. Khách nhắn tin vào kênh đang kết nối với Botcake.
2. Botcake gửi sự kiện về server qua Webhook.
3. Server kiểm tra ngữ cảnh hội thoại, Knowledge Base và dữ liệu Pancake POS nếu cần.
4. AI tạo câu trả lời tư vấn theo prompt "Chị Hương".
5. Server gửi phản hồi cho khách qua Botcake Public API `send_content`.
6. Nếu cần handoff, hệ thống gắn tag phù hợp và tạo tóm tắt cho sale xử lý.

## Nguyên tắc an toàn

- AI không tự bịa sản phẩm, giá, tồn kho, chính sách hoặc cam kết ngoài Knowledge Base và Pancake POS.
- Giai đoạn đầu ưu tiên tư vấn, thu thập thông tin và handoff thay vì tự chốt đơn.
- Tạo đơn nháp chỉ thực hiện khi đã có đủ thông tin và sale vẫn là người kiểm tra/duyệt.
- Mọi quyết định kỹ thuật phải nằm trong giới hạn Botcake Public API, Pancake POS Open API, Botcake Flow, Tag và Automation.

## Thành phần chính

### Botcake Layer

- Nhận webhook tin nhắn từ Botcake.
- Gửi tin nhắn phản hồi bằng `send_content`.
- Gắn tag hoặc kích hoạt luồng Automation khi tài liệu Botcake xác nhận cách làm cụ thể.

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

