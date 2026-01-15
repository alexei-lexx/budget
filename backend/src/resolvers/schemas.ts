import { z } from "zod";
import { DESCRIPTION_MAX_LENGTH } from "../types/validation";

export const accountIdSchema = z.uuid({
  message: "Account ID must be a valid UUID",
});

export const amountSchema = z.number().positive("Amount must be positive");

export const dateSchema = z.iso.date("Date must be in YYYY-MM-DD format");

export const descriptionSchema = z
  .string()
  .max(
    DESCRIPTION_MAX_LENGTH,
    `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
  )
  .nullish();
