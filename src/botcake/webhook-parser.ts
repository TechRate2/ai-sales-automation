import { createAppError, type AppError } from "../utils/errors";
import { fail, ok, type Result } from "../utils/result";
import type { BotcakeChannel, BotcakeInboundEvent } from "./types";

export function parseBotcakeInboundEvent(raw: unknown): Result<BotcakeInboundEvent, AppError> {
  if (raw === null || typeof raw !== "object") {
    return fail(createAppError({
      code: "WEBHOOK_PAYLOAD_INVALID",
      message: "Botcake webhook payload must be an object.",
      retryable: false
    }));
  }

  const payload = raw as Record<string, unknown>;
  const eventId = readString(payload, "event_id") ?? readString(payload, "id") ?? fingerprint(payload);
  const conversationId = readString(payload, "conversation_id") ?? readNestedString(payload, ["conversation", "id"]);
  const psid = readString(payload, "psid") ?? readNestedString(payload, ["sender", "psid"]);

  if (conversationId === undefined || psid === undefined) {
    return fail(createAppError({
      code: "WEBHOOK_PAYLOAD_INVALID",
      message: "Botcake webhook payload is missing conversation_id or psid.",
      retryable: false
    }));
  }

  return ok({
    eventId,
    conversationId,
    psid,
    senderId: readString(payload, "sender_id") ?? readNestedString(payload, ["sender", "id"]),
    channel: normalizeChannel(readString(payload, "channel")),
    timestamp: readString(payload, "timestamp") ?? new Date().toISOString(),
    message: {
      messageId: readString(payload, "message_id") ?? readNestedString(payload, ["message", "id"]),
      text: readString(payload, "text") ?? readNestedString(payload, ["message", "text"]),
      attachments: readArray(payload, "attachments") ?? readNestedArray(payload, ["message", "attachments"]) ?? []
    },
    raw
  });
}

function normalizeChannel(channel: string | undefined): BotcakeChannel {
  if (channel === "facebook" || channel === "instagram" || channel === "zalo" || channel === "whatsapp") {
    return channel;
  }

  return "unknown";
}

function fingerprint(payload: Record<string, unknown>): string {
  const conversationId = readString(payload, "conversation_id") ?? "unknown-conversation";
  const timestamp = readString(payload, "timestamp") ?? "unknown-time";
  const text = readString(payload, "text") ?? readNestedString(payload, ["message", "text"]) ?? "";
  return `${conversationId}:${timestamp}:${text.slice(0, 32)}`;
}

function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function readArray(source: Record<string, unknown>, key: string): unknown[] | undefined {
  const value = source[key];
  return Array.isArray(value) ? value : undefined;
}

function readNestedString(source: Record<string, unknown>, path: readonly string[]): string | undefined {
  let current: unknown = source;
  for (const key of path) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" && current.trim() !== "" ? current : undefined;
}

function readNestedArray(source: Record<string, unknown>, path: readonly string[]): unknown[] | undefined {
  let current: unknown = source;
  for (const key of path) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return Array.isArray(current) ? current : undefined;
}
