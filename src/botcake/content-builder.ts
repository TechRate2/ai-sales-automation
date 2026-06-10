import type { BotcakeAction, BotcakeDynamicContent, BotcakeQuickReply } from "./types";

export function buildTextContent(text: string, options: BuildTextContentOptions = {}): BotcakeDynamicContent {
  const quickReplies = options.quickReplies ?? [];
  const actions = options.actions ?? [];

  return {
    version: "v2",
    content: {
      messages: [{ type: "text", text }],
      ...(quickReplies.length > 0 ? { quick_replies: quickReplies } : {}),
      ...(actions.length > 0 ? { actions } : {})
    }
  };
}

export interface BuildTextContentOptions {
  quickReplies?: BotcakeQuickReply[];
  actions?: BotcakeAction[];
}

export function addTagAction(tagId: string): BotcakeAction {
  return { action: "add_tag", tag_id: tagId };
}
