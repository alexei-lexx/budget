import { z } from "zod";
import { MAX_PAGE_SIZE, MIN_PAGE_SIZE } from "../types/pagination";
import { DESCRIPTION_MAX_LENGTH } from "../types/validation";

/**
 * Reusable schema components
 */

export const accountIdSchema = z.uuid({
  message: "Account ID must be a valid UUID",
});
export const idSchema = z.uuid({ message: "ID must be a valid UUID" });
export const amountSchema = z.number().positive("Amount must be positive");
export const dateSchema = z.iso.date("Date must be in YYYY-MM-DD format");

export const descriptionSchema = z
  .string()
  .max(
    DESCRIPTION_MAX_LENGTH,
    `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
  )
  .nullish();

export const paginationInputSchema = z
  .object({
    first: z
      .number()
      .int()
      .min(MIN_PAGE_SIZE, `First must be at least ${MIN_PAGE_SIZE}`)
      .max(MAX_PAGE_SIZE, `First cannot exceed ${MAX_PAGE_SIZE}`)
      .optional(),
    after: z.string().optional(),
  })
  .optional();
