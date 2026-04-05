import { z } from "zod";
import { ChatMessage, ChatMessageRole } from "../../models/chat-message";

export const chatMessageSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  sessionId: z.string().min(1),
  role: z.enum(ChatMessageRole),
  content: z.string(),
  createdAt: z.iso.datetime(),
  expiresAt: z.int().positive(),
}) satisfies z.ZodType<ChatMessage>;

export const chatMessageDbItemSchema = chatMessageSchema.extend({
  sessionSortKey: z.string().min(1),
});
