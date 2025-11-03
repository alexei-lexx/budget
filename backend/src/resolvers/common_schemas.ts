import z from "zod";
import {
  DATE_FORMAT_ERROR_MESSAGE,
  DATE_FORMAT_REGEX,
  DESCRIPTION_LENGTH_ERROR_MESSAGE,
  DESCRIPTION_MAX_LENGTH,
} from "../types/validation";

export const accountIdSchema = z.uuid({
  message: "Account ID must be a valid UUID",
});

export const categoryIdSchema = z.uuid({
  message: "Category ID must be a valid UUID",
});

export const dateSchema = z
  .string()
  .regex(DATE_FORMAT_REGEX, DATE_FORMAT_ERROR_MESSAGE);
export const descriptionSchema = z
  .string()
  .max(DESCRIPTION_MAX_LENGTH, DESCRIPTION_LENGTH_ERROR_MESSAGE)
  .nullish();
