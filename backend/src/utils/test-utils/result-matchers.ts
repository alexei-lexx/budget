import { expect } from "vitest";
import type { Result } from "../../types/result";

expect.extend({
  toEqualSuccess(received: Result<unknown, unknown>, expected: unknown) {
    if (!received.success) {
      return {
        pass: false,
        message: () =>
          `expected Success, got Failure(${JSON.stringify(received.error)})`,
      };
    }
    const pass = this.equals(received.data, expected);
    return {
      pass,
      message: () => this.utils.diff(expected, received.data) ?? "",
    };
  },

  toEqualFailure(received: Result<unknown, unknown>, expected: unknown) {
    if (received.success) {
      return {
        pass: false,
        message: () =>
          `expected Failure, got Success(${JSON.stringify(received.data)})`,
      };
    }
    const pass = this.equals(received.error, expected);
    return {
      pass,
      message: () => this.utils.diff(expected, received.error) ?? "",
    };
  },
});

declare module "vitest" {
  interface Matchers<R, T> {
    toEqualSuccess: T extends Result<infer TData, unknown>
      ? (data: TData) => R
      : never;
    toEqualFailure: T extends Result<unknown, infer TError>
      ? (error: TError) => R
      : never;
  }
}
