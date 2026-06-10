# UI And Connection Research

Ngày cập nhật: 2026-06-10

## 1. Nguồn cảm hứng UI quốc tế

UI dashboard nội bộ lấy cảm hứng từ các sản phẩm thương mại quốc tế, nhưng **không tích hợp hoặc phụ thuộc** vào các công cụ này.

| Thương hiệu | Điểm học hỏi | Áp dụng vào dự án |
| --- | --- | --- |
| [Gorgias](https://www.gorgias.com/) | AI + helpdesk cho ecommerce, inbox hợp nhất, handoff có ngữ cảnh, revenue/support reporting | Dashboard phải tập trung vào khách cần sale, handoff, readiness và hiệu quả bán hàng |
| [Intercom Fin](https://www.intercom.com/fin) | AI customer service agent, triage và escalation rõ ràng | UI phải làm rõ khi nào AI xử lý, khi nào chuyển sale |
| [Zendesk AI](https://www.zendesk.com/ai/) | AI support platform, quản trị workflow và kiểm soát vận hành | UI cần trạng thái hệ thống, cảnh báo cấu hình, hàng chờ xử lý |
| [Shopify Admin](https://admin.shopify.com/) | Admin thương mại điện tử tối giản, rõ số liệu, dễ vận hành | UI dùng layout admin, KPI, panels, checklist, trạng thái kết nối |

## 2. Nguyên tắc thiết kế đã chọn

- Không làm landing page; màn hình đầu tiên là dashboard vận hành.
- Không hiển thị dữ liệu khách giả.
- Khi chưa có webhook/database thật, UI hiển thị empty state rõ ràng.
- Màu sắc restrained, chuyên nghiệp, không dùng giao diện một màu quá mạnh.
- Tập trung vào tác vụ hằng ngày: trạng thái kết nối, handoff, tồn kho, đơn nháp, Knowledge Base.
- Người không rành code vẫn phải hiểu bước tiếp theo cần làm gì.

## 3. Botcake - thông tin cần lấy

Nguồn chính thức:

- [Botcake API References](https://docs.pancake.biz/botcake/st-f7/st-p2?lang=vi)
- [Botcake Dynamic Block Docs](https://docs.pancake.biz/botcake/st-f7/st-p1?lang=vi)

Đã xác minh:

- Botcake docs có mục Developer gồm Dynamic Block Docs, API References và Handover Protocol.
- Public API dùng header `access-token`.
- Endpoint cần dùng trong dự án:
  - `POST /pages/{page_id}/flows/send_content`
  - `POST /pages/{page_id}/flows/send_flow`
  - `GET /pages/{page_id}/get_list_tag`
- Dynamic Block docs có `version`, `v2`, `messages`, `quick_replies`, `actions`, `add_tag`.

Thông tin cần lấy từ tài khoản Botcake thật:

| Thông tin | Lý do |
| --- | --- |
| `BOTCAKE_PAGE_ID` | Gọi API đúng page/bot |
| `BOTCAKE_API_TOKEN` | Auth bằng header `access-token` |
| `psid` nội bộ | Gửi thử tin nhắn an toàn |
| Webhook sample thật | Parser webhook chính xác |
| Cơ chế webhook auth | Chặn request giả |
| Tag ID thật | Gắn tag chính xác |
| Flow ID thật | Trigger handoff/follow-up |

Điểm cần xác minh trực tiếp trong Botcake admin:

- Vị trí cụ thể để lấy API token trong giao diện hiện tại.
- Webhook inbound cấu hình ở đâu và payload chính thức ra sao.
- `actions.add_tag` có hoạt động đồng nhất trên tất cả kênh đang dùng không.

## 4. Pancake POS - thông tin cần lấy

Nguồn chính thức:

- [Pancake POS Open API](https://api-docs.pancake.vn/)
- OpenAPI JSON tại `https://api-docs.pancake.vn/openapi.json`

Đã xác minh từ OpenAPI:

- Server: `https://pos.pages.fm/api/v1`
- Auth: `api_key` dạng query.
- Endpoint cần dùng:
  - `GET /shops`
  - `GET /shops/{SHOP_ID}/warehouses`
  - `GET /shops/{SHOP_ID}/products/variations`
  - `GET /shops/{SHOP_ID}/products/{PRODUCT_SKU}`
  - `POST /shops/{SHOP_ID}/orders`

Cách lấy thông tin:

| Thông tin | Cách lấy |
| --- | --- |
| `PANCAKE_POS_API_KEY` | Cấu hình → Nâng cao → Kết nối bên thứ 3 → Webhook/API → API KEY |
| `PANCAKE_POS_SHOP_ID` | Gọi `GET /shops` sau khi có API key |
| `PANCAKE_POS_DEFAULT_WAREHOUSE_ID` | Gọi `GET /shops/{SHOP_ID}/warehouses` |
| Product/variant IDs | Gọi `GET /shops/{SHOP_ID}/products/variations` |
| Draft status an toàn | Cần xác minh bằng shop thật trước khi bật tạo đơn |

## 5. UI đã code trong project

Đường dẫn source:

- `src/server.ts`: backend UI server và `/api/readiness`.
- `web/index.html`: dashboard structure.
- `web/styles.css`: giao diện responsive.
- `web/app.js`: đọc readiness API và render trạng thái thật.

Chạy local:

```bash
npm run dev
```

Mở:

```text
http://localhost:3000
```

Nếu port `3000` đang bận:

```bash
set APP_PORT=3100
npm run dev
```

Mở:

```text
http://localhost:3100
```

## 6. Trạng thái hiện tại của UI

- Có dashboard nội bộ đẹp, chuyên nghiệp, dễ nhìn.
- Có readiness từ backend thật.
- Có trạng thái kết nối Botcake/Pancake POS/Draft Order.
- Có handoff empty state an toàn.
- Có checklist Knowledge Base.
- Có hướng dẫn lấy API/token/tag/flow/shop/warehouse.

Chưa có:

- Inbox hội thoại live.
- Danh sách khách thật.
- Database lưu state.
- Biểu đồ hiệu suất thật.
- Cấu hình tag/flow tự động từ UI.

Các phần này cần credentials thật, webhook thật và database trước khi triển khai tiếp.
