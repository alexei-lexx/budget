import { z } from "zod";
import { DESCRIPTION_MAX_LENGTH } from "../types/validation";

export function formatZodErrors(error: z.ZodError): string {
  return z.prettifyError(error);
}

/**
 * Minimum length required for search text inputs
 */
export const MIN_SEARCH_TEXT_LENGTH = 2;

export const amountSchema = z.number().positive("Amount must be positive");

export const dateSchema = z.iso.date("Date must be in YYYY-MM-DD format");

export const descriptionSchema = z
  .string()
  .max(
    DESCRIPTION_MAX_LENGTH,
    `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
  )
  .nullish();

export const searchTextSchema = z
  .string()
  .trim()
  .min(
    MIN_SEARCH_TEXT_LENGTH,
    `Search text must be at least ${MIN_SEARCH_TEXT_LENGTH} characters long`,
  );
