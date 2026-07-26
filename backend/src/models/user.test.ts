import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fakeCreateUserInput,
  fakeUser,
} from "../utils/test-utils/models/user-fakes";
import { ModelError } from "./model-error";
import { User } from "./user";

describe("User", () => {
  describe("create", () => {
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:11:12.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Happy path

    it("builds user with all fields populated", () => {
      // Act
      const result = User.create(
        fakeCreateUserInput({ email: "user@example.com" }),
        { idGenerator: () => "fixed-uuid" },
      );

      // Assert
      expect(result.toData()).toEqual({
        id: "fixed-uuid",
        email: "user@example.com",
        transactionPatternsLimit: undefined,
        voiceInputLanguage: undefined,
        createdAt: "2000-01-02T10:11:12.000Z",
        updatedAt: "2000-01-02T10:11:12.000Z",
      });
    });

    it("normalizes email to lowercase", () => {
      // Act
      const result = User.create(
        fakeCreateUserInput({ email: "Test.Email@EXAMPLE.COM" }),
      );

      // Assert
      expect(result.email).toBe("test.email@example.com");
    });

    it("trims whitespace from email", () => {
      // Act
      const result = User.create(
        fakeCreateUserInput({ email: "  user@example.com  " }),
      );

      // Assert
      expect(result.email).toBe("user@example.com");
    });

    it("uses default id generator when options omitted", () => {
      // Act
      const result = User.create(fakeCreateUserInput());

      // Assert
      expect(result.id).toBeDefined();
    });

    // Validation failures

    it("throws on empty email", () => {
      // Act & Assert
      expect(() => User.create(fakeCreateUserInput({ email: "" }))).toThrow(
        ModelError,
      );
    });

    it("throws on malformed email", () => {
      // Act & Assert
      expect(() =>
        User.create(fakeCreateUserInput({ email: "not-an-email" })),
      ).toThrow(ModelError);
    });
  });

  describe("fromPersistence", () => {
    // Happy path

    it("reconstructs instance from data", () => {
      // Arrange
      const data = fakeUser().toData();

      // Act
      const result = User.fromPersistence(data);

      // Assert
      expect(result.toData()).toEqual(data);
    });

    // Validation failures

    it("throws on malformed email", () => {
      // Arrange
      const data = { ...fakeUser().toData(), email: "not-an-email" };

      // Act & Assert
      expect(() => User.fromPersistence(data)).toThrow(ModelError);
    });

    it("throws when transactionPatternsLimit is negative", () => {
      // Arrange
      const data = {
        ...fakeUser().toData(),
        transactionPatternsLimit: -1,
      };

      // Act & Assert
      expect(() => User.fromPersistence(data)).toThrow(
        new ModelError("Transaction patterns limit must be a non-negative integer"),
      );
    });
  });

  describe("toData", () => {
    // Happy path

    it("returns plain object with all data fields", () => {
      // Arrange
      const data = fakeUser().toData();
      const user = User.fromPersistence(data);

      // Act & Assert
      expect(user.toData()).toEqual(data);
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

    it("sets transactionPatternsLimit", () => {
      // Arrange
      const existing = fakeUser({ transactionPatternsLimit: 3 });

      // Act
      const result = existing.update({ transactionPatternsLimit: 7 });

      // Assert
      expect(result.transactionPatternsLimit).toBe(7);
    });

    it("sets voiceInputLanguage", () => {
      // Arrange
      const existing = fakeUser({ voiceInputLanguage: "en-US" });

      // Act
      const result = existing.update({ voiceInputLanguage: "de-DE" });

      // Assert
      expect(result.voiceInputLanguage).toBe("de-DE");
    });

    it("keeps fields when input is empty", () => {
      // Arrange
      const existing = fakeUser({
        transactionPatternsLimit: 5,
        voiceInputLanguage: "pl-PL",
      });

      // Act
      const result = existing.update({});

      // Assert
      expect(result.transactionPatternsLimit).toBe(5);
      expect(result.voiceInputLanguage).toBe("pl-PL");
    });

    it("preserves id, email, createdAt", () => {
      // Arrange
      const existing = fakeUser({
        id: "id-1",
        email: "user@example.com",
        createdAt: "1999-01-01T00:00:00.000Z",
      });

      // Act
      const result = existing.update({ voiceInputLanguage: "de-DE" });

      // Assert
      expect(result.id).toBe("id-1");
      expect(result.email).toBe("user@example.com");
      expect(result.createdAt).toBe("1999-01-01T00:00:00.000Z");
    });

    it("sets updatedAt", () => {
      // Arrange
      const existing = fakeUser();

      // Act
      const result = existing.update({ voiceInputLanguage: "de-DE" });

      // Assert
      expect(result.updatedAt).toBe("2000-01-02T10:11:12.000Z");
    });

    // Validation failures

    it("throws when transactionPatternsLimit is negative", () => {
      // Act & Assert
      expect(() =>
        fakeUser().update({ transactionPatternsLimit: -1 }),
      ).toThrow(
        new ModelError("Transaction patterns limit must be a non-negative integer"),
      );
    });

    it("throws when transactionPatternsLimit is not an integer", () => {
      // Act & Assert
      expect(() =>
        fakeUser().update({ transactionPatternsLimit: 2.5 }),
      ).toThrow(
        new ModelError("Transaction patterns limit must be a non-negative integer"),
      );
    });
  });
});
