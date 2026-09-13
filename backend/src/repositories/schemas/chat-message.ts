import { z } from "zod";
import { CHAT_MESSAGE_ROLES, ChatMessageData } from "../../models/chat-message";
import { toDateTimeString } from "../../types/date-time-string";

export const chatMessageSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  sessionId: z.string().min(1),
  role: z.enum(CHAT_MESSAGE_ROLES),
  content: z.string(),
  createdAt: z.iso.datetime().transform(toDateTimeString),
  expiresAt: z.int().positive(),
}) satisfies z.ZodType<ChatMessageData>;

export const chatMessageDbItemSchema = chatMessageSchema.extend({
  sessionSortKey: z.string().min(1),
});
