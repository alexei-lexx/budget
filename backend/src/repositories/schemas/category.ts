import { z } from "zod";
import type { Category } from "../../models/category";
import { CategoryType } from "../../models/category";

export const categorySchema = z.object({
  userId: z.uuid(),
  id: z.uuid(),
  name: z.string().min(1),
  type: z.enum(CategoryType),
  isArchived: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<Category>;
