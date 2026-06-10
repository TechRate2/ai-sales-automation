import { BotcakeClient } from "../botcake/client";
import type { BotcakeTag } from "../botcake/types";
import { mapInventoryFromVariation, mapPancakeVariation } from "../pos/mappers";
import { PancakePosClient } from "../pos/client";
import type { InventoryStatus } from "../pos/types";
import type { AppConfig } from "../utils/config";
import type { AppError } from "../utils/errors";

export interface LiveDiscoveryPayload {
  checkedAt: string;
  overallStatus: "pass" | "warn" | "fail";
  botcake: LiveBotcakeStatus;
  pancakePos: LivePancakePosStatus;
  nextRequiredInputs: string[];
}

export interface LiveBotcakeStatus {
  status: "pass" | "warn" | "fail";
  pageIdSource: string;
  tagCount: number;
  sampleTags: LiveTag[];
  message: string;
}

export interface LiveTag {
  id: string;
  name: string;
}

export interface LivePancakePosStatus {
  status: "pass" | "warn" | "fail";
  shop: LiveShop | undefined;
  warehouses: LiveWarehouse[];
  sampleProducts: LiveProductSample[];
  productTotalEntries: number | undefined;
  message: string;
}

export interface LiveShop {
  id: string;
  name: string;
  pageCount: number;
  pageNames: string[];
}

export interface LiveWarehouse {
  id: string;
  name: string;
  allowCreateOrder: boolean | undefined;
  isDefault: boolean;
}

export interface LiveProductSample {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  sku: string | undefined;
  size: string | undefined;
  color: string | undefined;
  price: number | undefined;
  inventoryStatus: InventoryStatus;
  availableQuantity: number | undefined;
  imageUrl: string | undefined;
}

export async function buildLiveDiscoveryPayload(config: AppConfig): Promise<LiveDiscoveryPayload> {
  const [botcake, pancakePos] = await Promise.all([
    discoverBotcake(config),
    discoverPancakePos(config)
  ]);

  return {
    checkedAt: new Date().toISOString(),
    overallStatus: summarizeStatus([botcake.status, pancakePos.status]),
    botcake,
    pancakePos,
    nextRequiredInputs: buildNextRequiredInputs(config)
  };
}

async function discoverBotcake(config: AppConfig): Promise<LiveBotcakeStatus> {
  const client = new BotcakeClient(config.botcake);
  const tags = await client.listTags();

  if (!tags.ok) {
    return {
      status: "warn",
      pageIdSource: config.botcake.pageIdSource,
      tagCount: 0,
      sampleTags: [],
      message: formatError(tags.error)
    };
  }

  return {
    status: "pass",
    pageIdSource: config.botcake.pageIdSource,
    tagCount: tags.data.length,
    sampleTags: tags.data.slice(0, 8).map(toLiveTag),
    message: tags.data.length > 0
      ? "Đã đọc được tag thật từ Botcake."
      : "Botcake API phản hồi thành công nhưng chưa đọc được tag nào."
  };
}

async function discoverPancakePos(config: AppConfig): Promise<LivePancakePosStatus> {
  const client = new PancakePosClient(config.pancakePos);
  const [shops, warehouses, variations] = await Promise.all([
    client.listShops(),
    client.listWarehouses(),
    client.listProductVariations({ pageSize: 8, pageNumber: 1, productStatus: "not_locked" })
  ]);

  const failed = [shops, warehouses, variations].find((result) => !result.ok);
  if (failed !== undefined && !failed.ok) {
    return {
      status: "warn",
      shop: undefined,
      warehouses: [],
      sampleProducts: [],
      productTotalEntries: undefined,
      message: formatError(failed.error)
    };
  }

  const shop = shops.ok ? extractShop(shops.data.data, config.pancakePos.shopId) : undefined;
  const liveWarehouses = warehouses.ok ? extractWarehouses(warehouses.data.data, config.pancakePos.defaultWarehouseId) : [];
  const productRows = variations.ok ? extractArray(variations.data.data, "data") : [];
  const sampleProducts = productRows
    .filter(isRecord)
    .map(toProductSample)
    .filter((item): item is LiveProductSample => item !== undefined)
    .slice(0, 6);

  return {
    status: shop !== undefined && sampleProducts.length > 0 ? "pass" : "warn",
    shop,
    warehouses: liveWarehouses,
    sampleProducts,
    productTotalEntries: variations.ok ? readNumber(variations.data.data, "total_entries") : undefined,
    message: shop !== undefined
      ? "Đã đọc được shop, kho và sản phẩm thật từ Pancake POS."
      : "Pancake POS API phản hồi nhưng chưa xác định được shop đang cấu hình."
  };
}

function toLiveTag(tag: BotcakeTag): LiveTag {
  return {
    id: tag.id,
    name: tag.name
  };
}

function extractShop(raw: unknown, configuredShopId: string | undefined): LiveShop | undefined {
  const shops = extractArray(raw, "shops").filter(isRecord);
  const selected = shops.find((shop) => readString(shop, "id") === configuredShopId) ?? shops[0];
  if (selected === undefined) {
    return undefined;
  }

  const pages = extractArray(selected.pages, "pages").filter(isRecord);
  return {
    id: readString(selected, "id") ?? "",
    name: readString(selected, "name") ?? "Không rõ tên shop",
    pageCount: pages.length,
    pageNames: pages.map((page) => readString(page, "name")).filter((name): name is string => name !== undefined).slice(0, 4)
  };
}

function extractWarehouses(raw: unknown, defaultWarehouseId: string | undefined): LiveWarehouse[] {
  return extractArray(raw, "data")
    .filter(isRecord)
    .map((warehouse) => ({
      id: readString(warehouse, "id") ?? "",
      name: readString(warehouse, "name") ?? "Không rõ tên kho",
      allowCreateOrder: readBoolean(warehouse, "allow_create_order"),
      isDefault: defaultWarehouseId !== undefined && readString(warehouse, "id") === defaultWarehouseId
    }))
    .filter((warehouse) => warehouse.id !== "")
    .slice(0, 6);
}

function toProductSample(raw: Record<string, unknown>): LiveProductSample | undefined {
  const productId = readString(raw, "product_id");
  if (productId === undefined) {
    return undefined;
  }

  const variant = mapPancakeVariation(raw, productId);
  const inventory = mapInventoryFromVariation(raw);
  if (!variant.ok || !inventory.ok) {
    return undefined;
  }

  return {
    productId,
    productName: readNestedString(raw, ["product", "name"]) ?? variant.data.name,
    variantId: variant.data.id,
    variantName: variant.data.name,
    sku: variant.data.sku,
    size: variant.data.size,
    color: variant.data.color,
    price: variant.data.price,
    inventoryStatus: inventory.data.status,
    availableQuantity: inventory.data.availableQuantity,
    imageUrl: variant.data.imageUrl
  };
}

function buildNextRequiredInputs(config: AppConfig): string[] {
  const missing: string[] = [];

  missing.push("PANCAKE_API_USER_ACCESS_TOKEN hoặc PANCAKE_API_PAGE_ACCESS_TOKEN để xây Unified Inbox thật.");
  missing.push("Domain HTTPS public để cấu hình Pancake/Botcake webhook.");
  missing.push("Webhook sample thật từ Pancake messaging để map payload production.");
  missing.push("PSID hoặc khách nội bộ để test gửi tin không ảnh hưởng khách thật.");
  missing.push("Tag/Flow ID chuẩn cho handoff, khách nóng, follow-up và đơn nháp.");

  if (!config.pancakePos.enableDraftOrderCreation) {
    missing.push("Xác nhận trạng thái đơn nháp an toàn trong POS trước khi bật tạo đơn.");
  }

  return missing;
}

function summarizeStatus(statuses: Array<"pass" | "warn" | "fail">): LiveDiscoveryPayload["overallStatus"] {
  if (statuses.includes("fail")) {
    return "fail";
  }

  if (statuses.includes("warn")) {
    return "warn";
  }

  return "pass";
}

function formatError(error: AppError): string {
  return `${error.code}: ${error.message}`;
}

function extractArray(source: unknown, key: string): unknown[] {
  if (Array.isArray(source)) {
    return source;
  }

  if (isRecord(source)) {
    const value = source[key];
    return Array.isArray(value) ? value : [];
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function readNumber(source: unknown, key: string): number | undefined {
  if (!isRecord(source)) {
    return undefined;
  }

  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBoolean(source: Record<string, unknown>, key: string): boolean | undefined {
  const value = source[key];
  return typeof value === "boolean" ? value : undefined;
}

function readNestedString(source: Record<string, unknown>, path: readonly string[]): string | undefined {
  let current: unknown = source;
  for (const key of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[key];
  }

  return typeof current === "string" && current.trim() !== "" ? current : undefined;
}
