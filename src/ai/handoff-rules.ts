import type { HandoffDecision, HandoffEvaluationInput, HandoffReason, HandoffTag, SafetyFlag } from "./types";

interface RuleMatch {
  priority: number;
  reason: HandoffReason;
  tag: HandoffTag;
  flag: SafetyFlag;
  safeReply: string;
}

export function evaluateHandoff(input: HandoffEvaluationInput): HandoffDecision {
  const matches: RuleMatch[] = [];

  if (input.intent.type === "human_request") {
    matches.push(rule(100, "human_request", "Can sale ho tro", "customer_wants_human", "De em chuyen thong tin cho sale ho tro chi ky hon nhe."));
  }

  if (input.intent.type === "complaint") {
    matches.push(rule(95, "complaint", "Can sale ho tro", "customer_complaint", "Em da ghi nhan thong tin, em chuyen sale ho tro chi ngay nhe."));
  }

  if (input.intent.type === "purchase_intent" || input.state.stage === "collecting_order_info") {
    matches.push(rule(90, "purchase_intent", "San sang chot don", "purchase_ready", "Em ghi nhan thong tin cua chi roi, sale se kiem tra va xac nhan lai don giup chi nhe."));
  }

  if (input.apiError) {
    matches.push(rule(85, "api_error", "Can sale ho tro", "api_failed", "He thong dang can sale kiem tra them thong tin cho chinh xac, em chuyen sale ho tro chi nhe."));
  }

  if (input.inventory?.status === "unknown") {
    matches.push(rule(80, "uncertain_inventory", "Can kiem tra ton kho", "inventory_unknown", "Mau nay em can kiem tra ton kho lai cho chac, em chuyen sale ho tro chi nhe."));
  }

  if (input.inventory?.status === "out_of_stock") {
    matches.push(rule(78, "uncertain_inventory", "Can kiem tra ton kho", "inventory_unknown", "Mau nay hien em chua thay con hang, em chuyen sale kiem tra them va goi y mau phu hop cho chi nhe."));
  }

  if (input.policyUncertain || input.intent.type === "policy_question") {
    matches.push(rule(75, "uncertain_policy", "Khach hoi chinh sach", "policy_uncertain", "Phan chinh sach nay em chuyen sale xac nhan chinh xac cho chi nhe."));
  }

  if (input.productUncertain) {
    matches.push(rule(70, "uncertain_product", "Can sale ho tro", "product_uncertain", "Thong tin san pham nay em can kiem tra lai cho chinh xac, em chuyen sale ho tro chi nhe."));
  }

  if (input.intent.confidence < 0.65) {
    matches.push(rule(60, "low_confidence", "Can sale ho tro", "low_intent_confidence", "Em chua nam ro y cua chi, em chuyen sale ho tro de tu van dung nhu cau hon nhe."));
  }

  if (matches.length === 0) {
    return {
      shouldHandoff: false,
      reason: undefined,
      tag: undefined,
      safetyFlags: [],
      priority: 0,
      safeReply: undefined
    };
  }

  const sorted = [...matches].sort((a, b) => b.priority - a.priority);
  const winner = sorted[0];
  if (winner === undefined) {
    return {
      shouldHandoff: false,
      reason: undefined,
      tag: undefined,
      safetyFlags: [],
      priority: 0,
      safeReply: undefined
    };
  }

  return {
    shouldHandoff: true,
    reason: winner.reason,
    tag: winner.tag,
    safetyFlags: sorted.map((match) => match.flag),
    priority: winner.priority,
    safeReply: winner.safeReply
  };
}

function rule(
  priority: number,
  reason: HandoffReason,
  tag: HandoffTag,
  flag: SafetyFlag,
  safeReply: string
): RuleMatch {
  return { priority, reason, tag, flag, safeReply };
}
