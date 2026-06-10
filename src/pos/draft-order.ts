import { createAppError, type AppError } from "../utils/errors";
import { fail, ok, type Result } from "../utils/result";
import type { DraftOrderInput } from "./types";

export interface DraftOrderSafetyConfig {
  enableDraftOrderCreation: boolean;
  safeDraftStatuses: readonly number[];
}

export function validateDraftOrderInput(
  input: DraftOrderInput,
  config: DraftOrderSafetyConfig
): Result<DraftOrderInput, AppError> {
  if (!config.enableDraftOrderCreation) {
    return fail(createAppError({
      code: "POS_DRAFT_ORDER_DISABLED",
      message: "Draft order creation is disabled until the shop verifies the safe POS status.",
      retryable: false
    }));
  }

  if (!Number.isInteger(input.status) || input.status === 1 || !config.safeDraftStatuses.includes(input.status)) {
    return fail(createAppError({
      code: "POS_DRAFT_ORDER_UNSAFE_STATUS",
      message: "Draft order status is not configured as safe.",
      retryable: false,
      details: { status: input.status }
    }));
  }

  if (input.customer.name.trim() === "" || input.customer.phone.trim() === "" || input.customer.address.trim() === "") {
    return fail(createAppError({
      code: "VALIDATION_ERROR",
      message: "Draft order requires customer name, phone, and address.",
      retryable: false
    }));
  }

  if (input.items.length === 0 || input.items.some((item) => item.variantId.trim() === "" || item.quantity <= 0)) {
    return fail(createAppError({
      code: "VALIDATION_ERROR",
      message: "Draft order requires at least one valid item with variantId and positive quantity.",
      retryable: false
    }));
  }

  return ok(input);
}
