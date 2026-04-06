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
