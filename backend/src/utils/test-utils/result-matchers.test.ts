import { describe, expect, it } from "vitest";
import { Failure, Success } from "../../types/result";

describe("result matchers", () => {
  describe("toEqualSuccess", () => {
    // Happy path

    it("passes when Success data matches", () => {
      expect(Success({ id: 1 })).toEqualSuccess({ id: 1 });
    });

    it("supports objectContaining", () => {
      expect(Success({ id: 1, name: "a" })).toEqualSuccess(
        expect.objectContaining({ id: 1 }),
      );
    });

    // Validation failures

    it("fails when Success data does not match", () => {
      // Arrange
      const subject = () =>
        expect(Success({ id: 1 })).toEqualSuccess({ id: 2 });

      // Act & Assert
      expect(subject).toThrow(/"id": 2/);
    });

    it("fails when actual is Failure", () => {
      // Arrange
      const subject = () => expect(Failure("boom")).toEqualSuccess({ id: 1 });

      // Act & Assert
      expect(subject).toThrow(/expected Success, got Failure/);
    });
  });

  describe("toEqualFailure", () => {
    // Happy path

    it("passes when Failure error matches", () => {
      expect(Failure("not found")).toEqualFailure("not found");
    });

    it("supports objectContaining", () => {
      expect(
        Failure({ code: "NOT_FOUND", details: "widget 1" }),
      ).toEqualFailure(expect.objectContaining({ code: "NOT_FOUND" }));
    });

    // Validation failures

    it("fails when Failure error does not match", () => {
      // Arrange
      const subject = () =>
        expect(Failure("not found")).toEqualFailure("other error");

      // Act & Assert
      expect(subject).toThrow(/other error/);
    });

    it("fails when actual is Success", () => {
      // Arrange
      const subject = () =>
        expect(Success({ id: 1 })).toEqualFailure("not found");

      // Act & Assert
      expect(subject).toThrow(/expected Failure, got Success/);
    });
  });
});
