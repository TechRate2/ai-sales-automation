import { describe, expect, it } from "vitest";
import { validateDraftOrderInput } from "../../src/pos/draft-order";
import type { DraftOrderInput } from "../../src/pos/types";

const baseDraftOrder: DraftOrderInput = {
  customer: {
    name: "Test customer",
    phone: "0900000000",
    address: "Test address",
    paymentMethod: "cod"
  },
  items: [
    {
      variantId: "variant-1",
      productId: "product-1",
      sku: "SKU-1",
      name: "Product 1",
      quantity: 1,
      price: 100000
    }
  ],
  status: 17,
  note: "Draft only",
  pageId: "page-1",
  warehouseId: "warehouse-1"
};

describe("draft order validation", () => {
  it("blocks draft order creation when disabled", () => {
    const result = validateDraftOrderInput(baseDraftOrder, {
      enableDraftOrderCreation: false,
      safeDraftStatuses: [17]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("POS_DRAFT_ORDER_DISABLED");
    }
  });

  it("blocks confirmed status 1", () => {
    const result = validateDraftOrderInput({ ...baseDraftOrder, status: 1 }, {
      enableDraftOrderCreation: true,
      safeDraftStatuses: [1, 17]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("POS_DRAFT_ORDER_UNSAFE_STATUS");
    }
  });

  it("allows configured safe draft status", () => {
    const result = validateDraftOrderInput(baseDraftOrder, {
      enableDraftOrderCreation: true,
      safeDraftStatuses: [17]
    });

    expect(result.ok).toBe(true);
  });
});
