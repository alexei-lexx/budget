import { z } from "zod";
import type { AccountData } from "../../models/account";

export const accountDataSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string().min(1),
  currency: z.string().length(3).uppercase(),
  initialBalance: z.number(),
  isArchived: z.boolean(),
  version: z.int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<AccountData>;
