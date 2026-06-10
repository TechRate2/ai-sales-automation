import type { ConversationState, HandoffReason, HandoffSummary, HandoffTag } from "./types";

export interface CreateHandoffSummaryInput {
  status: HandoffTag;
  reason: HandoffReason;
  state: ConversationState;
  productInterest: string | undefined;
  note: string | undefined;
}

export function createHandoffSummary(input: CreateHandoffSummaryInput): HandoffSummary {
  return {
    status: input.status,
    reason: input.reason,
    customerNeed: input.state.slots.need ?? "Chua ro nhu cau cu the",
    productInterest: input.productInterest ?? "Chua xac dinh san pham cu the",
    collectedInfo: buildCollectedInfo(input.state),
    missingInfo: buildMissingInfo(input.state),
    conversationNote: input.note ?? "Can sale xem lai hoi thoai truoc khi tu van tiep."
  };
}

export function formatHandoffSummary(summary: HandoffSummary): string {
  return [
    `Tinh trang: ${summary.status}`,
    `Nhu cau khach: ${summary.customerNeed}`,
    `San pham quan tam: ${summary.productInterest}`,
    `Thong tin da co: ${summary.collectedInfo}`,
    `Thong tin con thieu: ${summary.missingInfo}`,
    `Ly do handoff: ${summary.reason}`,
    `Ghi chu hoi thoai: ${summary.conversationNote}`
  ].join("\n");
}

function buildCollectedInfo(state: ConversationState): string {
  const parts = [
    field("Ten", state.slots.customerName),
    field("SDT", state.slots.phone),
    field("Dia chi", state.slots.address),
    field("Size", state.slots.size),
    field("Mau", state.slots.color),
    field("So luong", state.slots.quantity?.toString()),
    field("Thanh toan", state.slots.paymentMethod)
  ].filter((part): part is string => part !== undefined);

  return parts.length > 0 ? parts.join("; ") : "Chua co thong tin dat hang";
}

function buildMissingInfo(state: ConversationState): string {
  const missing: string[] = [];
  if (state.slots.customerName === undefined) missing.push("ten");
  if (state.slots.phone === undefined) missing.push("so dien thoai");
  if (state.slots.address === undefined) missing.push("dia chi");
  if (state.slots.size === undefined) missing.push("size");
  if (state.slots.color === undefined) missing.push("mau");
  if (state.slots.quantity === undefined) missing.push("so luong");

  return missing.length > 0 ? missing.join(", ") : "Da du thong tin co ban";
}

function field(label: string, value: string | undefined): string | undefined {
  return value === undefined || value.trim() === "" ? undefined : `${label}: ${value}`;
}
