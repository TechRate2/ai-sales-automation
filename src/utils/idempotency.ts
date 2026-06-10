import { createHash } from "node:crypto";

export function buildMessageFingerprint(input: {
  conversationId: string;
  senderId: string | undefined;
  timestamp: string;
  text: string | undefined;
}): string {
  const raw = [
    input.conversationId,
    input.senderId ?? "unknown-sender",
    input.timestamp,
    input.text ?? ""
  ].join("|");

  return createHash("sha256").update(raw).digest("hex");
}
