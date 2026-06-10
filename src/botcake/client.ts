import type { BotcakeConfig } from "../utils/config";
import { createAppError, type AppError } from "../utils/errors";
import { HttpClient } from "../utils/http-client";
import { fail, type Result } from "../utils/result";
import type { BotcakeSendContentRequest, BotcakeSendFlowRequest, BotcakeTag } from "./types";

export class BotcakeClient {
  public constructor(
    private readonly config: BotcakeConfig,
    private readonly httpClient = new HttpClient({
      timeoutMs: config.timeoutMs,
      retry: {
        maxAttempts: config.retryMaxAttempts,
        baseDelayMs: config.retryBaseDelayMs
      },
      timeoutCode: "BOTCAKE_API_TIMEOUT",
      apiErrorCode: "BOTCAKE_API_ERROR"
    })
  ) {}

  public sendContent(request: BotcakeSendContentRequest): Promise<Result<unknown, AppError>> {
    const configured = this.ensureConfigured();
    if (!configured.ok) {
      return Promise.resolve(configured);
    }

    return this.post(`/pages/${encodeURIComponent(this.config.pageId ?? "")}/flows/send_content`, request);
  }

  public sendFlow(request: BotcakeSendFlowRequest): Promise<Result<unknown, AppError>> {
    const configured = this.ensureConfigured();
    if (!configured.ok) {
      return Promise.resolve(configured);
    }

    return this.post(`/pages/${encodeURIComponent(this.config.pageId ?? "")}/flows/send_flow`, {
      psid: request.psid,
      flow_id: request.flowId,
      payload: request.payload
    });
  }

  public async listTags(): Promise<Result<BotcakeTag[], AppError>> {
    const configured = this.ensureConfigured();
    if (!configured.ok) {
      return configured;
    }

    const response = await this.httpClient.requestJson<unknown>({
      method: "GET",
      url: `${this.config.apiBaseUrl}/pages/${encodeURIComponent(this.config.pageId ?? "")}/get_list_tag`,
      headers: this.headers()
    });

    if (!response.ok) {
      return response;
    }

    return {
      ok: true,
      data: normalizeTags(response.data.data)
    };
  }

  private async post(path: string, body: unknown): Promise<Result<unknown, AppError>> {
    const response = await this.httpClient.requestJson<unknown>({
      method: "POST",
      url: `${this.config.apiBaseUrl}${path}`,
      headers: this.headers(),
      body
    });

    if (!response.ok) {
      return response;
    }

    return { ok: true, data: response.data.data };
  }

  private headers(): Record<string, string> {
    return {
      "access-token": this.config.apiToken ?? ""
    };
  }

  private ensureConfigured(): Result<true, AppError> {
    if (this.config.pageId === undefined || this.config.apiToken === undefined) {
      return fail(createAppError({
        code: "CONFIG_INVALID",
        message: "BOTCAKE_PAGE_ID and BOTCAKE_API_TOKEN are required before calling Botcake.",
        retryable: false
      }));
    }

    return { ok: true, data: true };
  }
}

function normalizeTags(raw: unknown): BotcakeTag[] {
  const items = Array.isArray(raw)
    ? raw
    : raw !== null && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).data)
      ? (raw as Record<string, unknown>).data as unknown[]
      : [];

  return items
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
    .map((item) => ({
      id: readString(item, "id") ?? readString(item, "tag_id") ?? "",
      name: readString(item, "name") ?? readString(item, "tag_name") ?? "",
      raw: item
    }))
    .filter((tag) => tag.id !== "" && tag.name !== "");
}

function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}
