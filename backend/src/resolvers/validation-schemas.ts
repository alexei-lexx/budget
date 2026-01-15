import { z } from "zod";
export {
  amountSchema,
  dateSchema,
  descriptionSchema,
} from "../services/validation-schemas";

export const accountIdSchema = z.uuid({
  message: "Account ID must be a valid UUID",
});
