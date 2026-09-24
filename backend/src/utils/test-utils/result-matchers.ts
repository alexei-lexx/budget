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
    // expect(Failure(x)).toEqualSuccess(y) must still typecheck.
    // TData would otherwise be never for a Failure,
    // rejecting any expected value.
    toEqualSuccess: T extends Result<infer TData, unknown>
      ? (data: [TData] extends [never] ? unknown : TData) => R
      : never;
    // expect(Success(x)).toEqualFailure(y) must still typecheck.
    // TError would otherwise be never for a Success,
    // rejecting any expected value.
    toEqualFailure: T extends Result<unknown, infer TError>
      ? (error: [TError] extends [never] ? unknown : TError) => R
      : never;
  }
}
