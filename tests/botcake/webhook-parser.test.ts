import { describe, expect, it } from "vitest";
import { parseBotcakeInboundEvent } from "../../src/botcake/webhook-parser";

describe("botcake webhook parser", () => {
  it("parses the normalized inbound payload shape", () => {
    const result = parseBotcakeInboundEvent({
      event_id: "event-1",
      conversation_id: "conversation-1",
      psid: "psid-1",
      sender_id: "sender-1",
      channel: "facebook",
      timestamp: "2026-06-10T00:00:00.000Z",
      message: {
        id: "message-1",
        text: "Hello"
      }
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.conversationId).toBe("conversation-1");
      expect(result.data.message.text).toBe("Hello");
    }
  });

  it("rejects payloads without conversation and psid", () => {
    const result = parseBotcakeInboundEvent({
      message: {
        text: "Hello"
      }
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("WEBHOOK_PAYLOAD_INVALID");
    }
  });
});
