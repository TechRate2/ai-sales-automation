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
│   ├── technical-specification.md
│   ├── ui-and-connection-research.md
│   └── implementation-plan.md
├── src/
│   ├── botcake/
│   ├── pos/
│   ├── ai/
│   └── utils/
├── prompts/
│   └── system-prompt.txt
├── web/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Trạng thái hiện tại

Đây là giai đoạn nền tảng Phase 1:

- Đã có project Node.js TypeScript strict.
- Đã có `.env.example` để cấu hình Botcake/Pancake POS mà không hardcode secret.
- Đã có contracts, logger redaction, HTTP client timeout/retry, Botcake/Pancake POS adapter khung, AI handoff rules và doctor kiểm tra vận hành.
- Đã có dashboard UI nội bộ để xem readiness, kết nối Botcake/POS, handoff queue trống an toàn và hướng dẫn lấy thông tin API.
- Repo production hiện không chứa thư mục/file code test.
- Chưa có public API server/webhook endpoint production.
- Chưa bật tạo đơn nháp production. `ENABLE_POS_DRAFT_ORDER=false` theo mặc định cho tới khi xác minh trạng thái draft an toàn trong Pancake POS.
- Chưa có dữ liệu sản phẩm/chính sách thật trong Knowledge Base.

Trước khi viết code tích hợp, cần đọc lại các tài liệu liên quan trong `docs/`, đặc biệt là:

- `docs/botcake-capabilities.md`
- `docs/pancake-pos-api.md`
- `docs/technical-specification.md`
- `docs/handoff-protocol.md`
- `docs/sales-prompt.md`

## Định hướng stack

Stack backend hiện tại: Node.js TypeScript strict.

Lệnh kiểm tra:

```bash
npm install
npm run doctor
npm run check
npm run typecheck
npm run dev
```

Trong đó:

- `npm run doctor`: kiểm tra cấu hình, prompt và khóa an toàn theo cách dễ đọc cho người vận hành.
- `npm run check`: chạy typecheck, build và doctor trước khi commit/deploy.
- `npm run dev`: mở backend UI server tại `http://localhost:3000`.
- Nếu `doctor` báo `[FAIL]`, không deploy production.

Tài liệu vận hành cho chủ dự án: `docs/owner-runbook.md`.

## Quy tắc cập nhật GitHub

- Mỗi lần cập nhật code, tài liệu hoặc nâng cấp tính năng đều phải commit và push song song lên GitHub.
- GitHub là nguồn đồng bộ để dev Claude Fable 5 có thể đánh giá, kiểm tra và review phiên bản mới nhất.
- Không giữ thay đổi quan trọng chỉ ở máy local nếu thay đổi đó cần người khác kiểm tra.
- Với thay đổi lớn, nên tạo branch riêng và mở Pull Request để review trước khi merge vào `main`.
