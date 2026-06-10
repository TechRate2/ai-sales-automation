export type BotcakeChannel = "facebook" | "instagram" | "zalo" | "whatsapp" | "unknown";

export interface BotcakeInboundEvent {
  eventId: string;
  conversationId: string;
  psid: string;
  senderId: string | undefined;
  channel: BotcakeChannel;
  timestamp: string;
  message: BotcakeInboundMessage;
  raw: unknown;
}

export interface BotcakeInboundMessage {
  messageId: string | undefined;
  text: string | undefined;
  attachments: readonly unknown[];
}

export interface BotcakeSendContentRequest {
  psid: string;
  data: BotcakeDynamicContent;
}

export interface BotcakeSendFlowRequest {
  psid: string;
  flowId: string;
  payload: Record<string, unknown>;
}

export interface BotcakeDynamicContent {
  version: "v2";
  content: {
    messages: BotcakeDynamicMessage[];
    quick_replies?: BotcakeQuickReply[];
    actions?: BotcakeAction[];
  };
}

export type BotcakeDynamicMessage =
  | { type: "text"; text: string }
  | { type: "image"; url: string };

export interface BotcakeQuickReply {
  title: string;
  payload: string;
}

export type BotcakeAction =
  | { action: "add_tag"; tag_id: string }
  | { action: "set_custom_field"; field_id: string; value: string };

export interface BotcakeTag {
  id: string;
  name: string;
  raw: unknown;
}
