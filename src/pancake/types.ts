export interface PancakePageSummary {
  id: string;
  name: string;
  platform: string | undefined;
  raw: unknown;
}

export interface PancakeConversationSummary {
  id: string;
  type: string | undefined;
  customerName: string | undefined;
  updatedAt: string | undefined;
  lastMessageAt: string | undefined;
  raw: unknown;
}

export interface PancakeTagSummary {
  id: string;
  name: string;
  color: string | undefined;
  raw: unknown;
}

export interface PancakeConversationQuery {
  lastConversationId?: string;
  tagIds?: readonly string[];
  conversationTypes?: readonly string[];
}
