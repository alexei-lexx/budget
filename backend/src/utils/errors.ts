import { ModelError } from "../models/model-error";
import { BusinessError } from "../services/business-error";
import { InvalidDateStringError } from "../types/date-string";
import { InvalidDateTimeStringError } from "../types/date-time-string";

type UserFacingError =
  | BusinessError
  | InvalidDateStringError
  | InvalidDateTimeStringError
  | ModelError;

// User-facing: business rule violations, domain invariant violations, and
// input format errors carry messages safe to show directly to the user
export function isUserFacingError(error: unknown): error is UserFacingError {
  return (
    error instanceof BusinessError ||
    error instanceof InvalidDateStringError ||
    error instanceof InvalidDateTimeStringError ||
    error instanceof ModelError
  );
}
