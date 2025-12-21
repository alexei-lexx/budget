import { describe, expect, it } from "@jest/globals";
import { formatDateAsYYYYMMDD } from "./date";

describe("date utilities", () => {
  describe("formatDateAsYYYYMMDD", () => {
    it("should format date correctly", () => {
      const date = new Date(Date.UTC(2000, 0, 5)); // January 5, 2000
      expect(formatDateAsYYYYMMDD(date)).toBe("2000-01-05");
    });
  });
});
