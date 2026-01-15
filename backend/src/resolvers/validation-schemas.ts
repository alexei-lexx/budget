import { z } from "zod";
import { DESCRIPTION_MAX_LENGTH } from "../types/validation";
export { dateSchema, amountSchema } from "../services/validation-schemas";

export const accountIdSchema = z.uuid({
  message: "Account ID must be a valid UUID",
});

export const descriptionSchema = z
  .string()
  .max(
    DESCRIPTION_MAX_LENGTH,
    `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
  )
  .nullish();
