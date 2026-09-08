import { faker } from "@faker-js/faker";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toDateTimeString } from "../types/date-time-string";
import {
  fakeCategory,
  fakeCreateCategoryInput,
} from "../utils/test-utils/models/category-fakes";
import { Category, CategoryType, NAME_MAX_LENGTH } from "./category";
import { ModelError } from "./model-error";

describe("Category", () => {
  describe("create", () => {
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:11:12.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Happy path

    it("builds category with all fields populated", () => {
      // Arrange
      const userId = faker.string.uuid();
      const input = fakeCreateCategoryInput({
        userId,
        name: "Groceries",
        type: CategoryType.EXPENSE,
        excludeFromReports: false,
      });

      // Act
      const result = Category.create(input, {
        idGenerator: () => "fixed-uuid",
      });

      // Assert
      expect(result.toData()).toEqual({
        id: "fixed-uuid",
        userId,
        name: "Groceries",
        type: CategoryType.EXPENSE,
        excludeFromReports: false,
        isArchived: false,
        createdAt: "2000-01-02T10:11:12.000Z",
        updatedAt: "2000-01-02T10:11:12.000Z",
      });
    });

    it("trims name", () => {
      // Act
      const result = Category.create(
        fakeCreateCategoryInput({ name: "  Groceries  " }),
      );

      // Assert
      expect(result.name).toBe("Groceries");
    });

    it("uses default id generator when options omitted", () => {
      // Act
      const result = Category.create(fakeCreateCategoryInput());

      // Assert
      expect(result.id).toBeDefined();
    });

    // Validation failures

    it("throws when name is empty", () => {
      // Act & Assert
      expect(() =>
        Category.create(fakeCreateCategoryInput({ name: "" })),
      ).toThrow(ModelError);
    });

    it("throws when name exceeds maximum length", () => {
      // Arrange
      const tooLong = "a".repeat(NAME_MAX_LENGTH + 1);

      // Act & Assert
      expect(() =>
        Category.create(fakeCreateCategoryInput({ name: tooLong })),
      ).toThrow(ModelError);
    });
  });

  describe("fromPersistence", () => {
    // Happy path

    it("reconstructs instance from data", () => {
      // Arrange
      const data = fakeCategory().toData();

      // Act
      const result = Category.fromPersistence(data);

      // Assert
      expect(result.toData()).toEqual(data);
    });

    // Validation failures

    it("throws on invalid name", () => {
      // Arrange
      const data = { ...fakeCategory().toData(), name: "" };

      // Act & Assert
      expect(() => Category.fromPersistence(data)).toThrow(ModelError);
    });
  });

  describe("toData", () => {
    // Happy path

    it("returns plain object with all data fields", () => {
      // Arrange
      const data = fakeCategory().toData();
      const category = Category.fromPersistence(data);

      // Act & Assert
      expect(category.toData()).toEqual(data);
    });
  });

  describe("update", () => {
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:11:12.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Happy path

    it("sets name", () => {
      // Arrange
      const existing = fakeCategory({ name: "Groceries" });

      // Act
      const result = existing.update({ name: "Utilities" });

      // Assert
      expect(result.name).toBe("Utilities");
    });

    it("sets type", () => {
      // Arrange
      const existing = fakeCategory({ type: CategoryType.EXPENSE });

      // Act
      const result = existing.update({ type: CategoryType.INCOME });

      // Assert
      // Preserves existing behavior: type changes are not blocked on update.
      expect(result.type).toBe(CategoryType.INCOME);
    });

    it("sets excludeFromReports", () => {
      // Arrange
      const existing = fakeCategory({ excludeFromReports: false });

      // Act
      const result = existing.update({ excludeFromReports: true });

      // Assert
      expect(result.excludeFromReports).toBe(true);
    });

    it("trims name", () => {
      // Act
      const result = fakeCategory().update({ name: "  Utilities  " });

      // Assert
      expect(result.name).toBe("Utilities");
    });

    it("keeps fields when input is empty", () => {
      // Arrange
      const existing = fakeCategory();

      // Act
      const result = existing.update({});

      // Assert
      expect(result.name).toBe(existing.name);
      expect(result.type).toBe(existing.type);
      expect(result.excludeFromReports).toBe(existing.excludeFromReports);
    });

    it("preserves id, userId, isArchived, createdAt", () => {
      // Arrange
      const existing = fakeCategory({
        id: "id-1",
        userId: "user-1",
        isArchived: false,
        createdAt: toDateTimeString("1999-01-01T00:00:00.000Z"),
      });

      // Act
      const result = existing.update({ name: "Utilities" });

      // Assert
      expect(result.id).toBe("id-1");
      expect(result.userId).toBe("user-1");
      expect(result.isArchived).toBe(false);
      expect(result.createdAt).toBe("1999-01-01T00:00:00.000Z");
    });

    it("sets updatedAt", () => {
      // Arrange
      const existing = fakeCategory();

      // Act
      const result = existing.update({ name: "Utilities" });

      // Assert
      expect(result.updatedAt).toBe("2000-01-02T10:11:12.000Z");
    });

    // Validation failures

    it("throws on updating archived category", () => {
      // Arrange
      const existing = fakeCategory({ isArchived: true });

      // Act & Assert
      expect(() => existing.update({ name: "Utilities" })).toThrow(
        new ModelError("Cannot update archived category"),
      );
    });

    it("throws when name is empty", () => {
      // Act & Assert
      expect(() => fakeCategory().update({ name: "" })).toThrow(ModelError);
    });

    it("throws when name exceeds maximum length", () => {
      // Arrange
      const tooLong = "a".repeat(NAME_MAX_LENGTH + 1);

      // Act & Assert
      expect(() => fakeCategory().update({ name: tooLong })).toThrow(
        ModelError,
      );
    });
  });

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
      const existing = fakeCategory({ isArchived: false });

      // Act
      const result = existing.archive();

      // Assert
      expect(result.isArchived).toBe(true);
    });

    it("sets updatedAt", () => {
      // Arrange
      const existing = fakeCategory();

      // Act
      const result = existing.archive();

      // Assert
      expect(result.updatedAt).toBe("2000-01-02T10:11:12.000Z");
    });

    // Validation failures

    it("throws on already archived category", () => {
      // Arrange
      const existing = fakeCategory({ isArchived: true });

      // Act & Assert
      expect(() => existing.archive()).toThrow(
        new ModelError("Cannot archive archived category"),
      );
    });
  });
});
