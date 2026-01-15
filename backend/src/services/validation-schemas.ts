import { z } from "zod";

/**
 * Minimum length required for search text inputs
 */
export const MIN_SEARCH_TEXT_LENGTH = 2;

export const searchTextSchema = z
  .string()
  .trim()
  .min(
    MIN_SEARCH_TEXT_LENGTH,
    `Search text must be at least ${MIN_SEARCH_TEXT_LENGTH} characters long`,
  );
