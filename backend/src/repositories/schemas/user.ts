import { z } from "zod";
import type { User } from "../../models/user";

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email().lowercase(),
  transactionPatternsLimit: z.number().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<User>;
