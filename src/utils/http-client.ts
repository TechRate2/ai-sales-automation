import { createAppError, isRetryableHttpStatus, unknownToError, type AppError, type InternalErrorCode } from "./errors";
import { fail, ok, type Result } from "./result";

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
}

export interface HttpClientOptions {
  fetchImpl?: FetchLike;
  timeoutMs: number;
  retry: RetryPolicy;
  timeoutCode: InternalErrorCode;
  apiErrorCode: InternalErrorCode;
}

export interface HttpRequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  retry?: Partial<RetryPolicy>;
}

export interface HttpResponse<T> {
  statusCode: number;
  headers: Record<string, string>;
  data: T;
}

export class HttpClient {
  private readonly fetchImpl: FetchLike;

  public constructor(private readonly options: HttpClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  public async requestJson<T>(request: HttpRequestOptions): Promise<Result<HttpResponse<T>, AppError>> {
    const maxAttempts = Math.max(1, request.retry?.maxAttempts ?? this.options.retry.maxAttempts);
    const baseDelayMs = request.retry?.baseDelayMs ?? this.options.retry.baseDelayMs;

    let lastError: AppError | undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const result = await this.executeOnce<T>(request);

      if (result.ok) {
        return result;
      }

      lastError = result.error;
      if (!result.error.retryable || attempt >= maxAttempts) {
        return result;
      }

      await sleep(baseDelayMs * attempt);
    }

    return fail(lastError ?? createAppError({
      code: this.options.apiErrorCode,
      message: "HTTP request failed without a captured error.",
      retryable: false
    }));
  }

  private async executeOnce<T>(request: HttpRequestOptions): Promise<Result<HttpResponse<T>, AppError>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const init: RequestInit = {
        method: request.method,
        headers: buildHeaders(request.headers, request.body),
        signal: controller.signal
      };

      if (request.body !== undefined) {
        init.body = JSON.stringify(request.body);
      }

      const response = await this.fetchImpl(request.url, init);

      const data = await parseResponseBody<T>(response);
      const headers = headersToRecord(response.headers);

      if (!response.ok) {
        return fail(createAppError({
          code: this.options.apiErrorCode,
          message: `HTTP ${response.status} from upstream API.`,
          retryable: isRetryableHttpStatus(response.status),
          statusCode: response.status,
          details: { body: data }
        }));
      }

      return ok({
        statusCode: response.status,
        headers,
        data
      });
    } catch (caughtError) {
      const error = unknownToError(caughtError);
      const isAbort = error.name === "AbortError";

      return fail(createAppError({
        code: isAbort ? this.options.timeoutCode : this.options.apiErrorCode,
        message: isAbort ? "HTTP request timed out." : error.message,
        retryable: true
      }));
    } finally {
      clearTimeout(timeout);
    }
  }
}

function buildHeaders(headers: Record<string, string> | undefined, body: unknown): Headers {
  const merged = new Headers(headers);
  if (body !== undefined && !merged.has("Content-Type")) {
    merged.set("Content-Type", "application/json");
  }
  return merged;
}

async function parseResponseBody<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const output: Record<string, string> = {};
  headers.forEach((value, key) => {
    output[key] = value;
  });
  return output;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
