import { z } from "zod";
import {
  TELEGRAM_BOT_STATUSES,
  TelegramBotData,
} from "../../models/telegram-bot";
import { toDateTimeString } from "../../types/date-time-string";

export const telegramBotSchema = z.object({
  id: z.uuid(),
  userId: z.string().min(1),
  token: z.string().min(1),
  webhookSecret: z.uuid(),
  status: z.enum(TELEGRAM_BOT_STATUSES),
  isArchived: z.boolean(),
  createdAt: z.iso.datetime().transform(toDateTimeString),
  updatedAt: z.iso.datetime().transform(toDateTimeString),
}) satisfies z.ZodType<TelegramBotData>;
