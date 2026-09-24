import { describe, expect, it } from "vitest";
import { Failure, type Result, Success } from "../../types/result";

interface Data {
  id: number;
  name?: string;
}

function success(data: Data): Result<Data, string> {
  return Success(data);
}

function failure(error: string): Result<Data, string> {
  return Failure(error);
}

describe("toEqualSuccess", () => {
  it("passes when Success data matches", () => {
    expect(success({ id: 1 })).toEqualSuccess({ id: 1 });
  });

  it("supports asymmetric matchers", () => {
    expect(success({ id: 1, name: "a" })).toEqualSuccess(
      expect.objectContaining({ id: 1 }),
    );
  });

  it("fails when Success data does not match", () => {
    expect(() =>
      expect(success({ id: 1 })).toEqualSuccess({ id: 2 }),
    ).toThrow();
  });

  it("fails when actual is a Failure", () => {
    expect(() =>
      expect(failure("boom")).toEqualSuccess({ id: 1 }),
    ).toThrow(/expected Success, got Failure/);
  });

  it("negates with .not", () => {
    expect(failure("boom")).not.toEqualSuccess({ id: 1 });
    expect(success({ id: 1 })).not.toEqualSuccess({ id: 2 });
  });
});

describe("toEqualFailure", () => {
  it("passes when Failure error matches", () => {
    expect(failure("not found")).toEqualFailure("not found");
  });

  it("fails when Failure error does not match", () => {
    expect(() =>
      expect(failure("not found")).toEqualFailure("other error"),
    ).toThrow();
  });

  it("fails when actual is a Success", () => {
    expect(() =>
      expect(success({ id: 1 })).toEqualFailure("not found"),
    ).toThrow(/expected Failure, got Success/);
  });

  it("negates with .not", () => {
    expect(success({ id: 1 })).not.toEqualFailure("not found");
    expect(failure("not found")).not.toEqualFailure("other error");
  });
});
