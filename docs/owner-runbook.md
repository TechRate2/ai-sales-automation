# Owner Runbook - Hướng dẫn vận hành cho chủ dự án

Tài liệu này dành cho người không rành code nhưng cần kiểm soát dự án AI Sales Automation khi chạy thật.

## 1. Nguyên tắc vận hành bắt buộc

- Không nhập API key/token vào GitHub, tài liệu, ảnh chụp màn hình hoặc tin nhắn công khai.
- Chỉ nhập secret vào file `.env` trên máy/server chạy thật.
- Không bật tạo đơn nháp nếu chưa xác minh trạng thái đơn nháp an toàn trong Pancake POS.
- Nếu `npm run doctor` báo `[FAIL]`, không deploy production.
- Nếu `npm run doctor` báo `[WARN]`, cần đọc kỹ cảnh báo. Một số cảnh báo là bình thường ở local, nhưng không được bỏ qua khi chạy thật.
- AI không được tự chốt đơn hoàn tất trong giai đoạn này.
- Khi dữ liệu sản phẩm, giá, tồn kho hoặc chính sách chưa chắc chắn, hệ thống phải chuyển sale.

## 2. Các file người vận hành cần biết

| File | Dùng để làm gì |
| --- | --- |
| `.env.example` | Mẫu cấu hình, không chứa secret thật |
| `.env` | File cấu hình thật trên máy/server, không commit GitHub |
| `README.md` | Tổng quan project và lệnh kiểm tra |
| `docs/knowledge-base.md` | Dữ liệu sản phẩm/chính sách đã được xác nhận |
| `docs/botcake-capabilities.md` | Quy tắc tích hợp Botcake |
| `docs/pancake-api.md` | Quy tắc tích hợp Pancake API cho page, hội thoại, message, webhook |
| `docs/pancake-pos-api.md` | Quy tắc tích hợp Pancake POS |
| `docs/handoff-protocol.md` | Quy tắc chuyển sale |
| `docs/unified-ai-sales-hub.md` | Thiết kế sản phẩm hoàn chỉnh gom Pancake/POS/Botcake |
| `docs/automation-workflow-blueprint.md` | Workflow tự động, lead scoring, follow-up, dashboard |
| `prompts/system-prompt.txt` | Prompt chính cho AI Chị Hương |
| `web/` | Dashboard nội bộ cho người vận hành |

## 3. Thiết lập lần đầu

Chạy các lệnh trong thư mục project:

```bash
npm install
```

Tạo file `.env` từ file mẫu:

```bash
copy .env.example .env
```

Điền các giá trị thật vào `.env`:

```env
BOTCAKE_API_TOKEN=
PANCAKE_POS_API_KEY=
PANCAKE_POS_SHOP_ID=
```

Ghi chú cấu hình:

- `BOTCAKE_PAGE_ID` có thể để trống nếu `BOTCAKE_API_TOKEN` là page token dạng JWT có field `id`. Hệ thống sẽ tự suy ra Page ID và `doctor` sẽ báo rõ.
- Khi chạy production lâu dài, nên nhập `BOTCAKE_PAGE_ID` thủ công để khóa đúng page/bot đang vận hành.
- `PANCAKE_POS_SHOP_ID` có thể lấy bằng `GET /shops` sau khi đã có `PANCAKE_POS_API_KEY`.
- `PANCAKE_POS_DEFAULT_WAREHOUSE_ID` có thể lấy bằng `GET /shops/{SHOP_ID}/warehouses`.
- Nếu muốn Unified Inbox trong dự án, cần thêm Pancake API token: `PANCAKE_API_USER_ACCESS_TOKEN` để list pages hoặc `PANCAKE_API_PAGE_ACCESS_TOKEN` để gọi conversations/messages/tags.

Giữ các giá trị này ở trạng thái an toàn trong Phase 1:

```env
ENABLE_POS_DRAFT_ORDER=false
PANCAKE_POS_SAFE_DRAFT_STATUSES=
```

## 4. Lệnh kiểm tra trước khi chạy thật

Chạy:

```bash
npm run doctor
```

Ý nghĩa kết quả:

| Trạng thái | Ý nghĩa | Hành động |
| --- | --- | --- |
| `[PASS]` | Mục kiểm tra đạt | Có thể tiếp tục |
| `[WARN]` | Có cảnh báo cần chú ý | Đọc kỹ, chỉ bỏ qua nếu biết chắc lý do |
| `[FAIL]` | Lỗi chặn production | Không deploy, phải sửa trước |

Chạy kiểm tra code tổng hợp:

```bash
npm run check
```

Lệnh này bao gồm:

- TypeScript strict typecheck.
- Build source.
- Doctor kiểm tra cấu hình, prompt và khóa an toàn.

Mở dashboard nội bộ:

```bash
npm run dev
```

Sau đó mở:

```text
http://localhost:3000
```

## 5. Khi nào được bật tạo đơn nháp

Chỉ bật khi đã có đủ các điều kiện sau:

- Đã test Pancake POS với shop thật hoặc sandbox.
- Đã xác minh status nào là đơn nháp an toàn: `0` hay `17`.
- Đã xác nhận status `1` là đơn đã xác nhận và tuyệt đối không dùng cho draft.
- Sale biết cách nhận tag `Đã tạo đơn nháp` và duyệt đơn.
- Có quy trình kiểm tra đơn nháp trước khi xác nhận.

Sau khi đủ điều kiện, cấu hình mẫu:

```env
ENABLE_POS_DRAFT_ORDER=true
PANCAKE_POS_SAFE_DRAFT_STATUSES=17
```

Nếu chưa chắc, giữ:

```env
ENABLE_POS_DRAFT_ORDER=false
```

## 6. Quy trình cập nhật code an toàn

Mỗi lần cập nhật:

1. Chạy `npm run check`.
2. Chạy `npm run doctor`.
3. Kiểm tra không có secret trong code.
4. Commit thay đổi rõ ràng.
5. Push lên GitHub để dev khác review.

## 7. Những việc chưa được làm ở Phase 1

- Chưa bật webhook public production.
- Chưa có Pancake API connector cho Unified Inbox thật.
- Chưa gửi tin nhắn thật cho khách nếu chưa có Botcake credentials.
- Chưa đọc dữ liệu POS thật nếu chưa có Pancake POS credentials.
- Chưa tạo đơn nháp thật.
- Đã có dashboard readiness nội bộ; chưa có dữ liệu hội thoại live vì chưa bật webhook/database.
- Chưa có automation remarketing/follow-up thật.

## 8. Quy tắc khi có lỗi trong lúc chạy thật

- Nếu Botcake lỗi: không spam retry vô hạn, log lỗi và chuyển sale kiểm tra thủ công.
- Nếu Pancake POS lỗi: không nói chắc giá/tồn kho, chuyển sale.
- Nếu AI không hiểu ý khách: hỏi lại ngắn gọn hoặc chuyển sale.
- Nếu khách phàn nàn, yêu cầu người thật, hoặc gửi thông tin nhạy cảm: chuyển sale ngay.

## 9. Checklist trước production

- [ ] `.env` đã có Botcake credentials thật.
- [ ] `.env` đã có Pancake POS credentials thật.
- [ ] Botcake Page ID được nhập thủ công hoặc `doctor` xác nhận đã suy ra từ token.
- [ ] `npm run doctor` không có `[FAIL]`.
- [ ] `npm run check` pass.
- [ ] Repo không có file code test/mock/demo trong source production.
- [ ] Knowledge Base đã có sản phẩm, size, chính sách thật.
- [ ] Sale đã hiểu các tag handoff.
- [ ] Đã test luồng đọc sản phẩm/tồn kho với dữ liệu thật.
- [ ] Đã test một hội thoại end-to-end với khách nội bộ.
- [ ] Chưa bật tạo đơn nháp nếu chưa xác minh POS draft status.

## 10. Kết luận

Nguyên tắc vận hành là: **đúng dữ liệu, an toàn trước, sale duyệt cuối**.

Nếu có bất kỳ điểm nào chưa chắc, hệ thống phải dừng ở tư vấn/handoff thay vì tự xử lý sâu.
