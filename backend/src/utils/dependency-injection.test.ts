import { describe, expect, it, jest } from "@jest/globals";
import { createSingleton } from "./dependency-injection";

describe("createSingleton", () => {
  it("calls the factory only once", () => {
    const factory = jest.fn(() => ({ value: 42 }));
    const resolve = createSingleton(factory);

    resolve();
    resolve();
    resolve();

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("returns the same instance on every call", () => {
    const resolve = createSingleton(() => ({ value: 42 }));

    expect(resolve()).toBe(resolve());
  });

  it("calls the factory only once when it returns null", () => {
    const factory = jest.fn(() => null);
    const resolve = createSingleton(factory);

    resolve();
    resolve();

    expect(factory).toHaveBeenCalledTimes(1);
  });
});
