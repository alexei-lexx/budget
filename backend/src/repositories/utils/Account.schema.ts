import { z } from "zod";
import type { Account } from "../../models/Account";

export const accountSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string().min(1),
  currency: z.string().length(3).uppercase(),
  initialBalance: z.number(),
  isArchived: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<Account>;
