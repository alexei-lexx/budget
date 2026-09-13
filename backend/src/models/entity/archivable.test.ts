import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toDateTimeString } from "../../types/date-time-string";
import { ModelError } from "../model-error";
import { Archivable, ArchivableData } from "./archivable";
import { Entity } from "./entity";

interface TestData extends ArchivableData {
  id: string;
}

class TestEntity extends Archivable(Entity<TestData>) {
  get updatedAt() {
    return this.data.updatedAt;
  }

  protected assertInvariants(): void {
    // No invariants of its own.
  }
}

describe("Archivable", () => {
  describe("archive", () => {
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:11:12.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Happy path

    it("sets isArchived to true", () => {
      // Arrange
      const testEntity = TestEntity.fromPersistence({
        id: "id-1",
        isArchived: false,
        updatedAt: toDateTimeString("2000-01-01T00:00:00.000Z"),
      });

      // Act
      const result = testEntity.archive();

      // Assert
      expect(result).toBeInstanceOf(TestEntity);
      expect(result.isArchived).toBe(true);
    });

    it("sets updatedAt", () => {
      // Arrange
      const testEntity = TestEntity.fromPersistence({
        id: "id-1",
        isArchived: false,
        updatedAt: toDateTimeString("2000-01-01T00:00:00.000Z"),
      });

      // Act
      const result = testEntity.archive();

      // Assert
      expect(result.updatedAt).toBe("2000-01-02T10:11:12.000Z");
    });

    // Validation failures

    it("throws on already archived entity", () => {
      // Arrange
      const testEntity = TestEntity.fromPersistence({
        id: "id-1",
        isArchived: false,
        updatedAt: toDateTimeString("2000-01-01T00:00:00.000Z"),
      }).archive();

      // Act & Assert
      expect(() => testEntity.archive()).toThrow(
        new ModelError("Cannot modify an archived record"),
      );
    });
  });
});
