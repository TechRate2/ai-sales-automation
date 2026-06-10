# Handoff Protocol

## Khi nào AI phải chuyển cho Sale?

AI phải chuyển cho sale trong các trường hợp sau:

1. Khách nói rõ muốn mua hoặc cung cấp thông tin đặt hàng.
2. Khách hỏi vấn đề phức tạp, khiếu nại hoặc tỏ ra khó tính.
3. AI không chắc chắn về thông tin sản phẩm, giá, chính sách hoặc tồn kho.
4. Khách yêu cầu nói chuyện trực tiếp với người thật.
5. Khách gửi thông tin nhạy cảm hoặc tình huống cần xác nhận thủ công.

## Quy trình chuyển tiếp

1. AI thu thập thông tin đầy đủ nhất có thể mà không gây áp lực cho khách.
2. Gắn tag phù hợp:
   - "Sẵn sàng chốt đơn": khách đã có ý định mua và cung cấp gần đủ thông tin.
   - "Cần sale hỗ trợ": khách cần người thật, có khiếu nại, câu hỏi phức tạp hoặc AI không chắc chắn.
   - "Đã tạo đơn nháp": chỉ dùng ở giai đoạn tạo đơn nháp khi Pancake POS API đã được tích hợp đúng tài liệu.
3. Tạo tóm tắt ngắn gọn cuộc hội thoại và thông tin khách.
4. Thông báo cho sale bằng cơ chế có sẵn trong Botcake Flow, Tag hoặc Automation.

## Mẫu tóm tắt cho sale

```text
Tình trạng: [Sẵn sàng chốt đơn / Cần sale hỗ trợ / Đã tạo đơn nháp]
Nhu cầu khách: [Mặc đi đâu, phong cách, ngân sách]
Sản phẩm quan tâm: [Tên sản phẩm / mã sản phẩm nếu có]
Thông tin đã có: [Size, màu, số lượng, số điện thoại, địa chỉ, thanh toán]
Thông tin còn thiếu: [Các thông tin cần sale hỏi tiếp]
Lý do handoff: [Khách muốn mua / khiếu nại / AI không chắc / cần người thật]
Ghi chú hội thoại: [Tóm tắt ngắn gọn]
```

## Nguyên tắc khi handoff

- Không để khách cảm thấy bị bỏ rơi khi chuyển qua sale.
- Không hứa chắc về tồn kho, giá hoặc thời gian giao nếu chưa xác nhận từ Pancake POS.
- Không tự chốt đơn hoàn toàn trong giai đoạn đầu.
- Luôn ưu tiên sự rõ ràng để sale tiếp nhận nhanh và không bỏ sót tin nhắn.

