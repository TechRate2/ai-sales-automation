# Botcake Capabilities

> Template này chỉ ghi nhận phạm vi đã được yêu cầu. Chưa thêm endpoint, payload hoặc hành vi cụ thể khi chưa có tài liệu Botcake Public API chính thức.

## Phạm vi được phép sử dụng

- Botcake Public API:
  - Webhook nhận sự kiện tin nhắn.
  - `send_content` để gửi nội dung phản hồi cho khách.
- Botcake Flow.
- Botcake Tag.
- Botcake Automation.

## Vai trò trong hệ thống

- Là lớp nhận và gửi tin nhắn giữa khách hàng và server AI.
- Là nơi quản lý tag phục vụ handoff cho sale.
- Là nơi triển khai các flow/automation được tài liệu Botcake cho phép.

## Những việc cần xác minh trước khi code

- Cấu trúc payload webhook.
- Cách xác thực webhook.
- Cách gọi `send_content`, giới hạn rate limit và lỗi thường gặp.
- Cách gắn tag qua API hoặc qua Flow/Automation.
- Cách nhận biết khách, hội thoại, fanpage/kênh và thread.
- Quy định retry, timeout và idempotency nếu Botcake có cung cấp.

## Nguyên tắc kỹ thuật

- Không giả định endpoint hoặc payload ngoài tài liệu.
- Không triển khai cơ chế tag/handoff nếu chưa xác nhận Botcake hỗ trợ cách gọi tương ứng.
- Khi API lỗi hoặc không chắc chắn, ưu tiên gắn tag "Cần sale hỗ trợ" bằng cơ chế an toàn đã xác nhận.
- Luôn log đủ thông tin để debug nhưng không ghi lộ token hoặc dữ liệu nhạy cảm.

