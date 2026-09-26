import { ModelError } from "../models/model-error";
import { InvalidDateStringError } from "../types/date-string";
import { InvalidDateTimeStringError } from "../types/date-time-string";
import { Failure, Result, Success } from "../types/result";

type UserFacingError =
  InvalidDateStringError | InvalidDateTimeStringError | ModelError;

// User-facing: domain invariant violations and input format errors
// carry messages safe to show directly to the user
export function isUserFacingError(error: unknown): error is UserFacingError {
  return (
    error instanceof InvalidDateStringError ||
    error instanceof InvalidDateTimeStringError ||
    error instanceof ModelError
  );
}

export function catchModelError<TData>(
  throwableFunc: () => TData,
): Result<TData, string> {
  try {
    return Success(throwableFunc());
  } catch (error) {
    if (error instanceof ModelError) {
      return Failure(error.message);
    }

    throw error;
  }
}
