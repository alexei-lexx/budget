import { z } from "zod";

export function formatZodErrors(error: z.ZodError): string {
  return z.prettifyError(error);
}

/**
 * Minimum length required for search text inputs
 */
export const MIN_SEARCH_TEXT_LENGTH = 2;

export const amountSchema = z.number().positive("Amount must be positive");

export const dateSchema = z.iso.date("Date must be in YYYY-MM-DD format");

export const searchTextSchema = z
  .string()
  .trim()
  .min(
    MIN_SEARCH_TEXT_LENGTH,
    `Search text must be at least ${MIN_SEARCH_TEXT_LENGTH} characters long`,
  );
