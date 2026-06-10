import { describe, expect, it } from "vitest";
import { evaluateHandoff } from "../../src/ai/handoff-rules";
import type { ConversationState, CustomerIntent, HandoffEvaluationInput } from "../../src/ai/types";

const state: ConversationState = {
  conversationId: "conversation-1",
  psid: "psid-1",
  stage: "consulting",
  slots: {
    customerName: undefined,
    phone: undefined,
    address: undefined,
    size: undefined,
    color: undefined,
    quantity: undefined,
    budget: undefined,
    need: undefined,
    paymentMethod: undefined
  },
  lastIntent: undefined,
  updatedAt: "2026-06-10T00:00:00.000Z"
};

function input(intent: CustomerIntent): HandoffEvaluationInput {
  return {
    intent,
    state,
    inventory: undefined,
    apiError: false,
    policyUncertain: false,
    productUncertain: false
  };
}

describe("handoff rules", () => {
  it("hands off immediately when customer asks for a human", () => {
    const decision = evaluateHandoff(input({
      type: "human_request",
      confidence: 0.99,
      productVariantId: undefined,
      messageText: "I want a human"
    }));

    expect(decision.shouldHandoff).toBe(true);
    expect(decision.reason).toBe("human_request");
    expect(decision.tag).toBe("Can sale ho tro");
  });

  it("hands off when intent confidence is low", () => {
    const decision = evaluateHandoff(input({
      type: "unknown",
      confidence: 0.2,
      productVariantId: undefined,
      messageText: "unclear"
    }));

    expect(decision.shouldHandoff).toBe(true);
    expect(decision.reason).toBe("low_confidence");
  });
});
