class SuccessResult<TData> {
  public success = true as const;

  constructor(public data: TData) {}

  unwrapOrThrowAs() {
    return this.data;
  }
}

class FailureResult<TError> {
  public success = false as const;

  constructor(public error: TError) {}

  unwrapOrThrowAs<TThrowable extends Error>(
    exceptionClass: new (error: TError) => TThrowable,
  ): never {
    throw new exceptionClass(this.error);
  }
}

export type Result<TData, TError = string> =
  SuccessResult<TData> | FailureResult<TError>;

export function Success<TData>(data: TData): Result<TData, never> {
  return new SuccessResult(data);
}

export function Failure<TError = string>(error: TError): Result<never, TError> {
  return new FailureResult(error);
}
