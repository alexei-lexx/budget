class SuccessResult<TData> {
  public readonly success = true as const;

  constructor(public readonly data: TData) {}

  map<TNewData>(callback: (data: TData) => TNewData): SuccessResult<TNewData> {
    return new SuccessResult(callback(this.data));
  }

  unwrapOrThrowAs<TThrowable extends Error>(
    _throwableClass: new (error: never) => TThrowable,
  ) {
    return this.data;
  }
}

class FailureResult<TError> {
  public readonly success = false as const;

  constructor(public readonly error: TError) {}

  map<TNewData>(_callback: (data: never) => TNewData): FailureResult<TError> {
    return this;
  }

  unwrapOrThrowAs<TThrowable extends Error>(
    throwableClass: new (error: TError) => TThrowable,
  ): never {
    throw new throwableClass(this.error);
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

export const Result = {
  fromThrowable<TData, TThrowable extends Error>(
    throwableClass: new (...args: never[]) => TThrowable,
    throwableFunc: () => TData,
  ): Result<TData, string> {
    try {
      return Success(throwableFunc());
    } catch (error) {
      if (error instanceof throwableClass) {
        return Failure(error.message);
      }

      throw error;
    }
  },
};
