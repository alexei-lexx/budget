import { z } from "zod";
import type { CategoryData } from "../../models/category";
import { CategoryType } from "../../models/category";
import { toDateTimeString } from "../../types/date-time-string";

export const categoryDataSchema = z.object({
  userId: z.uuid(),
  id: z.uuid(),
  name: z.string().min(1),
  type: z.enum(CategoryType),
  excludeFromReports: z.boolean(),
  isArchived: z.boolean(),
  createdAt: z.iso.datetime().transform(toDateTimeString),
  updatedAt: z.iso.datetime().transform(toDateTimeString),
}) satisfies z.ZodType<CategoryData>;
