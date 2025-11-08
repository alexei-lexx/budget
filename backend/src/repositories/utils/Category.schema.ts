import { z } from "zod";
import type { Category } from "../../models/Category";
import { CategoryType } from "../../models/Category";

export const categorySchema = z.object({
  userId: z.uuid(),
  id: z.uuid(),
  name: z.string().min(1),
  type: z.enum(CategoryType),
  isArchived: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<Category>;

export type { Category, CategoryType };
