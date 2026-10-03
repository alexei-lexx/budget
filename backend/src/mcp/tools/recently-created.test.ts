import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toDateTimeString } from "../../types/date-time-string";
import { isRecentlyCreated } from "./recently-created";

describe("isRecentlyCreated", () => {
  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true when created less than one hour ago", () => {
    expect(
      isRecentlyCreated(toDateTimeString("2000-01-02T09:30:00.000Z")),
    ).toBe(true);
  });

  it("returns true when created exactly one hour ago", () => {
    expect(
      isRecentlyCreated(toDateTimeString("2000-01-02T09:00:00.000Z")),
    ).toBe(true);
  });

  it("returns false when created more than one hour ago", () => {
    expect(
      isRecentlyCreated(toDateTimeString("2000-01-02T08:59:59.999Z")),
    ).toBe(false);
  });
});
