import type { PancakePosConfig } from "../utils/config";
import { createAppError, type AppError } from "../utils/errors";
import { HttpClient } from "../utils/http-client";
import { fail, type Result } from "../utils/result";
import { validateDraftOrderInput } from "./draft-order";
import type { DraftOrderContext, DraftOrderInput, PancakeProductVariationQuery } from "./types";

type JsonObject = Record<string, unknown>;

export class PancakePosClient {
  public constructor(
    private readonly config: PancakePosConfig,
    private readonly httpClient = new HttpClient({
      timeoutMs: config.timeoutMs,
      retry: {
        maxAttempts: config.retryMaxAttempts,
        baseDelayMs: config.retryBaseDelayMs
      },
      timeoutCode: "POS_API_TIMEOUT",
      apiErrorCode: "POS_API_ERROR"
    })
  ) {}

  public listShops(): Promise<Result<{ statusCode: number; data: unknown }, AppError>> {
    const configured = this.ensureApiKey();
    if (!configured.ok) {
      return Promise.resolve(configured);
    }

    return this.get("/shops");
  }

  public listProductVariations(query: PancakeProductVariationQuery = {}): Promise<Result<{ statusCode: number; data: unknown }, AppError>> {
    const configured = this.ensureShopConfigured();
    if (!configured.ok) {
      return Promise.resolve(configured);
    }

    return this.get(`/shops/${encodeURIComponent(this.config.shopId ?? "")}/products/variations`, {
      page_size: query.pageSize,
      page_number: query.pageNumber,
      product_status: query.productStatus,
      search: query.search,
      "variation_ids[]": query.variationIds
    });
  }

  public getProduct(productIdOrSku: string): Promise<Result<{ statusCode: number; data: unknown }, AppError>> {
    const configured = this.ensureShopConfigured();
    if (!configured.ok) {
      return Promise.resolve(configured);
    }

    return this.get(`/shops/${encodeURIComponent(this.config.shopId ?? "")}/products/${encodeURIComponent(productIdOrSku)}`);
  }

  public listWarehouses(): Promise<Result<{ statusCode: number; data: unknown }, AppError>> {
    const configured = this.ensureShopConfigured();
    if (!configured.ok) {
      return Promise.resolve(configured);
    }

    return this.get(`/shops/${encodeURIComponent(this.config.shopId ?? "")}/warehouses`);
  }

  public createDraftOrder(input: DraftOrderInput): Promise<Result<DraftOrderContext, AppError>> {
    const configured = this.ensureShopConfigured();
    if (!configured.ok) {
      return Promise.resolve(configured);
    }

    const validation = validateDraftOrderInput(input, {
      enableDraftOrderCreation: this.config.enableDraftOrderCreation,
      safeDraftStatuses: this.config.safeDraftStatuses
    });

    if (!validation.ok) {
      return Promise.resolve(validation);
    }

    return this.postDraftOrder(validation.data);
  }

  private async postDraftOrder(input: DraftOrderInput): Promise<Result<DraftOrderContext, AppError>> {
    const response = await this.httpClient.requestJson<JsonObject>({
      method: "POST",
      url: this.buildUrl(`/shops/${encodeURIComponent(this.config.shopId ?? "")}/orders`),
      body: buildDraftOrderPayload(input)
    });

    if (!response.ok) {
      return response;
    }

    const body = response.data.data;
    const draftOrderId = readString(body, "id") ?? readString(body, "order_id");

    return {
      ok: true,
      data: {
        draftOrderId,
        status: input.status,
        customer: input.customer,
        items: input.items,
        createdAt: new Date().toISOString(),
        raw: body
      }
    };
  }

  private async get(path: string, query: Record<string, unknown> = {}): Promise<Result<{ statusCode: number; data: unknown }, AppError>> {
    const response = await this.httpClient.requestJson<unknown>({
      method: "GET",
      url: this.buildUrl(path, query)
    });

    if (!response.ok) {
      return response;
    }

    return {
      ok: true,
      data: {
        statusCode: response.data.statusCode,
        data: response.data.data
      }
    };
  }

  private buildUrl(path: string, query: Record<string, unknown> = {}): string {
    const url = new URL(`${this.config.apiBaseUrl}${path}`);
    url.searchParams.set("api_key", this.config.apiKey ?? "");

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, String(item));
        }
        continue;
      }

      url.searchParams.set(key, String(value));
    }

    return url.toString();
  }

  private ensureApiKey(): Result<true, AppError> {
    if (this.config.apiKey === undefined) {
      return fail(createAppError({
        code: "CONFIG_INVALID",
        message: "PANCAKE_POS_API_KEY is required before calling Pancake POS.",
        retryable: false
      }));
    }

    return { ok: true, data: true };
  }

  private ensureShopConfigured(): Result<true, AppError> {
    const apiKeyCheck = this.ensureApiKey();
    if (!apiKeyCheck.ok) {
      return apiKeyCheck;
    }

    if (this.config.shopId === undefined) {
      return fail(createAppError({
        code: "CONFIG_INVALID",
        message: "PANCAKE_POS_SHOP_ID is required before calling shop scoped POS endpoints.",
        retryable: false
      }));
    }

    return { ok: true, data: true };
  }
}

function buildDraftOrderPayload(input: DraftOrderInput): JsonObject {
  return {
    status: input.status,
    customer: {
      name: input.customer.name,
      phone: input.customer.phone,
      address: input.customer.address
    },
    items: input.items.map((item) => ({
      variation_id: item.variantId,
      quantity: item.quantity,
      price: item.price
    })),
    note: input.note,
    page_id: input.pageId,
    warehouse_id: input.warehouseId
  };
}

function readString(source: unknown, key: string): string | undefined {
  if (source === null || typeof source !== "object") {
    return undefined;
  }

  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}
