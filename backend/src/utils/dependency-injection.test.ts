import { describe, expect, it, jest } from "@jest/globals";
import { createAsyncSingleton, createSingleton } from "./dependency-injection";

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

describe("createAsyncSingleton", () => {
  it("calls the factory only once across sequential awaits", async () => {
    const factory = jest.fn(async () => ({ value: 42 }));
    const resolve = createAsyncSingleton(factory);

    await resolve();
    await resolve();
    await resolve();

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("calls the factory only once for concurrent callers", async () => {
    const factory = jest.fn(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 10)),
    );
    const resolve = createAsyncSingleton(factory);

    await Promise.all([resolve(), resolve(), resolve()]);

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("returns the same instance on every call", async () => {
    const resolve = createAsyncSingleton(async () => ({ value: 42 }));

    expect(await resolve()).toBe(await resolve());
  });

  it("retries the factory after a rejection", async () => {
    const factory = jest
      .fn<() => Promise<{ value: number }>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ value: 42 });
    const resolve = createAsyncSingleton(factory);

    await expect(resolve()).rejects.toThrow("boom");
    await expect(resolve()).resolves.toEqual({ value: 42 });
    expect(factory).toHaveBeenCalledTimes(2);
  });
});
