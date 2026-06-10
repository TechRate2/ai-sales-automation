# Real Connection Check

Ngày kiểm tra: 2026-06-10

## 1. Quy tắc bảo mật

- Không lưu Botcake token hoặc Pancake POS API key trong tài liệu này.
- Không commit file `.env`.
- Các key hiện đã được nhập vào `.env` local để kiểm tra. Sau khi hoàn tất giai đoạn test, chủ shop nên refresh/đổi key mới.

## 2. Botcake

Kết quả:

| Hạng mục | Trạng thái |
| --- | --- |
| Page ID | Hợp lệ |
| Public API token | Hợp lệ |
| Endpoint kiểm tra | `GET /pages/{page_id}/get_list_tag?page=1` |
| HTTP status | `200` |
| Số tag đọc được | `14` |

Một số tag thật đọc được:

- `GIẢM GIÁ`
- `HUỶ`
- `GẤM`
- `KHÔNG MUA`
- `GỌI CHỐT`

Kết luận: Botcake Public API đã hoạt động với Page ID và token local.

## 3. Pancake POS

Kết quả:

| Hạng mục | Trạng thái |
| --- | --- |
| API key | Hợp lệ |
| Endpoint `GET /shops` | `200` |
| Shop ID | `1635254265` |
| Shop name | `Góc Pass Đồ MG` |
| Endpoint `GET /warehouses` | Hoạt động |
| Endpoint `GET /products/variations` | Hoạt động |

Kho đọc được:

| Warehouse ID | Tên kho | Ghi chú |
| --- | --- | --- |
| `d593c6cf-4860-4af2-a774-62cd2b380436` | `KHO CŨ KO TẠO ĐƠN` | Không chọn làm mặc định |
| `35daa9b8-a5b3-497e-a4a6-1acd4a64ab7f` | `SIÊU THỊ ĐỒ BỘ SG` | Đã chọn làm kho mặc định local |

Sản phẩm mẫu đọc được:

| Field | Giá trị |
| --- | --- |
| Product ID | `7f4fc526-c51d-459a-a8b9-3ef36b193347` |
| Product name | `MANGO REN ĐÙI` |
| Variant ID | `1fbedf7b-061a-454a-921e-10bb14f915c9` |
| Variant name nội bộ | `MANGO REN ĐÙI - Đen chấm bi - M` |
| Size | `M` |
| Màu | `Đen chấm bi` |
| Giá | `179000` |
| Hình ảnh | Có |
| Tồn kho variant mẫu | `out_of_stock`, số lượng `-3` |

Kết luận: Pancake POS API đã hoạt động với API key local. Mapper POS đã được chỉnh theo cấu trúc response thật.

## 4. Doctor

`npm run doctor` hiện trả:

| Check | Trạng thái |
| --- | --- |
| System prompt | `PASS` |
| Botcake credentials | `PASS` |
| Pancake POS credentials | `PASS` |
| Draft order safety | `PASS` |

Dashboard `/api/readiness` hiện trả `overallStatus = pass` khi server đọc `.env` local.

## 5. Những việc vẫn chưa được bật

- Chưa bật tạo đơn nháp thật.
- Chưa cấu hình webhook URL trong Pancake POS.
- Chưa cấu hình webhook inbound thật từ Botcake.
- Chưa gửi tin nhắn thật cho khách vì chưa có `BOTCAKE_TEST_PSID` nội bộ.
- Chưa có database lưu hội thoại/state.
- Chưa có Knowledge Base thật đầy đủ.

## 6. Đánh giá chuẩn bị chạy thật

Đã sẵn sàng cho bước tiếp theo:

1. Đọc tag Botcake thật.
2. Đọc shop/kho/sản phẩm/tồn kho Pancake POS thật.
3. Hiển thị dashboard readiness PASS.

Chưa sẵn sàng mở cho khách quảng cáo thật cho tới khi có:

1. Webhook HTTPS public.
2. Payload webhook thật từ Botcake.
3. Database state/idempotency.
4. Knowledge Base đầy đủ.
5. Một `psid` nội bộ để test gửi tin trước.
6. Quy trình sale nhận tag/handoff thật.
