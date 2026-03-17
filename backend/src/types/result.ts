export type Result<TData, TError = string> =
  | { success: true; data: TData }
  | { success: false; error: TError };

export function Success<TData>(data: TData): Result<TData> {
  return { success: true, data };
}

export function Failure<TData, TError = string>(
  error: TError,
): Result<TData, TError> {
  return { success: false, error };
}
