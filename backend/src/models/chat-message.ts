export enum ChatMessageRole {
  ASSISTANT = "ASSISTANT",
  USER = "USER",
}

export interface ChatMessage {
  id: string; // UUID v4
  userId: string;
  sessionId: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string; // ISO timestamp
  expiresAt: number; // Unix timestamp (seconds), DynamoDB TTL attribute
}
