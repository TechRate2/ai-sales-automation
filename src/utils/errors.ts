export type InternalErrorCode =
  | "CONFIG_INVALID"
  | "VALIDATION_ERROR"
  | "WEBHOOK_SIGNATURE_INVALID"
  | "WEBHOOK_PAYLOAD_INVALID"
  | "BOTCAKE_API_TIMEOUT"
  | "BOTCAKE_API_ERROR"
  | "BOTCAKE_TAG_FAILED"
  | "PANCAKE_API_TIMEOUT"
  | "PANCAKE_API_ERROR"
  | "POS_API_TIMEOUT"
  | "POS_API_ERROR"
  | "POS_PRODUCT_NOT_FOUND"
  | "POS_INVENTORY_UNKNOWN"
  | "POS_DRAFT_ORDER_DISABLED"
  | "POS_DRAFT_ORDER_UNSAFE_STATUS"
  | "AI_LOW_CONFIDENCE"
  | "AI_POLICY_UNCERTAIN"
  | "HANDOFF_REQUIRED"
  | "UNKNOWN_ERROR";

export interface AppError {
  code: InternalErrorCode;
  message: string;
  retryable: boolean;
  statusCode: number | undefined;
  details: Record<string, unknown> | undefined;
}

export interface CreateAppErrorInput {
  code: InternalErrorCode;
  message: string;
  retryable?: boolean;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export function createAppError(input: CreateAppErrorInput): AppError {
  return {
    code: input.code,
    message: input.message,
    retryable: input.retryable ?? false,
    statusCode: input.statusCode,
    details: input.details
  };
}

export function isRetryableHttpStatus(statusCode: number): boolean {
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

export function unknownToError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}
