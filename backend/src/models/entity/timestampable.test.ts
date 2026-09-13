import { describe, expect, it } from "vitest";
import { toDateTimeString } from "../../types/date-time-string";
import { Entity } from "./entity";
import { Timestampable, TimestampedData } from "./timestampable";

class TestEntity extends Timestampable(Entity<TimestampedData>) {
  protected assertInvariants(): void {
    // No invariants of its own.
  }
}

describe("Timestampable", () => {
  describe("createdAt", () => {
    // Happy path

    it("returns createdAt from data", () => {
      // Arrange
      const testEntity = TestEntity.fromPersistence({
        createdAt: toDateTimeString("2000-01-02T10:11:12.000Z"),
        updatedAt: toDateTimeString("2000-01-02T15:16:17.000Z"),
      });

      // Act & Assert
      expect(testEntity.createdAt).toBe("2000-01-02T10:11:12.000Z");
    });
  });

  describe("updatedAt", () => {
    // Happy path

    it("returns updatedAt from data", () => {
      // Arrange
      const testEntity = TestEntity.fromPersistence({
        createdAt: toDateTimeString("2000-01-02T10:11:12.000Z"),
        updatedAt: toDateTimeString("2000-01-02T15:16:17.000Z"),
      });

      // Act & Assert
      expect(testEntity.updatedAt).toBe("2000-01-02T15:16:17.000Z");
    });
  });
});
