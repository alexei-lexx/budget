import { z } from "zod";
import {
  LOOKBACK_MAX,
  LOOKBACK_MIN,
  type TrendPresetData,
} from "../../models/trend-preset";
import { toDateTimeString } from "../../types/date-time-string";
import { currencySchema } from "./currency";

export const trendPresetDataSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  periodUnit: z.enum(["MONTH", "WEEK"]),
  lookback: z.int().min(LOOKBACK_MIN).max(LOOKBACK_MAX),
  currency: currencySchema,
  categoryIds: z.array(z.uuid()),
  includeUncategorized: z.literal(true).optional(),
  createdAt: z.iso.datetime().transform(toDateTimeString),
}) satisfies z.ZodType<TrendPresetData>;
