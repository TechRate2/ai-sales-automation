import { BotcakeClient } from "../botcake/client";
import type { BotcakeTag } from "../botcake/types";
import { PancakeApiClient } from "../pancake/client";
import type { PancakeConversationSummary, PancakePageSummary, PancakeTagSummary } from "../pancake/types";
import { mapInventoryFromVariation, mapPancakeVariation } from "../pos/mappers";
import { PancakePosClient } from "../pos/client";
import type { InventoryStatus } from "../pos/types";
import type { AppConfig } from "../utils/config";
import type { AppError } from "../utils/errors";

export interface LiveDiscoveryPayload {
  checkedAt: string;
  overallStatus: "pass" | "warn" | "fail";
  botcake: LiveBotcakeStatus;
  pancakeApi: LivePancakeApiStatus;
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

export interface LivePancakeApiStatus {
  status: "pass" | "warn" | "fail";
  mode: "page_token" | "user_token" | "not_configured";
  pageId: string | undefined;
  pageCount: number | undefined;
  samplePages: LivePancakePage[];
  conversationCount: number | undefined;
  sampleConversations: LivePancakeConversation[];
  tagCount: number | undefined;
  sampleTags: LiveTag[];
  message: string;
}

export interface LivePancakePage {
  id: string;
  name: string;
  platform: string | undefined;
}

export interface LivePancakeConversation {
  id: string;
  type: string | undefined;
  customerName: string | undefined;
  updatedAt: string | undefined;
  lastMessageAt: string | undefined;
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
  const [botcake, pancakeApi, pancakePos] = await Promise.all([
    discoverBotcake(config),
    discoverPancakeApi(config),
    discoverPancakePos(config)
  ]);

  return {
    checkedAt: new Date().toISOString(),
    overallStatus: summarizeStatus([botcake.status, pancakeApi.status, pancakePos.status]),
    botcake,
    pancakeApi,
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

async function discoverPancakeApi(config: AppConfig): Promise<LivePancakeApiStatus> {
  const client = new PancakeApiClient(config.pancakeApi);
  const hasPageToken = config.pancakeApi.pageAccessToken !== undefined && config.pancakeApi.pageId !== undefined;
  const hasUserToken = config.pancakeApi.userAccessToken !== undefined;

  if (config.pancakeApi.pageAccessToken !== undefined && config.pancakeApi.pageId === undefined) {
    return createPancakeApiWarn(
      "not_configured",
      undefined,
      "Đã có PANCAKE_API_PAGE_ACCESS_TOKEN nhưng thiếu PANCAKE_API_PAGE_ID."
    );
  }

  if (hasPageToken) {
    const [conversations, tags] = await Promise.all([
      client.listConversations(),
      client.listTags()
    ]);

    const failed = [conversations, tags].find((result) => !result.ok);
    if (failed !== undefined && !failed.ok) {
      return createPancakeApiWarn("page_token", config.pancakeApi.pageId, formatError(failed.error));
    }

    const conversationItems = conversations.ok ? normalizeConversations(conversations.data.data) : [];
    const tagItems = tags.ok ? normalizePancakeTags(tags.data.data) : [];

    return {
      status: "pass",
      mode: "page_token",
      pageId: config.pancakeApi.pageId,
      pageCount: undefined,
      samplePages: [],
      conversationCount: conversationItems.length,
      sampleConversations: conversationItems.slice(0, 5).map(toLiveConversation),
      tagCount: tagItems.length,
      sampleTags: tagItems.slice(0, 8).map(toLivePancakeTag),
      message: "Đã đọc được Pancake Inbox thật bằng Page Access Token."
    };
  }

  if (hasUserToken) {
    const pages = await client.listPages();
    if (!pages.ok) {
      return createPancakeApiWarn("user_token", config.pancakeApi.pageId, formatError(pages.error));
    }

    const pageItems = normalizePages(pages.data.data);
    return {
      status: pageItems.length > 0 ? "pass" : "warn",
      mode: "user_token",
      pageId: config.pancakeApi.pageId,
      pageCount: pageItems.length,
      samplePages: pageItems.slice(0, 6).map(toLivePage),
      conversationCount: undefined,
      sampleConversations: [],
      tagCount: undefined,
      sampleTags: [],
      message: pageItems.length > 0
        ? "Đã đọc được danh sách page Pancake bằng User Access Token."
        : "Pancake API phản hồi nhưng chưa đọc được page nào."
    };
  }

  return {
    status: "warn",
    mode: "not_configured",
    pageId: config.pancakeApi.pageId,
    pageCount: undefined,
    samplePages: [],
    conversationCount: undefined,
    sampleConversations: [],
    tagCount: undefined,
    sampleTags: [],
    message: "Chưa có PANCAKE_API_PAGE_ACCESS_TOKEN hoặc PANCAKE_API_USER_ACCESS_TOKEN cho Unified Inbox."
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

function toLivePancakeTag(tag: PancakeTagSummary): LiveTag {
  return {
    id: tag.id,
    name: tag.name
  };
}

function toLivePage(page: PancakePageSummary): LivePancakePage {
  return {
    id: page.id,
    name: page.name,
    platform: page.platform
  };
}

function toLiveConversation(conversation: PancakeConversationSummary): LivePancakeConversation {
  return {
    id: conversation.id,
    type: conversation.type,
    customerName: conversation.customerName,
    updatedAt: conversation.updatedAt,
    lastMessageAt: conversation.lastMessageAt
  };
}

function createPancakeApiWarn(
  mode: LivePancakeApiStatus["mode"],
  pageId: string | undefined,
  message: string
): LivePancakeApiStatus {
  return {
    status: "warn",
    mode,
    pageId,
    pageCount: undefined,
    samplePages: [],
    conversationCount: undefined,
    sampleConversations: [],
    tagCount: undefined,
    sampleTags: [],
    message
  };
}

function normalizePages(raw: unknown): PancakePageSummary[] {
  return extractLikelyArray(raw, ["pages", "data"])
    .filter(isRecord)
    .map((item) => ({
      id: readString(item, "id") ?? readString(item, "page_id") ?? "",
      name: readString(item, "name") ?? readString(item, "page_name") ?? "Không rõ tên page",
      platform: readString(item, "platform") ?? readString(item, "channel"),
      raw: item
    }))
    .filter((page) => page.id !== "");
}

function normalizeConversations(raw: unknown): PancakeConversationSummary[] {
  return extractLikelyArray(raw, ["conversations", "data"])
    .filter(isRecord)
    .map((item) => ({
      id: readString(item, "id") ?? readString(item, "conversation_id") ?? "",
      type: readString(item, "type") ?? readString(item, "conversation_type"),
      customerName: readNestedString(item, ["customer", "name"]) ?? readNestedString(item, ["from", "name"]) ?? readString(item, "customer_name"),
      updatedAt: readString(item, "updated_at") ?? readString(item, "updated_time"),
      lastMessageAt: readString(item, "last_message_at") ?? readNestedString(item, ["last_message", "created_at"]),
      raw: item
    }))
    .filter((conversation) => conversation.id !== "");
}

function normalizePancakeTags(raw: unknown): PancakeTagSummary[] {
  return extractLikelyArray(raw, ["tags", "data"])
    .filter(isRecord)
    .map((item) => ({
      id: readString(item, "id") ?? readString(item, "tag_id") ?? "",
      name: readString(item, "name") ?? readString(item, "text") ?? readString(item, "tag_name") ?? "",
      color: readString(item, "color"),
      raw: item
    }))
    .filter((tag) => tag.id !== "" && tag.name !== "");
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

  const hasPancakeInboxToken = config.pancakeApi.userAccessToken !== undefined
    || (config.pancakeApi.pageAccessToken !== undefined && config.pancakeApi.pageId !== undefined);

  if (!hasPancakeInboxToken) {
    missing.push("PANCAKE_API_USER_ACCESS_TOKEN hoặc PANCAKE_API_PAGE_ACCESS_TOKEN để xây Unified Inbox thật.");
  }

  if (config.pancakeApi.pageAccessToken !== undefined && config.pancakeApi.pageId === undefined) {
    missing.push("PANCAKE_API_PAGE_ID để dùng cùng PANCAKE_API_PAGE_ACCESS_TOKEN.");
  }

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

function extractLikelyArray(source: unknown, keys: readonly string[]): unknown[] {
  if (Array.isArray(source)) {
    return source;
  }

  if (!isRecord(source)) {
    return [];
  }

  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value;
    }

    const nested = extractLikelyArray(value, keys);
    if (nested.length > 0) {
      return nested;
    }
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
