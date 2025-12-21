import { z } from "zod";
import type { User } from "../../models/user";

export const userSchema = z.object({
  id: z.uuid(),
  auth0UserId: z.string().min(1),
  email: z.email().lowercase(),
  transactionPatternsLimit: z.number().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<User>;
