import type { InventorySnapshot, ProductVariantId } from "../pos/types";

export type ConversationStage =
  | "new"
  | "qualifying"
  | "consulting"
  | "collecting_order_info"
  | "draft_order_ready"
  | "handoff_required"
  | "waiting_for_sale";

export type CustomerIntentType =
  | "greeting"
  | "product_question"
  | "size_advice"
  | "price_question"
  | "inventory_question"
  | "purchase_intent"
  | "complaint"
  | "human_request"
  | "policy_question"
  | "unknown";

export type HandoffReason =
  | "purchase_intent"
  | "human_request"
  | "complaint"
  | "uncertain_product"
  | "uncertain_inventory"
  | "uncertain_policy"
  | "api_error"
  | "low_confidence"
  | "sensitive_information";

export type HandoffTag =
  | "San sang chot don"
  | "Can sale ho tro"
  | "Da tao don nhap"
  | "Can kiem tra ton kho"
  | "Khach hoi chinh sach";

export type SafetyFlag =
  | "customer_wants_human"
  | "customer_complaint"
  | "purchase_ready"
  | "product_uncertain"
  | "inventory_unknown"
  | "policy_uncertain"
  | "api_failed"
  | "low_intent_confidence"
  | "sensitive_information";

export interface CustomerIntent {
  type: CustomerIntentType;
  confidence: number;
  productVariantId: ProductVariantId | undefined;
  messageText: string;
}

export interface ConversationSlots {
  customerName: string | undefined;
  phone: string | undefined;
  address: string | undefined;
  size: string | undefined;
  color: string | undefined;
  quantity: number | undefined;
  budget: number | undefined;
  need: string | undefined;
  paymentMethod: string | undefined;
}

export interface ConversationState {
  conversationId: string;
  psid: string;
  stage: ConversationStage;
  slots: ConversationSlots;
  lastIntent: CustomerIntent | undefined;
  updatedAt: string;
}

export interface HandoffSummary {
  status: HandoffTag;
  reason: HandoffReason;
  customerNeed: string;
  productInterest: string;
  collectedInfo: string;
  missingInfo: string;
  conversationNote: string;
}

export interface HandoffEvaluationInput {
  intent: CustomerIntent;
  state: ConversationState;
  inventory: InventorySnapshot | undefined;
  apiError: boolean;
  policyUncertain: boolean;
  productUncertain: boolean;
}

export interface HandoffDecision {
  shouldHandoff: boolean;
  reason: HandoffReason | undefined;
  tag: HandoffTag | undefined;
  safetyFlags: SafetyFlag[];
  priority: number;
  safeReply: string | undefined;
}
