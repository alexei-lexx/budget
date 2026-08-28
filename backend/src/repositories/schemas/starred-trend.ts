import { z } from "zod";
import type { StarredTrendData } from "../../models/starred-trend";
import { toDateTimeString } from "../../types/date-time-string";

export const starredTrendDataSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  periodUnit: z.enum(["MONTH", "WEEK"]),
  lookback: z.int().min(1).max(12),
  currency: z.string().min(1),
  categoryIds: z.array(z.uuid()),
  includeUncategorized: z.boolean(),
  createdAt: z.iso.datetime({ precision: 3 }).transform(toDateTimeString),
}) satisfies z.ZodType<StarredTrendData>;
