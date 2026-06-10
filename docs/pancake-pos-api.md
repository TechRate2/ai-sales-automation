# Pancake POS API

> Template này chưa chứa tài liệu API thật. Không được tự suy diễn endpoint, field, trạng thái đơn hàng hoặc payload khi chưa có tài liệu Pancake POS Open API chính thức.

## Phạm vi được phép sử dụng

- Đọc danh sách sản phẩm.
- Đọc biến thể sản phẩm: size, màu, mã hàng nếu có.
- Kiểm tra tồn kho.
- Tạo đơn hàng hoặc đơn nháp khi tài liệu API xác nhận cách làm.

## Vai trò trong hệ thống

- Là nguồn dữ liệu sự thật cho sản phẩm, giá và tồn kho.
- Là nơi tạo đơn nháp trong giai đoạn 3.
- Là cơ sở để AI tránh bịa thông tin khi tư vấn.

## Những việc cần xác minh trước khi code

- Base URL và cơ chế xác thực.
- Endpoint danh sách sản phẩm.
- Endpoint chi tiết sản phẩm và biến thể.
- Endpoint tồn kho.
- Endpoint tạo đơn hoặc đơn nháp.
- Field bắt buộc khi tạo đơn: khách hàng, số điện thoại, địa chỉ, sản phẩm, biến thể, số lượng, thanh toán.
- Cách phân biệt đơn nháp, đơn chờ duyệt và đơn đã xác nhận.
- Rate limit, timeout, retry và mã lỗi.

## Nguyên tắc kỹ thuật

- Không tư vấn sản phẩm là còn hàng nếu chưa kiểm tra được tồn kho hoặc chưa có dữ liệu chính thức.
- Không tạo đơn khi thiếu thông tin bắt buộc.
- Không tự xác nhận đơn hoàn toàn ở giai đoạn đầu.
- Khi API không chắc chắn hoặc lỗi, chuyển sale bằng tag "Cần sale hỗ trợ".

