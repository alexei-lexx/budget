import { z } from "zod";
export {
  amountSchema,
  dateSchema,
  descriptionSchema,
} from "../services/validation-schemas";

export const nonEmptyStringSchema = z.string().min(1);
