export type Result<TData, TError = string> =
  | { success: true; data: TData }
  | { success: false; error: TError };

export function Success<TData>(data: TData): Result<TData, never> {
  return { success: true, data };
}

export function Failure<TError = string>(error: TError): Result<never, TError> {
  return { success: false, error };
}
