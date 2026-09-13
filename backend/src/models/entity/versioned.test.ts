import { describe, expect, it } from "vitest";
import { ModelError } from "../model-error";
import { Entity } from "./entity";
import { Versioned, VersionedData } from "./versioned";

// Minimal concrete entity used only to exercise Versioned in isolation,
// with no other mixin applied.
interface TestData extends VersionedData {
  id: string;
}

class TestEntity extends Versioned(Entity<TestData>) {
  protected assertInvariants(): void {
    if (this.data.id.length === 0) {
      throw new ModelError("id must not be empty");
    }
  }
}

describe("Versioned", () => {
  describe("nextVersion", () => {
    // Happy path

    it("returns version incremented by 1", () => {
      // Arrange
      const testEntity = TestEntity.fromPersistence({
        id: "id-1",
        version: 4,
      });

      // Act & Assert
      expect(testEntity.nextVersion()).toBe(5);
    });
  });

  describe("bumpVersion", () => {
    // Happy path

    it("increments version by 1 and preserves other fields", () => {
      // Arrange
      const testEntity = TestEntity.fromPersistence({
        id: "id-1",
        version: 4,
      });

      // Act
      const result = testEntity.bumpVersion();

      // Assert
      expect(result).toBeInstanceOf(TestEntity);
      expect(result.toData()).toEqual({ ...testEntity.toData(), version: 5 });
    });

    it("does not re-validate invariants", () => {
      // Arrange
      // Bypass invariants to construct a state
      // that assertInvariants would reject.
      const testEntity = new TestEntity(
        { id: "", version: 4 },
        { skipInvariants: true },
      );

      // Act & Assert
      expect(() => testEntity.bumpVersion()).not.toThrow();
    });
  });
});
