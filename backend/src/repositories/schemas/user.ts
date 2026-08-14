import { z } from "zod";
import type { UserData } from "../../models/user";

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email().lowercase(),
  mcpToken: z.string().min(1),
  transactionPatternsLimit: z.number().optional(),
  voiceInputLanguage: z.string().optional(),
  interfaceLanguage: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<UserData>;
