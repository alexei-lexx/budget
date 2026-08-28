import { z } from "zod";
import {
  LOOKBACK_MAX,
  LOOKBACK_MIN,
  type StarredTrendData,
} from "../../models/starred-trend";
import { toDateTimeString } from "../../types/date-time-string";

export const starredTrendDataSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  periodUnit: z.enum(["MONTH", "WEEK"]),
  lookback: z.int().min(LOOKBACK_MIN).max(LOOKBACK_MAX),
  currency: z.string().min(1),
  categoryIds: z.array(z.uuid()),
  includeUncategorized: z.boolean(),
  createdAt: z.iso.datetime().transform(toDateTimeString),
}) satisfies z.ZodType<StarredTrendData>;
