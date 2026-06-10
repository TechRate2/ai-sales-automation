# Implementation Plan - AI Sales Automation System

## Mục tiêu tổng quát

Xây dựng hệ thống AI Chatbot trong hệ sinh thái **Pancake + Pancake POS + Botcake** với các tiêu chí:

- AI xử lý 75-85% tin nhắn hàng ngày.
- Tăng tỷ lệ chốt đơn so với sale thủ công.
- Giảm 50-70% nhân sự trực tin.
- Xử lý ổn định 1000-2000 tin nhắn/ngày.
- Giữ an toàn bằng mô hình **AI Chat + Tag + Tạo đơn nháp**.

---

## Giai đoạn 1: Nền Tảng & Kiến Thức (Tuần 1 - 3)

**Mục tiêu:** Xây dựng nền tảng vững chắc, AI có dữ liệu chính xác.

### Công việc chính

1. **Xây dựng Knowledge Base**
   - Tạo nguồn dữ liệu chứa toàn bộ thông tin sản phẩm từ Pancake POS.
   - Bao gồm: tên sản phẩm, mô tả, size, màu, chất liệu, giá, hình ảnh, hướng dẫn sử dụng.
   - Thêm script bán hàng và cách xử lý objection thường gặp.
   - Thêm bảng size chi tiết và cách tư vấn size cho nữ trung niên.

2. **Thiết lập hệ thống Tag**
   - Tạo các tag quan trọng và quy trình xử lý rõ ràng.
   - Thiết lập Automation Rule trong Botcake nếu tài liệu Botcake xác nhận cơ chế phù hợp.

3. **Kết nối Pancake POS**
   - Chuẩn bị khả năng lấy thông tin sản phẩm và tồn kho real-time.
   - Chưa tạo đơn thật ở giai đoạn đầu nếu chưa có tài liệu API và quy trình duyệt an toàn.

4. **Viết System Prompt**
   - Sử dụng prompt "Chị Hương" trong `docs/sales-prompt.md`.
   - Test và điều chỉnh prompt ban đầu.

### Kết quả mong đợi

- AI không bịa đặt thông tin sản phẩm.
- Có hệ thống Tag rõ ràng, dễ theo dõi.
- Giảm đáng kể các câu hỏi lặp lại.

---

## Giai đoạn 2: Xây dựng Luồng Hội thoại & AI Thông minh (Tuần 4 - 8)

**Mục tiêu:** AI không chỉ trả lời mà còn dẫn dắt khách đến quyết định mua một cách tự nhiên.

### Công việc chính

1. **Xây dựng Advanced Flows trong Botcake**
   - Flow chào hỏi và thu thập nhu cầu.
   - Flow tư vấn sản phẩm theo nhu cầu, size, ngân sách.
   - Flow xử lý objection thường gặp.
   - Flow xác nhận thông tin trước khi chuyển sale chốt đơn.

2. **Tích hợp dữ liệu Pancake POS vào Flow**
   - Cho phép AI gợi ý sản phẩm còn hàng.
   - Lấy thông tin chi tiết sản phẩm khi khách hỏi.

3. **Áp dụng và tối ưu System Prompt**
   - Sử dụng prompt "Chị Hương" làm nền tảng.
   - Thêm các ví dụ few-shot cụ thể sau khi có dữ liệu hội thoại thật.

4. **Xây dựng quy trình Handoff chuẩn**
   - Định nghĩa rõ khi nào AI phải gắn tag và chuyển cho sale.
   - Tạo mẫu tóm tắt thông tin khách gửi cho sale.

### Kết quả mong đợi

- AI có khả năng dẫn dắt hội thoại tốt hơn.
- Tăng tỷ lệ khách chuyển sang giai đoạn "Sẵn sàng chốt đơn".
- Sale giảm thời gian chat lặp lại.

---

## Giai đoạn 3: Tự động hóa Chốt Đơn & Giảm Nhân sự (Tuần 9 - 12)

**Mục tiêu:** Giảm mạnh khối lượng công việc của sale nhưng vẫn giữ sale duyệt ở bước an toàn.

### Công việc chính

1. **Cho AI tạo đơn nháp trong Pancake POS**
   - Khi khách xác nhận đầy đủ thông tin, AI tạo đơn nháp theo Pancake POS Open API.
   - Gắn tag "Đã tạo đơn nháp" và thông báo cho sale duyệt.

2. **Xây dựng hệ thống giám sát**
   - Theo dõi số lượng tin nhắn do AI xử lý.
   - Theo dõi tỷ lệ tag và tin nhắn chờ xử lý.
   - Cảnh báo khi có tin nhắn bị bỏ sót quá lâu bằng cơ chế Botcake/Pancake có sẵn hoặc cơ chế nội bộ được phê duyệt.

3. **Tối ưu liên tục**
   - Review định kỳ các cuộc hội thoại AI xử lý chưa tốt.
   - Cập nhật Knowledge Base và System Prompt.

### Kết quả mong đợi

- Sale chỉ cần kiểm tra và duyệt đơn thay vì chat từ đầu.
- Giảm rõ rệt số lượng sale cần trực tin.

---

## Giai đoạn 4: Scale & Tối ưu Nâng cao (Từ tháng 4 trở đi)

**Mục tiêu:** Nâng cao mức độ tự động hóa và đo lường hiệu quả sau khi giai đoạn 1-3 ổn định.

### Công việc chính

1. Mở rộng khả năng tự chốt đơn với các trường hợp đơn giản, chỉ sau khi quy trình tạo đơn nháp đã ổn định và được duyệt.
2. Chỉ xem xét tính năng hiểu ảnh khách gửi nếu tài liệu tham chiếu sau này xác nhận cách triển khai nằm trong giới hạn hệ Pancake ecosystem và luồng AI được phê duyệt.
3. Xây dựng báo cáo hiệu quả định kỳ: tỷ lệ chốt đơn, thời gian phản hồi, chi phí nhân sự.
4. Tiếp tục tối ưu prompt và Knowledge Base dựa trên dữ liệu thực tế.

---

## Các chỉ số đo lường thành công

| Chỉ số | Mục tiêu sau 3 tháng | Mục tiêu sau 6 tháng |
| --- | --- | --- |
| Tỷ lệ tin nhắn do AI xử lý | >= 70% | >= 80% |
| Tỷ lệ chốt đơn | Tăng 20-30% | Tăng 35-50% |
| Số sale trực tin | Giảm 40-50% | Giảm 60-70% |
| Thời gian phản hồi trung bình | < 2 phút | < 1 phút |
| Tỷ lệ tin nhắn bị bỏ sót | < 5% | < 2% |

---

## Rủi ro & Cách giảm thiểu

- **Rủi ro:** AI trả lời sai thông tin sản phẩm. Giảm bằng cách xây dựng Knowledge Base chặt chẽ và kiểm tra định kỳ.
- **Rủi ro:** Khách không hài lòng khi chat với AI. Giảm bằng cách có quy trình chuyển nhanh cho sale.
- **Rủi ro:** Bỏ sót tin nhắn khi volume cao. Giảm bằng hệ thống Tag, Automation và cảnh báo theo tài liệu Botcake/Pancake.

---

## Kết luận

Plan này được thiết kế theo hướng **an toàn - thực tế - có thể đo lường**, ưu tiên chất lượng tư vấn và tính ổn định trước khi tăng mức tự động hóa.

