import { z } from "zod";
import type { UserData } from "../../models/user";

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email().lowercase(),
  mcpToken: z.string().min(1),
  interfaceLanguage: z.string().min(1).optional(),
  transactionPatternsLimit: z.number().optional(),
  voiceInputLanguage: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<UserData>;
