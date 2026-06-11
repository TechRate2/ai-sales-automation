import type { PancakeApiConfig } from "../utils/config";
import { createAppError, type AppError } from "../utils/errors";
import { HttpClient } from "../utils/http-client";
import { fail, type Result } from "../utils/result";
import type { PancakeConversationQuery } from "./types";

export class PancakeApiClient {
  public constructor(
    private readonly config: PancakeApiConfig,
    private readonly httpClient = new HttpClient({
      timeoutMs: config.timeoutMs,
      retry: {
        maxAttempts: config.retryMaxAttempts,
        baseDelayMs: config.retryBaseDelayMs
      },
      timeoutCode: "PANCAKE_API_TIMEOUT",
      apiErrorCode: "PANCAKE_API_ERROR"
    })
  ) {}

  public listPages(): Promise<Result<{ statusCode: number; data: unknown }, AppError>> {
    const configured = this.ensureUserToken();
    if (!configured.ok) {
      return Promise.resolve(configured);
    }

    return this.get(this.config.userBaseUrl, "/pages", {
      access_token: this.config.userAccessToken
    });
  }

  public listConversations(query: PancakeConversationQuery = {}): Promise<Result<{ statusCode: number; data: unknown }, AppError>> {
    const configured = this.ensurePageConfigured();
    if (!configured.ok) {
      return Promise.resolve(configured);
    }

    return this.get(this.config.publicV2BaseUrl, `/pages/${encodeURIComponent(this.config.pageId ?? "")}/conversations`, {
      page_access_token: this.config.pageAccessToken,
      last_conversation_id: query.lastConversationId,
      tag_ids: query.tagIds,
      conversation_types: query.conversationTypes
    });
  }

  public listTags(): Promise<Result<{ statusCode: number; data: unknown }, AppError>> {
    const configured = this.ensurePageConfigured();
    if (!configured.ok) {
      return Promise.resolve(configured);
    }

    return this.get(this.config.publicBaseUrl, `/pages/${encodeURIComponent(this.config.pageId ?? "")}/tags`, {
      page_access_token: this.config.pageAccessToken
    });
  }

  private async get(
    baseUrl: string,
    path: string,
    query: Record<string, unknown> = {}
  ): Promise<Result<{ statusCode: number; data: unknown }, AppError>> {
    const response = await this.httpClient.requestJson<unknown>({
      method: "GET",
      url: buildUrl(baseUrl, path, query)
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

  private ensureUserToken(): Result<true, AppError> {
    if (this.config.userAccessToken === undefined) {
      return fail(createAppError({
        code: "CONFIG_INVALID",
        message: "PANCAKE_API_USER_ACCESS_TOKEN is required before listing Pancake pages.",
        retryable: false
      }));
    }

    return { ok: true, data: true };
  }

  private ensurePageConfigured(): Result<true, AppError> {
    if (this.config.pageAccessToken === undefined || this.config.pageId === undefined) {
      return fail(createAppError({
        code: "CONFIG_INVALID",
        message: "PANCAKE_API_PAGE_ACCESS_TOKEN and PANCAKE_API_PAGE_ID are required before reading Pancake inbox.",
        retryable: false
      }));
    }

    return { ok: true, data: true };
  }
}

function buildUrl(baseUrl: string, path: string, query: Record<string, unknown>): string {
  const url = new URL(`${baseUrl}${path}`);

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(`${key}[]`, String(item));
      }
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}
