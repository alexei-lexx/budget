import { z } from "zod";
import { TelegramBot, TelegramBotStatus } from "../../models/telegram-bot";

export const telegramBotSchema = z.object({
  id: z.uuid(),
  userId: z.string().min(1),
  token: z.string().min(1),
  webhookSecret: z.uuid(),
  status: z.enum(TelegramBotStatus),
  isArchived: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<TelegramBot>;
