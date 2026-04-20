export const DEFAULT_CHAT_HISTORY_MAX_MESSAGES = 20;
export const DEFAULT_CHAT_MESSAGE_TTL_SECONDS = 86400; // 24 hours in seconds

export enum ChatMessageRole {
  ASSISTANT = "ASSISTANT",
  USER = "USER",
}

export interface ChatMessage {
  id: string; // UUID
  userId: string; // UUID
  sessionId: string; // UUID or `${botId}#${chatId}` for Telegram messages
  role: ChatMessageRole;
  content: string;
  createdAt: string; // ISO timestamp
  expiresAt: number; // Unix timestamp (seconds), DynamoDB TTL attribute
}
