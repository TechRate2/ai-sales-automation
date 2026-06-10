# Token Acquisition Guide

Ngay cap nhat: 2026-06-10

Tai lieu nay giai thich ro tung loai token/API key can dung trong du an AI Sales Automation. Muc tieu la tranh nham lan giua **Pancake POS API key**, **Pancake User Access Token**, **Pancake Page Access Token** va **Botcake API token**.

## 1. Ket luan nhanh

Anh chup man hinh tai `api-docs.pancake.vn` dang hien thi **Pancake POS Open API key**, khong phai Pancake `access_token`.

| Ten cau hinh | La gi | Dung cho viec gi | Du an hien tai |
| --- | --- | --- | --- |
| `PANCAKE_POS_API_KEY` | API key cua Pancake POS Open API | Shop, kho, san pham, bien the, ton kho, don hang POS | Da co local va da goi duoc du lieu that |
| `PANCAKE_API_USER_ACCESS_TOKEN` | Token cap tai khoan Pancake | Tu dong list cac page user quan ly, generate Page Access Token | Chua co, can neu muon auto-discovery page |
| `PANCAKE_API_PAGE_ACCESS_TOKEN` | Token cap page Pancake | Unified Inbox: conversations, messages, tags, customers, statistics | Chua co, can de doc/chat inbox that |
| `BOTCAKE_API_TOKEN` | Token Botcake Public API | Botcake tags, send_content, send_flow, automation | Da co local va da goi duoc tag that |

Neu muc tieu truoc mat la build **Unified Inbox that** trong dashboard rieng, thong tin can bo sung tiep la:

```env
PANCAKE_API_PAGE_ACCESS_TOKEN=
PANCAKE_API_PAGE_ID=<PAGE_ID>
```

Neu muon he thong **tu dong lay danh sach page dang quan ly**, can bo sung:

```env
PANCAKE_API_USER_ACCESS_TOKEN=
```

## 2. Bang phan biet day du

| Loai khoa | Nguon lay | Base URL | Auth format | Scope | Rui ro |
| --- | --- | --- | --- | --- | --- |
| Pancake POS API key | POS -> Cau hinh -> Nang cao -> Ket noi ben thu 3 -> Webhook/API -> API KEY -> Create | `https://pos.pages.fm/api/v1` | Query `api_key=<key>` | POS shop, warehouses, products, variations, orders | Cao neu dung write API tao/sua don |
| Pancake User Access Token | Pancake `pages.fm` -> Account -> Personal Settings -> API Access Token | `https://pages.fm/api/v1` | Query `access_token=<token>` | Account-level: list pages, generate page token | Cao vi lien quan nhieu page user quan ly |
| Pancake Page Access Token | Pancake page -> Settings/Cai dat -> Tools/Cong cu -> Page Access Token; hoac generate qua API | `https://pages.fm/api/public_api/v1`, `https://pages.fm/api/public_api/v2` | Query `page_access_token=<token>` | Page-level: conversations, messages, tags, customers | Trung binh-cao vi co quyen inbox/page |
| Botcake API token | Botcake -> Cau hinh -> Tich hop -> Public API -> Tao API Key | `https://botcake.io/api/public_api/v1` | Header `access-token: <token>` | Botcake page/bot flows, tags, send_content | Cao neu bi lo vi co the gui tin/flow |

## 3. Cach lay Pancake POS API key

Dung khi can doc san pham, gia, ton kho, kho hang, don hang tu Pancake POS.

Theo tai lieu Pancake POS Open API:

1. Mo `https://pos.pancake.vn` hoac giao dien POS dang dung.
2. Vao **Cau hinh**.
3. Chon **Nang cao**.
4. Chon **Ket noi ben thu 3**.
5. Mo **Webhook/API**.
6. Trong tab **API Key**, bam **Create/Tao moi**.
7. Copy API key vao `.env`:

```env
PANCAKE_POS_API_KEY=...
```

Sau khi co key, backend co the goi:

```http
GET https://pos.pages.fm/api/v1/shops?api_key=<PANCAKE_POS_API_KEY>
```

Dung ket qua nay de lay:

```env
PANCAKE_POS_SHOP_ID=...
```

Sau do goi:

```http
GET https://pos.pages.fm/api/v1/shops/{SHOP_ID}/warehouses?api_key=<PANCAKE_POS_API_KEY>
```

Dung ket qua nay de lay:

```env
PANCAKE_POS_DEFAULT_WAREHOUSE_ID=...
```

Trang thai du an hien tai: POS key local da goi duoc `GET /shops`, `GET /warehouses`, `GET /products/variations`.

## 4. Cach lay Pancake User Access Token

Dung khi muon backend tu dong lay cac page dang quan ly, thay vi nhap Page ID thu cong.

Theo Pancake API Reference:

1. Dang nhap `https://pages.fm`.
2. Vao **Account**.
3. Vao **Personal Settings**.
4. Tim va copy **API Access Token**.
5. Dan vao `.env`:

```env
PANCAKE_API_USER_ACCESS_TOKEN=...
```

Sau khi co token, backend co the goi read-only:

```http
GET https://pages.fm/api/v1/pages?access_token=<PANCAKE_API_USER_ACCESS_TOKEN>
```

Muc dich:

- Lay danh sach page/account dang quan ly.
- Hien thi dropdown chon page trong dashboard.
- Tu dong lay `page_id` dung.

Luu y an toan:

- Token nay co scope cap tai khoan, phai coi la secret rat nhay cam.
- Khong dua vao frontend.
- Khong commit vao GitHub.
- Neu da chia se qua chat, nen rotate sau khi kiem thu xong.

## 5. Cach lay Pancake Page Access Token

Dung khi muon backend doc va xu ly inbox/messages/tags/customers cua mot page cu the.

Co hai cach:

### Cach A: Lay truc tiep trong giao dien Pancake

1. Mo page dang dung trong Pancake.
2. Vao **Cai dat** cua page.
3. Vao **Cong cu/Tools**.
4. Tim **Page Access Token**.
5. Copy vao `.env`:

```env
PANCAKE_API_PAGE_ACCESS_TOKEN=...
PANCAKE_API_PAGE_ID=<PAGE_ID>
```

Cach nay nen uu tien neu chi can ket noi page hien tai, vi khong tao/regenerate token moi bang API.

### Cach B: Generate qua API

Chi dung khi da co `PANCAKE_API_USER_ACCESS_TOKEN` va user la admin page.

```http
POST https://pages.fm/api/v1/pages/{page_id}/generate_page_access_token?access_token=<PANCAKE_API_USER_ACCESS_TOKEN>
```

Quy tac bat buoc:

- Khong tu dong goi endpoint nay neu chua co xac nhan cua chu du an.
- Viec generate/regenerate co the thay doi token page dang dung.
- Phai audit log: ai goi, page nao, luc nao.

Sau khi co Page Access Token, backend co the goi:

```http
GET https://pages.fm/api/public_api/v2/pages/{PAGE_ID}/conversations?page_access_token=<PANCAKE_API_PAGE_ACCESS_TOKEN>
```

Va:

```http
GET https://pages.fm/api/public_api/v1/pages/{PAGE_ID}/conversations/{CONVERSATION_ID}/messages?page_access_token=<PANCAKE_API_PAGE_ACCESS_TOKEN>
```

Day la manh con thieu quan trong nhat de dashboard tro thanh **Unified Inbox that**.

## 6. Cach lay Botcake API token

Dung khi can goi Botcake Public API: doc tag, gui dynamic content, send flow, kich hoat automation.

Theo Botcake docs va giao dien anh da mo:

1. Mo Botcake.
2. Vao **Cau hinh**.
3. Vao **Tich hop**.
4. Mo tab **API/Public API**.
5. Tao hoac copy **API Key**.
6. Dan vao `.env`:

```env
BOTCAKE_API_TOKEN=...
BOTCAKE_PAGE_ID=<PAGE_ID>
```

Auth khi goi API:

```http
access-token: <BOTCAKE_API_TOKEN>
```

Vi du:

```http
GET https://botcake.io/api/public_api/v1/pages/{BOTCAKE_PAGE_ID}/get_list_tag
```

Trang thai du an hien tai: Botcake token local da goi duoc danh sach tag that.

## 7. Ban can gui them gi cho du an

De code phan Unified Inbox va AI chat that, can chon mot trong hai huong:

| Huong | Ban gui gi | Khi nao nen dung |
| --- | --- | --- |
| An toan, nhanh nhat | `PANCAKE_API_PAGE_ACCESS_TOKEN` cua page dang ban hang | Muon noi thang page hien tai, doc conversations/messages/tags |
| Tu dong hoa day du hon | `PANCAKE_API_USER_ACCESS_TOKEN` | Muon he thong tu list pages va chon page trong UI |

Khuyen nghi: gui **Page Access Token** truoc de lam inbox/chat that. Sau do moi them **User Access Token** neu muon auto-discovery nhieu page.

## 8. Bien `.env` chuan

```env
# Botcake
BOTCAKE_API_BASE_URL=https://botcake.io/api/public_api/v1
BOTCAKE_PAGE_ID=<PAGE_ID>
BOTCAKE_API_TOKEN=

# Pancake Unified Inbox/API
PANCAKE_API_USER_BASE_URL=https://pages.fm/api/v1
PANCAKE_API_BASE_URL=https://pages.fm/api/public_api/v1
PANCAKE_API_V2_BASE_URL=https://pages.fm/api/public_api/v2
PANCAKE_API_USER_ACCESS_TOKEN=
PANCAKE_API_PAGE_ACCESS_TOKEN=
PANCAKE_API_PAGE_ID=<PAGE_ID>

# Pancake POS
PANCAKE_POS_API_BASE_URL=https://pos.pages.fm/api/v1
PANCAKE_POS_API_KEY=
PANCAKE_POS_SHOP_ID=
PANCAKE_POS_DEFAULT_WAREHOUSE_ID=
```

Khong bao gio commit `.env` len GitHub.

## 9. Nguon tai lieu da doi chieu

- Pancake API Reference: `https://developer.pancake.biz/`
- Pancake API Webhooks: `https://developer.pancake.biz/webhook`
- Pancake POS Open API: `https://api-docs.pancake.vn/`
- Botcake API References: `https://docs.pancake.biz/botcake/st-f7/st-p2`

## 10. Nhung diem can xac minh them

- Duong dan chinh xac trong UI Pancake de copy Page Access Token co the thay doi theo ngon ngu/giao dien moi.
- Endpoint generate Page Access Token can duoc test rieng va chi goi khi co xac nhan, vi co the anh huong token page dang dung.
- Can webhook sample that tu Pancake messaging va Botcake de map payload production chuan 100%.
- Can PSID/khach noi bo de test gui tin that ma khong anh huong khach hang that.
