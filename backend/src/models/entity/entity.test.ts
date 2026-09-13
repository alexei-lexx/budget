import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { ModelError } from "../model-error";
import { Entity } from "./entity";

interface TestData {
  id: string;
  label: string;
}

class TestEntity extends Entity<TestData> implements TestData {
  get id() {
    return this.data.id;
  }

  get label() {
    return this.data.label;
  }

  static create(
    label: string,
    { idGenerator = faker.string.uuid }: { idGenerator?: () => string } = {},
  ): TestEntity {
    return new TestEntity({ id: idGenerator(), label });
  }

  protected assertInvariants(): void {
    if (this.label.length === 0) {
      throw new ModelError("label must not be empty");
    }
  }
}

describe("Entity", () => {
  describe("toData", () => {
    // Happy path

    it("returns plain object with all data fields", () => {
      // Arrange
      const fixture = TestEntity.create("a", { idGenerator: () => "id-1" });

      // Act & Assert
      expect(fixture.toData()).toEqual({ id: "id-1", label: "a" });
    });
  });

  describe("fromPersistence", () => {
    // Happy path

    it("reconstructs instance of concrete subclass", () => {
      // Arrange
      const data = TestEntity.create("a").toData();

      // Act
      const result = TestEntity.fromPersistence(data);

      // Assert
      expect(result).toBeInstanceOf(TestEntity);
      expect(result.toData()).toEqual(data);
    });

    // Validation failures

    it("enforces subclass's own invariants", () => {
      // Arrange
      const data = { id: "id-1", label: "" };

      // Act & Assert
      expect(() => TestEntity.fromPersistence(data)).toThrow(
        new ModelError("label must not be empty"),
      );
    });
  });
});
