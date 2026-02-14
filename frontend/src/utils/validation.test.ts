import { checkRules, type CheckRule } from "./validation";

describe("checkRules", () => {
  it("should return true when all rules pass", () => {
    const rules: CheckRule<string>[] = [
      (value) => value.length > 0 || "Value is required",
      (value) => value.length < 10 || "Value is too long",
    ];

    const result = checkRules("hello", rules);

    expect(result).toBe(true);
  });

  it("should return false when any rule fails", () => {
    const rules: CheckRule<string>[] = [
      (value) => value.length > 0 || "Value is required",
      (value) => value.length < 5 || "Value is too long",
    ];

    const result = checkRules("hello world", rules);

    expect(result).toBe(false);
  });

  it("should return true when no rules are provided", () => {
    const rules: CheckRule<string>[] = [];

    const result = checkRules("any value", rules);

    expect(result).toBe(true);
  });

  it("should work with numeric values", () => {
    const rules: CheckRule<number>[] = [
      (value) => value > 0 || "Value must be positive",
      (value) => value < 100 || "Value must be less than 100",
    ];

    expect(checkRules(50, rules)).toBe(true);
    expect(checkRules(-5, rules)).toBe(false);
    expect(checkRules(150, rules)).toBe(false);
  });
});
