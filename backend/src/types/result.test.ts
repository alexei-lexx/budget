import { describe, expect, it } from "vitest";
import { Failure, Success } from "./result";

class TestError extends Error {}

describe("Success", () => {
  it("creates success result with data", () => {
    expect(Success({ id: 1 })).toBeSuccess({ id: 1 });
  });

  describe("unwrapOrThrowAs", () => {
    it("returns data", () => {
      expect(Success({ id: 1 }).unwrapOrThrowAs(TestError)).toEqual({
        id: 1,
      });
    });
  });
});

describe("Failure", () => {
  it("creates failure result with error", () => {
    expect(Failure("not found")).toBeFailure("not found");
  });

  describe("unwrapOrThrowAs", () => {
    it("throws given exception class with error as message", () => {
      // Arrange
      const subject = () => Failure("not found").unwrapOrThrowAs(TestError);

      // Act & Assert
      expect(subject).toThrow(TestError);
      expect(subject).toThrow("not found");
    });
  });
});
