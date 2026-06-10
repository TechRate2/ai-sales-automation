# AI Sales Automation

Project khung cho hệ thống AI Chatbot bán hàng trong hệ sinh thái Pancake + Pancake POS + Botcake.

## Mục tiêu

- Xây dựng AI Chatbot tư vấn khách hàng nữ trung niên cho ngành quần áo.
- Xử lý ổn định 1000-2000 tin nhắn/ngày theo mô hình an toàn.
- Hỗ trợ sale bằng AI Chat + Tag + Handoff + tạo đơn nháp, không để AI tự chốt đơn hoàn toàn ở giai đoạn đầu.
- Ưu tiên hệ thống dễ bảo trì, dễ mở rộng, dễ đo lường.

## Giới hạn bắt buộc

Chỉ sử dụng các thành phần trong hệ Pancake ecosystem:

- Botcake Public API: Webhook và send_content.
- Pancake POS Open API: sản phẩm, tồn kho, tạo đơn.
- Botcake Flow, Tag và Automation.

Không đề xuất hoặc tích hợp ManyChat, Gorgias, Tidio hay tool bên thứ ba để thay thế luồng chính.

## Cấu trúc project

```text
ai-sales-automation/
├── docs/
│   ├── knowledge-base.md
│   ├── botcake-capabilities.md
│   ├── pancake-pos-api.md
│   ├── system-architecture.md
│   ├── handoff-protocol.md
│   ├── sales-prompt.md
│   └── implementation-plan.md
├── src/
│   ├── botcake/
│   ├── pos/
│   ├── ai/
│   └── utils/
├── prompts/
│   └── system-prompt.txt
└── README.md
```

## Trạng thái hiện tại

Đây là bước nền tảng: chỉ tạo tài liệu tham chiếu, prompt và cấu trúc thư mục. Chưa có endpoint, schema, package Node.js TypeScript hoặc logic gọi API thật.

Trước khi viết code tích hợp, cần đọc lại các tài liệu liên quan trong `docs/`, đặc biệt là:

- `docs/botcake-capabilities.md`
- `docs/pancake-pos-api.md`
- `docs/handoff-protocol.md`
- `docs/sales-prompt.md`

## Định hướng stack

Stack backend dự kiến cho giai đoạn code: Node.js TypeScript.

## Quy tắc cập nhật GitHub

- Mỗi lần cập nhật code, tài liệu hoặc nâng cấp tính năng đều phải commit và push song song lên GitHub.
- GitHub là nguồn đồng bộ để dev Claude Fable 5 có thể đánh giá, kiểm tra và review phiên bản mới nhất.
- Không giữ thay đổi quan trọng chỉ ở máy local nếu thay đổi đó cần người khác kiểm tra.
- Với thay đổi lớn, nên tạo branch riêng và mở Pull Request để review trước khi merge vào `main`.
