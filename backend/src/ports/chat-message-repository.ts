import { ChatMessage, ChatMessageRole } from "../models/chat-message";

export interface CreateChatMessageInput {
  userId: string;
  sessionId: string;
  role: ChatMessageRole;
  content: string;
}

/**
 * NOTE: ChatMessage does not follow the standard soft-deletion pattern.
 * Messages are immutable and expire automatically via DynamoDB TTL (expiresAt attribute).
 * There is no `isArchived` flag and no archive/delete method on this repository.
 */
export interface ChatMessageRepository {
  /**
   * Returns up to `limit` most recent messages for the given session,
   * in descending order (newest first).
   */
  findManyRecentBySessionId(
    selector: { userId: string; sessionId: string },
    limit: number,
  ): Promise<ChatMessage[]>;

  create(input: CreateChatMessageInput): Promise<ChatMessage>;
}
