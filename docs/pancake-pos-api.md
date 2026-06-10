# Pancake POS Open API - Technical Integration Guide

## 1. Mục tiêu tài liệu

Tài liệu này mô tả cách backend AI Sales Automation tích hợp với Pancake POS Open API để:

- Đọc thông tin sản phẩm và biến thể.
- Kiểm tra tồn kho theo sản phẩm/biến thể/kho.
- Chuẩn bị tạo đơn nháp an toàn để sale duyệt.
- Không cho AI tự động xác nhận hoặc chốt đơn hoàn tất.

Nguồn chính thức đã kiểm tra:

- Pancake POS Open API: `https://api-docs.pancake.vn`
- OpenAPI JSON: `https://api-docs.pancake.vn/openapi.json`

Nếu thông tin chưa chắc chắn, tài liệu này ghi rõ **Cần kiểm tra tài liệu chính thức tại api-docs.pancake.vn**.

## 2. Thông tin chung

### 2.1 Base URL

Production server đã xác minh từ OpenAPI:

```text
https://pos.pages.fm/api/v1
```

Mọi endpoint bên dưới dùng base URL này.

Ví dụ:

```text
GET https://pos.pages.fm/api/v1/shops/{SHOP_ID}/products/variations?api_key={API_KEY}
```

### 2.2 Tạo và quản lý API Key

Theo phần mô tả trong OpenAPI:

- Vào giao diện Pancake POS.
- Truy cập **Cấu hình -> Nâng cao -> Kết nối bên thứ 3 -> Webhook/API**.
- Trong khung `API KEY`, click `Thêm mới` hoặc `Create`.

Ghi chú: trong `components.securitySchemes` của OpenAPI cũng có mô tả đường dẫn **Cấu hình -> Ứng dụng**. Có thể giao diện đã thay đổi theo phiên bản. Khi triển khai thật, cần kiểm tra lại UI hiện tại của shop.

Quy tắc vận hành API key:

- Tạo API key riêng cho backend AI Sales Automation.
- Không dùng chung API key với tool khác.
- Không commit API key lên GitHub.
- Rotate key khi nghi ngờ lộ.
- Giới hạn quyền key nếu Pancake POS hỗ trợ phân quyền chi tiết.

### 2.3 Authentication method

OpenAPI chính thức định nghĩa auth scheme:

```json
{
  "type": "apiKey",
  "in": "query",
  "name": "api_key"
}
```

Tức là request gọi Pancake POS dùng query parameter:

```http
?api_key=<PANCAKE_POS_API_KEY>
```

Ví dụ:

```bash
curl --location "https://pos.pages.fm/api/v1/shops/${SHOP_ID}/products/variations?api_key=${PANCAKE_POS_API_KEY}&page_size=30&page_number=1"
```

Lưu ý:

- Không đưa `api_key` vào log.
- Nếu backend nội bộ muốn chuẩn hóa auth bằng header như `Authorization`, chỉ dùng header đó giữa service nội bộ; khi gọi Pancake POS vẫn phải map sang `api_key` query theo OpenAPI hiện tại.
- Cần kiểm tra tài liệu chính thức tại `api-docs.pancake.vn` nếu Pancake POS bổ sung auth bằng header trong tương lai.

### 2.4 Endpoint kiểm tra shop

Dùng để xác minh API key có quyền truy cập shop nào.

```http
GET /shops?api_key={API_KEY}
```

Response rút gọn:

```json
{
  "success": true,
  "shops": [
    {
      "id": 26290,
      "name": "Shop thời trang",
      "pages": [
        {
          "id": "104438181227821",
          "name": "Fanpage bán hàng",
          "platform": "facebook",
          "shop_id": 26290
        }
      ]
    }
  ]
}
```

Backend nên gọi endpoint này khi setup để xác nhận `PANCAKE_POS_SHOP_ID` đúng.

## 3. Environment variables đề xuất

```text
PANCAKE_POS_API_BASE_URL=https://pos.pages.fm/api/v1
PANCAKE_POS_API_KEY=
PANCAKE_POS_SHOP_ID=
PANCAKE_POS_DEFAULT_WAREHOUSE_ID=
PANCAKE_POS_DEFAULT_PAGE_ID=
PANCAKE_POS_TIMEOUT_MS=10000
PANCAKE_POS_RETRY_MAX_ATTEMPTS=3
PRODUCT_CACHE_TTL_SECONDS=300
INVENTORY_CACHE_TTL_SECONDS=60
LOW_STOCK_THRESHOLD=3
```

Quy tắc:

- `PANCAKE_POS_API_KEY` là secret.
- `PANCAKE_POS_SHOP_ID` lấy từ `GET /shops`.
- `PANCAKE_POS_DEFAULT_WAREHOUSE_ID` lấy từ `GET /shops/{SHOP_ID}/warehouses`.
- TTL tồn kho nên ngắn vì tồn kho thay đổi nhanh khi sale tạo đơn.

## 4. Sản phẩm & Biến thể

### 4.1 Endpoint lấy danh sách sản phẩm + biến thể

Endpoint đã xác minh:

```http
GET /shops/{SHOP_ID}/products/variations
```

Mục đích:

- Lấy danh sách sản phẩm và biến thể.
- Có thông tin tồn kho theo kho.
- Có thể dùng để search sản phẩm theo tên/SKU/keyword.
- Có thể filter theo trạng thái sản phẩm, category, variation IDs, tồn kho.

Query params quan trọng:

| Param | Type | Required | Ý nghĩa |
| --- | --- | --- | --- |
| `api_key` | string | Có | API key |
| `page_size` | integer | Không | Số bản ghi/trang, default trong docs là 30 |
| `page_number` | integer | Không | Trang hiện tại |
| `search` | string | Không | Từ khóa tìm kiếm, ví dụ `áo sơ mi` |
| `product_status` | string | Không | `locked` hoặc `not_locked` |
| `selling_status` | string | Không | `none`, `bad`, `normal`, `star` |
| `variation_ids[]` | array | Không | Lọc theo danh sách variation ID |
| `category_id[]` | array | Không | Lọc theo danh mục |
| `warehouse_until` | date-time | Không | Lấy tồn kho tại một thời điểm |
| `remainQuantity` | string JSON | Không | Lọc theo số tồn có thể bán |
| `actualQuantity` | string JSON | Không | Lọc theo số tồn thực trong kho |
| `limit_quantity_to_warn` | boolean | Không | Chỉ lấy sản phẩm chạm ngưỡng cảnh báo sắp hết hàng |
| `nearly_out` | boolean | Không | Chỉ lấy mẫu mã sắp hết hàng |

Ví dụ lấy danh sách sản phẩm active:

```bash
curl --location "https://pos.pages.fm/api/v1/shops/${SHOP_ID}/products/variations?api_key=${PANCAKE_POS_API_KEY}&page_size=30&page_number=1&product_status=not_locked"
```

Ví dụ search sản phẩm theo từ khóa:

```bash
curl --location "https://pos.pages.fm/api/v1/shops/${SHOP_ID}/products/variations?api_key=${PANCAKE_POS_API_KEY}&search=%C3%A1o%20s%C6%A1%20mi&page_size=10&page_number=1"
```

Ví dụ lọc một biến thể cụ thể:

```bash
curl --location "https://pos.pages.fm/api/v1/shops/${SHOP_ID}/products/variations?api_key=${PANCAKE_POS_API_KEY}&variation_ids[]=e190db2b-1163-4cc3-b956-7a9528fbf5ef"
```

### 4.2 Response mẫu danh sách sản phẩm + biến thể

Response rút gọn từ OpenAPI:

```json
{
  "success": true,
  "data": [
    {
      "id": "e190db2b-1163-4cc3-b956-7a9528fbf5ef",
      "product_id": "3b98a639-9d40-4faa-a692-6662f20e128d",
      "display_id": "ADXL",
      "barcode": null,
      "is_hidden": false,
      "is_locked": false,
      "fields": [
        {
          "id": "b032c515-3f71-4a1b-8e1d-77721ae72f37",
          "name": "màu",
          "value": "nâu"
        },
        {
          "id": "677c14b5-458f-4af6-8d73-08bcb2245547",
          "name": "size",
          "value": "s"
        }
      ],
      "images": [
        "https://cf.shopee.vn/file/example-image"
      ],
      "retail_price": 140000,
      "price_at_counter": 123000,
      "remain_quantity": 20,
      "variations_warehouses": [
        {
          "warehouse_id": "a41b5d73-9236-4a5d-9954-4db6d93242d1",
          "actual_remain_quantity": 100,
          "remain_quantity": 20,
          "pending_quantity": 0,
          "returning_quantity": 0,
          "total_quantity": 102,
          "selling_avg": 0.23
        }
      ],
      "product": {
        "name": "ASOS đen XL",
        "display_id": "ADXL",
        "image": "https://content.pancake.vn/example.png",
        "note_product": "Ghi chú sản phẩm",
        "categories": [],
        "product_attributes": [
          {
            "name": "Color",
            "values": ["black", "white"]
          },
          {
            "name": "Size",
            "values": ["S", "M"]
          }
        ],
        "tags": [
          {
            "id": 51,
            "note": "thẻ sản phẩm"
          }
        ]
      },
      "updated_at": "2026-03-09T01:45:58.013616"
    }
  ],
  "page_number": 1,
  "page_size": 30,
  "total_entries": 751,
  "total_pages": 26
}
```

Các field quan trọng cho AI:

| Field | Ý nghĩa | Mapping nội bộ |
| --- | --- | --- |
| `data[].product_id` | ID sản phẩm | `Product.id` |
| `data[].product.name` | Tên sản phẩm | `Product.name` |
| `data[].product.note_product` | Ghi chú/mô tả sản phẩm | `Product.description` hoặc `fitNotes` |
| `data[].id` | ID biến thể | `ProductVariant.id` |
| `data[].barcode` | Barcode nếu có | `ProductVariant.barcode` |
| `data[].fields[]` | Thuộc tính biến thể như size/màu | `ProductVariant.size`, `ProductVariant.color` |
| `data[].retail_price` | Giá bán lẻ | `ProductVariant.price` |
| `data[].price_at_counter` | Giá tại quầy | Giá tham khảo, cần thống nhất ưu tiên |
| `data[].remain_quantity` | Số tồn có thể bán | `InventorySnapshot.availableQuantity` |
| `data[].variations_warehouses[]` | Tồn kho từng kho | `InventorySnapshot` theo warehouse |
| `data[].is_hidden` / `is_locked` | Sản phẩm ẩn/khóa | Không gợi ý nếu true |

Quy tắc tư vấn:

- Không gợi ý sản phẩm nếu `is_hidden = true` hoặc `is_locked = true`.
- Không nói "còn hàng" nếu `remain_quantity` thiếu hoặc không gọi được POS.
- Nếu nhiều kho có tồn, ưu tiên kho mặc định hoặc kho sale vận hành xác nhận.
- Nếu chỉ có `price_at_counter` và `retail_price` khác nhau, cần thống nhất quy tắc giá trước khi AI báo giá.

### 4.3 Endpoint lấy chi tiết sản phẩm

Endpoint đã xác minh:

```http
GET /shops/{SHOP_ID}/products/{PRODUCT_SKU}
```

`PRODUCT_SKU` trong docs được mô tả là **mã SKU hoặc ID sản phẩm**.

Ví dụ:

```bash
curl --location "https://pos.pages.fm/api/v1/shops/${SHOP_ID}/products/3b98a639-9d40-4faa-a692-6662f20e128d?api_key=${PANCAKE_POS_API_KEY}"
```

Response rút gọn:

```json
{
  "name": "Ao so mi nam",
  "category_ids": [1290021044, 201250699],
  "note": "dễ vỡ",
  "note_product": "Ghi chú sản phẩm",
  "product_attributes": [
    {
      "name": "Color",
      "values": ["black", "white"]
    },
    {
      "name": "Size",
      "values": ["s", "m"]
    }
  ],
  "tags": [193, 51],
  "weight": 1,
  "custom_id": "PCUSTOMID",
  "is_published": true,
  "variations": [
    {
      "id": "415040f4-ab63-465e-8699-e9ebfff4c6c7",
      "fields": [
        {
          "name": "Màu",
          "value": "Trắng"
        },
        {
          "name": "Size",
          "value": "M"
        }
      ],
      "images": [
        "https://statics.pancake.vn/example.jpg"
      ],
      "retail_price": 140000,
      "price_at_counter": 123000,
      "barcode": "BARCODE123",
      "custom_id": "VCUSTOMID",
      "is_hidden": false,
      "variations_warehouses": [
        {
          "remain_quantity": 10,
          "warehouse_id": "c52e67ad-d9d0-4276-abe4-e0c9f1f7d2da",
          "batch_position": "lô 1",
          "shelf_position": "1.2"
        }
      ],
      "keyword": "VCUSTOMID"
    }
  ],
  "materials": [182, 193],
  "keyword": "vai|cao cấp"
}
```

Khi dùng endpoint này:

- Dùng để mở rộng chi tiết sản phẩm khi khách hỏi sâu.
- Dùng để kiểm tra lại biến thể trước khi tạo đơn nháp.
- Không thay thế bước kiểm tra tồn kho nếu dữ liệu đã cũ hoặc order sắp tạo.

## 5. Tồn kho (Inventory)

### 5.1 Endpoint kiểm tra tồn kho real-time

OpenAPI hiện không có endpoint tên riêng kiểu `/inventory/check`. Với nhu cầu kiểm tra tồn kho real-time cho chatbot, dùng endpoint đã xác minh:

```http
GET /shops/{SHOP_ID}/products/variations
```

Kết hợp:

- `variation_ids[]` để query đúng biến thể.
- `warehouse_until` nếu cần tồn kho tại thời điểm cụ thể.
- `remainQuantity`/`actualQuantity` khi cần lọc theo điều kiện số lượng.

Ví dụ kiểm tra tồn kho một biến thể:

```bash
curl --location "https://pos.pages.fm/api/v1/shops/${SHOP_ID}/products/variations?api_key=${PANCAKE_POS_API_KEY}&variation_ids[]=415040f4-ab63-465e-8699-e9ebfff4c6c7&page_size=1&page_number=1"
```

Response rút gọn:

```json
{
  "success": true,
  "data": [
    {
      "id": "415040f4-ab63-465e-8699-e9ebfff4c6c7",
      "product_id": "3487e126-b0d9-4dae-89a9-ee60bef2f4e9",
      "retail_price": 140000,
      "remain_quantity": 10,
      "variations_warehouses": [
        {
          "warehouse_id": "c52e67ad-d9d0-4276-abe4-e0c9f1f7d2da",
          "actual_remain_quantity": 12,
          "remain_quantity": 10,
          "pending_quantity": 2,
          "returning_quantity": 0,
          "total_quantity": 12
        }
      ]
    }
  ],
  "page_number": 1,
  "page_size": 1,
  "total_entries": 1,
  "total_pages": 1
}
```

### 5.2 Ý nghĩa các field tồn kho

| Field | Ý nghĩa | Cách dùng trong chatbot |
| --- | --- | --- |
| `remain_quantity` | Số tồn có thể bán | Dùng để quyết định còn hàng hay không |
| `actual_remain_quantity` | Số tồn thực trong kho | Dùng để debug/đối chiếu với kho |
| `pending_quantity` | Số lượng đang giữ/chờ xử lý | Không tính là chắc chắn bán được |
| `returning_quantity` | Số lượng đang hoàn về | Không tính là chắc chắn bán được |
| `total_quantity` | Tổng số lượng | Tham khảo, không dùng một mình để báo còn hàng |
| `warehouse_id` | Kho tương ứng | Map với kho mặc định hoặc kho sale chọn |
| `selling_avg` | Tốc độ bán trung bình | Hỗ trợ phát hiện sắp hết hàng |

### 5.3 Quy tắc nội bộ xác định tồn kho

| Điều kiện | Trạng thái nội bộ | AI được nói gì |
| --- | --- | --- |
| `remain_quantity > LOW_STOCK_THRESHOLD` | `in_stock` | Có thể nói còn hàng |
| `0 < remain_quantity <= LOW_STOCK_THRESHOLD` | `low_stock` | Nói còn ít, sale kiểm tra lại trước khi chốt |
| `remain_quantity <= 0` | `out_of_stock` | Nói hiện chưa có hàng, gợi ý mẫu khác nếu có dữ liệu |
| Không gọi được API hoặc thiếu field | `unknown` | Không nói chắc, handoff cho sale |

Không dùng `actual_remain_quantity` thay cho `remain_quantity` khi tư vấn bán hàng nếu chưa được vận hành xác nhận, vì `remain_quantity` phản ánh lượng có thể bán tốt hơn.

### 5.4 Inventory analytics

OpenAPI có các endpoint thống kê tồn kho:

```http
GET /shops/{SHOP_ID}/inventory_analytics/inventory
GET /shops/{SHOP_ID}/inventory_analytics/inventory_by_product
```

Query params chính:

| Param | Required | Ý nghĩa |
| --- | --- | --- |
| `api_key` | Có | API key |
| `start_date` | Có | Unix timestamp bắt đầu |
| `end_date` | Có | Unix timestamp kết thúc |
| `type` | Có | `actual` hoặc `remain` |
| `page` | Không | Trang |
| `page_size` | Không | Kích thước trang |

Mục đích:

- Báo cáo tồn kho theo kỳ.
- Đối soát nhập/xuất/tồn.
- Không nên dùng làm endpoint real-time chính cho chatbot khi khách hỏi "còn hàng không".

## 6. Kho hàng

### 6.1 Lấy danh sách kho

Endpoint đã xác minh:

```http
GET /shops/{SHOP_ID}/warehouses
```

Ví dụ:

```bash
curl --location "https://pos.pages.fm/api/v1/shops/${SHOP_ID}/warehouses?api_key=${PANCAKE_POS_API_KEY}"
```

Response rút gọn:

```json
{
  "data": [
    {
      "id": "b4cb5897-6e56-4581-96cc-2f12677c7bd8",
      "name": "kho test ecod",
      "address": "Địa chỉ kho",
      "full_address": "Địa chỉ đầy đủ kho",
      "phone_number": "0999999999",
      "province_id": "717",
      "district_id": "71705",
      "commune_id": "7170510",
      "shop_id": 26290,
      "allow_create_order": true
    }
  ]
}
```

Quy tắc:

- Chỉ tạo đơn nháp với kho có `allow_create_order = true`.
- Nếu không có `PANCAKE_POS_DEFAULT_WAREHOUSE_ID`, backend phải handoff hoặc yêu cầu cấu hình.
- Không tự chọn kho ngẫu nhiên khi nhiều kho cùng còn hàng.

## 7. Tạo đơn nháp (Draft Order)

### 7.1 Trạng thái xác minh

OpenAPI chính thức hiện xác nhận endpoint:

```http
POST /shops/{SHOP_ID}/orders
```

Endpoint này được mô tả là **Create order**. OpenAPI không có endpoint riêng tên `draft_orders` và không ghi rõ "draft order" là trạng thái nào.

Vì vậy trong dự án này:

- Backend chỉ được coi đây là "tạo đơn nháp" sau khi xác minh trạng thái POS an toàn với shop thực tế.
- Không được tạo đơn với trạng thái đã xác nhận/chốt hoàn tất.
- Sale luôn phải kiểm tra và duyệt.

### 7.2 Order status enum đã xác minh

| Code | Tên tiếng Việt | Ý nghĩa |
| --- | --- | --- |
| `0` | Mới | Có thể là ứng viên cho đơn nháp, cần xác minh |
| `17` | Chờ xác nhận | Có thể là ứng viên cho đơn nháp/chờ sale, cần xác minh |
| `11` | Chờ hàng | Không dùng làm draft mặc định |
| `12` | Chờ in | Không dùng làm draft |
| `13` | Đã in | Không dùng làm draft |
| `20` | Đã đặt hàng | Cần xác minh ý nghĩa vận hành |
| `1` | Đã xác nhận | Không cho AI tự tạo ở giai đoạn này |
| `8` | Đang đóng hàng | Không dùng |
| `9` | Chờ chuyển hàng | Không dùng |
| `2` | Đã gửi hàng | Không dùng |
| `3` | Đã nhận | Không dùng |
| `16` | Đã thu tiền | Không dùng |
| `4` | Đang hoàn | Không dùng |
| `15` | Hoàn một phần | Không dùng |
| `5` | Đã hoàn | Không dùng |
| `6` | Đã hủy | Không dùng |
| `7` | Đã xóa | Không dùng |

Khuyến nghị an toàn:

- Chỉ dùng `status = 0` hoặc `status = 17` nếu shop xác nhận đó là đơn nháp/chờ sale.
- Tuyệt đối không dùng `status = 1` cho AI trong giai đoạn này.
- Nếu chưa xác minh status draft, không gọi `POST /orders`; chỉ tạo `HandoffSummary`.

### 7.3 Endpoint tạo đơn

```http
POST /shops/{SHOP_ID}/orders?api_key={API_KEY}
Content-Type: application/json
```

OpenAPI request body dùng schema Order lớn. Field duy nhất được đánh dấu required ở schema là `shop_id`, nhưng để tạo đơn có ích và an toàn, backend phải yêu cầu tối thiểu các field vận hành dưới đây.

### 7.4 Field bắt buộc nội bộ khi tạo đơn nháp

| Field | Required nội bộ | Lý do |
| --- | --- | --- |
| `shop_id` | Có | Required theo OpenAPI |
| `status` | Có | Phải là status nháp/chờ xác nhận đã được shop phê duyệt |
| `bill_full_name` | Nên có | Tên khách để sale nhận diện |
| `bill_phone_number` | Có | Sale/chốt đơn/giao hàng cần số điện thoại |
| `page_id` | Nên có | Liên kết về nguồn hội thoại |
| `conversation_id` | Nên có | Trace lại hội thoại Botcake/Pancake |
| `warehouse_id` | Có | Xác định kho xuất hàng |
| `items[].variation_id` | Có | Required theo OpenAPI item |
| `items[].quantity` | Có | Required theo OpenAPI item |
| `items[].variation_info.retail_price` | Nên có | OpenAPI khuyến nghị gửi để giá dòng hàng đúng |
| `shipping_address.address` | Có nếu giao hàng | Địa chỉ nhận hàng |
| `shipping_address.phone_number` | Có nếu khác số bill | Số nhận hàng |
| `note` | Nên có | Ghi rõ đơn do AI tạo nháp và cần sale duyệt |

Không tạo đơn nếu:

- Không có `variation_id`.
- Không có `quantity` hoặc `quantity <= 0`.
- Tồn kho `unknown` hoặc `out_of_stock`.
- Thiếu số điện thoại khách.
- Thiếu địa chỉ khi khách yêu cầu giao hàng.
- Chưa xác minh status nháp của Pancake POS.

### 7.5 Request mẫu tạo đơn nháp an toàn

Mẫu dưới đây là proposal dựa trên `POST /orders` đã xác minh. `status = 17` chỉ là ví dụ "Chờ xác nhận"; cần kiểm tra tài liệu chính thức tại `api-docs.pancake.vn` và test shop trước khi dùng production.

```json
{
  "shop_id": 26290,
  "status": 17,
  "bill_full_name": "Nguyễn Thị Lan",
  "bill_phone_number": "0901234567",
  "page_id": "104438181227821",
  "conversation_id": "104438181227821_987654321",
  "warehouse_id": "b4cb5897-6e56-4581-96cc-2f12677c7bd8",
  "items": [
    {
      "variation_id": "415040f4-ab63-465e-8699-e9ebfff4c6c7",
      "quantity": 1,
      "variation_info": {
        "id": "415040f4-ab63-465e-8699-e9ebfff4c6c7",
        "name": "Áo suông trung niên",
        "product_id": "3487e126-b0d9-4dae-89a9-ee60bef2f4e9",
        "retail_price": 140000,
        "fields": [
          {
            "name": "Màu",
            "value": "Xanh"
          },
          {
            "name": "Size",
            "value": "L"
          }
        ]
      },
      "note": "Khách chọn size L màu xanh qua AI chatbot"
    }
  ],
  "shipping_address": {
    "full_name": "Nguyễn Thị Lan",
    "phone_number": "0901234567",
    "address": "90 Cầu Giấy, Hà Nội",
    "country_code": "84"
  },
  "note": "[AI DRAFT] Đơn nháp do AI tạo. Sale cần kiểm tra tồn kho, giá, địa chỉ và xác nhận lại với khách trước khi chốt.",
  "note_print": "Sale xác nhận lại trước khi giao."
}
```

Ví dụ curl:

```bash
curl --location "https://pos.pages.fm/api/v1/shops/${SHOP_ID}/orders?api_key=${PANCAKE_POS_API_KEY}" \
  --header "Content-Type: application/json" \
  --data @draft-order.json
```

### 7.6 Response tạo đơn thành công

OpenAPI response của `POST /orders` trả về object order. Response rút gọn:

```json
{
  "id": 1,
  "shop_id": 26290,
  "status": 17,
  "status_name": "Chờ xác nhận",
  "bill_full_name": "Nguyễn Thị Lan",
  "bill_phone_number": "0901234567",
  "page_id": "104438181227821",
  "conversation_id": "104438181227821_987654321",
  "warehouse_id": "b4cb5897-6e56-4581-96cc-2f12677c7bd8",
  "items": [
    {
      "product_id": "3487e126-b0d9-4dae-89a9-ee60bef2f4e9",
      "variation_id": "415040f4-ab63-465e-8699-e9ebfff4c6c7",
      "quantity": 1,
      "variation_info": {
        "id": "415040f4-ab63-465e-8699-e9ebfff4c6c7",
        "name": "Áo suông trung niên",
        "retail_price": 140000,
        "fields": [
          {
            "name": "Màu",
            "value": "Xanh"
          },
          {
            "name": "Size",
            "value": "L"
          }
        ]
      }
    }
  ],
  "shipping_address": {
    "full_name": "Nguyễn Thị Lan",
    "phone_number": "0901234567",
    "address": "90 Cầu Giấy, Hà Nội",
    "full_address": "90 Cầu Giấy, Hà Nội"
  },
  "note": "[AI DRAFT] Đơn nháp do AI tạo. Sale cần kiểm tra.",
  "inserted_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

Sau khi tạo đơn:

- Gắn tag Botcake `Đã tạo đơn nháp`.
- Gửi handoff summary cho sale.
- Không nói với khách "đơn đã chốt"; chỉ nói sale sẽ kiểm tra và xác nhận.

### 7.7 Phân biệt Draft vs Confirmed

Trong phạm vi dự án:

| Khái niệm | POS status ứng viên | AI được làm? | Sale cần làm? |
| --- | --- | --- | --- |
| Draft nội bộ | `0 - Mới` hoặc `17 - Chờ xác nhận`, cần xác minh | Có thể tạo sau khi được duyệt quy trình | Kiểm tra và xác nhận |
| Confirmed | `1 - Đã xác nhận` | Không được tự tạo/chuyển | Sale xác nhận |
| Fulfillment statuses | `8`, `9`, `2`, `3`, `16`... | Không được dùng | Vận hành xử lý |
| Cancel/Return/Delete | `4`, `5`, `6`, `7`, `15` | Không được dùng | Sale/vận hành xử lý |

Cần kiểm tra tài liệu chính thức tại `api-docs.pancake.vn` và test thực tế:

- Khi `POST /orders` không truyền `status`, Pancake POS default là gì.
- `status = 0` hay `status = 17` phù hợp nhất cho đơn nháp.
- Việc tạo order có giữ hàng/tồn kho ngay không.
- Có webhook/order tag nào báo sale duyệt đơn nháp không.

## 8. Lấy thông tin đơn hàng

### 8.1 List orders

Endpoint:

```http
GET /shops/{SHOP_ID}/orders
```

Query params thường dùng:

| Param | Ý nghĩa |
| --- | --- |
| `api_key` | API key |
| `page` / `page_size` | Phân trang |
| `filter_status[]` | Lọc status, ví dụ `0`, `17`, `1` |
| `updateStatus` | Loại thời gian dùng để lọc |

Ví dụ lấy đơn chờ xác nhận:

```bash
curl --location "https://pos.pages.fm/api/v1/shops/${SHOP_ID}/orders?api_key=${PANCAKE_POS_API_KEY}&filter_status[]=17&page_size=20&page=1"
```

### 8.2 Get order detail

Endpoint:

```http
GET /shops/{SHOP_ID}/orders/{ORDER_ID}
```

Dùng để:

- Kiểm tra đơn nháp sau khi tạo.
- Đồng bộ trạng thái sale đã xác nhận hay chưa.
- Debug khi tạo đơn lỗi hoặc thiếu item.

## 9. Error handling

OpenAPI hiện chỉ khai báo response `200` cho các endpoint đã kiểm tra; schema lỗi chi tiết chưa thấy trong spec. Cần kiểm tra tài liệu chính thức tại `api-docs.pancake.vn` hoặc test sandbox để xác định error body.

### 9.1 Mapping HTTP lỗi nội bộ

| HTTP/status | Nguyên nhân thường gặp | Retry | Hành động |
| --- | --- | --- | --- |
| 400 | Query/body sai, thiếu field, sai JSON | Không | Log validation, không retry |
| 401/403 | Sai `api_key` hoặc không có quyền shop | Không | Alert cấu hình/API key |
| 404 | Sai `SHOP_ID`, order/product/variation không tồn tại | Không | Handoff nếu đang chat |
| 408 | Timeout | Có | Retry theo policy |
| 429 | Rate limit nếu POS áp dụng | Có backoff | Queue và giảm tốc |
| 500/502/503/504 | Lỗi tạm thời POS/network | Có | Retry rồi fallback handoff |

### 9.2 Business errors cần xử lý

| Tình huống | Hành động |
| --- | --- |
| `success = false` dù HTTP 200 | Treat as failure, đọc message nếu có |
| Product không có trong POS | Không tư vấn sản phẩm đó, handoff nếu khách hỏi mua |
| Variation bị hidden/locked | Không gợi ý, không tạo đơn |
| Tồn kho unknown | Không báo còn hàng, handoff |
| Tạo order trả status confirmed ngoài ý muốn | Ngừng automation, alert khẩn cấp, kiểm tra config |
| Order tạo thiếu item/giá | Handoff sale, không nói đã tạo đơn |

### 9.3 Internal error mapping

| POS failure | InternalErrorCode |
| --- | --- |
| Timeout | `POS_API_TIMEOUT` |
| Non-2xx hoặc `success=false` | `POS_API_ERROR` |
| Không tìm thấy sản phẩm | `PRODUCT_NOT_FOUND` |
| Không xác minh tồn kho | `INVENTORY_UNKNOWN` |
| Thiếu field trước khi tạo đơn | `DRAFT_ORDER_VALIDATION_FAILED` |
| Tạo đơn thất bại | `DRAFT_ORDER_CREATE_FAILED` |

## 10. Timeout, retry và cache

### 10.1 Timeout đề xuất

| API | Timeout |
| --- | --- |
| Product list/detail | 8-10 giây |
| Inventory check bằng variations | 8-10 giây |
| Create order | 10-15 giây |
| Get order detail | 8-10 giây |

### 10.2 Retry policy

```ts
const PANCAKE_POS_RETRY_POLICY = {
  maxAttempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 3000,
  jitter: true,
  retryStatusCodes: [408, 429, 500, 502, 503, 504]
};
```

Không retry:

- Validation error.
- Sai API key.
- Sai shop/product/variation/order ID.
- Tạo order khi request không idempotent mà chưa có idempotency key nội bộ.

### 10.3 Cache đề xuất

| Data | TTL | Lý do |
| --- | --- | --- |
| Product list/search | 5 phút | Giảm gọi API khi tư vấn nhiều |
| Product detail | 5-15 phút | Mô tả/ảnh/thuộc tính ít đổi |
| Inventory snapshot | 30-60 giây | Tồn kho thay đổi nhanh |
| Warehouses | 15-60 phút | Kho ít đổi |
| Order detail | Không cache dài | Trạng thái đơn thay đổi theo sale/vận hành |

Trước khi tạo đơn nháp, luôn refresh tồn kho bằng POS API, không dùng cache cũ.

## 11. Best practices khi tích hợp

### 11.1 Product & inventory

- Luôn map POS response sang domain type nội bộ, không truyền raw POS object vào AI.
- Chỉ cho AI dùng sản phẩm có `is_hidden = false`, `is_locked = false`.
- Dùng `fields[]` để đọc size/màu; không parse từ tên sản phẩm nếu POS đã có field.
- Nếu không tìm thấy size/màu khách hỏi, hỏi lại hoặc handoff.
- Không nói chắc tồn kho nếu API lỗi hoặc quá TTL.

### 11.2 Draft order

- Validate đủ thông tin trước khi gọi `POST /orders`.
- Ghi note rõ `[AI DRAFT]` vào đơn để sale nhận biết.
- Không tự chuyển status sang confirmed.
- Sau khi tạo đơn, luôn handoff sale.
- Lưu `order.id`, `status`, `status_name`, `conversation_id` vào state nội bộ.
- Chống tạo trùng bằng idempotency key nội bộ: `conversationId + sortedItems + phone + date`.

### 11.3 Security & logging

- Không log `api_key`.
- Redact số điện thoại, địa chỉ.
- Không log nguyên request tạo đơn ở production nếu có PII.
- Log requestId, shopId, endpoint, status, latency, errorCode.

Ví dụ log an toàn:

```ts
logger.info("pos_draft_order_created", {
  requestId,
  shopId,
  orderId: order.id,
  status: order.status,
  statusName: order.status_name,
  phone: redactPhone(order.bill_phone_number),
  itemCount: order.items?.length ?? 0
});
```

## 12. TypeScript mapper đề xuất

### 12.1 Product variation mapper

```ts
function mapPosVariationToDomain(row: PosVariation): ProductVariant {
  const size = row.fields?.find((field) =>
    field.name.toLowerCase().includes("size")
  )?.value;

  const color = row.fields?.find((field) =>
    ["màu", "mau", "color"].includes(field.name.toLowerCase())
  )?.value;

  return {
    id: row.id,
    productId: row.product_id,
    barcode: row.barcode ?? undefined,
    size,
    color,
    price: row.retail_price,
    inventory: {
      productId: row.product_id,
      variantId: row.id,
      availableQuantity: row.remain_quantity,
      status: mapInventoryStatus(row.remain_quantity),
      checkedAt: new Date().toISOString(),
      source: "pancake_pos"
    },
    isActive: !row.is_hidden && !row.is_locked,
    updatedAt: row.updated_at
  };
}
```

### 12.2 Draft order validation

```ts
function validateDraftOrder(input: DraftOrderInput): ValidationResult {
  if (!input.shopId) return invalid("Missing shopId");
  if (!input.status || !SAFE_DRAFT_STATUSES.includes(input.status)) {
    return invalid("Unsafe draft status");
  }
  if (!input.customer.phone) return invalid("Missing customer phone");
  if (!input.warehouseId) return invalid("Missing warehouseId");
  if (input.items.length === 0) return invalid("Missing order items");

  for (const item of input.items) {
    if (!item.variationId) return invalid("Missing variationId");
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return invalid("Invalid quantity");
    }
    if (item.inventoryStatus !== "in_stock" && item.inventoryStatus !== "low_stock") {
      return invalid("Inventory is not safe to create draft");
    }
  }

  return valid();
}
```

## 13. Implementation checklist cho developer

Trước khi code:

- Có `PANCAKE_POS_API_KEY`.
- Có `PANCAKE_POS_SHOP_ID` từ `GET /shops`.
- Có warehouse ID được phép tạo đơn.
- Có quyết định vận hành status nào là draft: `0` hay `17`.
- Có sản phẩm/variation test.
- Có quy tắc giá: ưu tiên `retail_price`, `price_at_counter` hay bảng giá khác.

Khi code:

- Implement `PancakePosClient.listProductVariations`.
- Implement `PancakePosClient.getProduct`.
- Implement `PancakePosClient.checkInventoryByVariationId`.
- Implement `PancakePosClient.listWarehouses`.
- Implement `PancakePosClient.createDraftOrder`, nhưng chặn nếu draft status chưa cấu hình.
- Implement mapper POS -> domain types.
- Implement retry/timeout/redaction.

Test bắt buộc:

- Search product thành công.
- Variation hidden/locked không được gợi ý.
- Inventory `remain_quantity = 0` -> handoff/out_of_stock.
- POS timeout -> `INVENTORY_UNKNOWN`.
- Draft order thiếu phone -> validation fail.
- Draft order dùng status `1` -> validation fail.
- Draft order thành công -> tạo handoff summary và tag `Đã tạo đơn nháp`.

## 14. Những điểm cần xác minh thêm

- Rate limit chính thức của Pancake POS Open API.
- Error response body chuẩn khi API lỗi.
- Endpoint riêng cho draft order có tồn tại không, hoặc chỉ dùng `POST /orders`.
- Status nào được shop coi là đơn nháp/chờ sale duyệt: `0` hay `17`.
- `POST /orders` có tự giữ hàng/trừ tồn kho ngay không.
- `POST /orders` có hỗ trợ idempotency key không.
- Có cần truyền `variation_info.retail_price` bắt buộc trong shop thực tế không.
- Quy tắc giá chính thức khi có nhiều bảng giá.
- Có webhook order-created/order-updated để backend đồng bộ status sau khi sale duyệt không.

Cần kiểm tra tài liệu chính thức tại `api-docs.pancake.vn` và test với shop/sandbox thật trước khi bật tạo đơn nháp production.

