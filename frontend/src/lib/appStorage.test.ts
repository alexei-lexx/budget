import { appStorage } from "./appStorage";

describe("appStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getItem", () => {
    // Happy path

    it("reads value stored under prefixed key", () => {
      // Arrange
      localStorage.setItem("budget:foo", "bar");

      // Act
      const result = appStorage.getItem("foo");

      // Assert
      expect(result).toBe("bar");
    });

    it("returns null when key is absent", () => {
      // Act
      const result = appStorage.getItem("missing");

      // Assert
      expect(result).toBeNull();
    });

    it("ignores unprefixed key with same name", () => {
      // Arrange
      // Simulates legacy data written before wrapper existed
      localStorage.setItem("foo", "legacy");

      // Act
      const result = appStorage.getItem("foo");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("setItem", () => {
    // Happy path

    it("writes value under prefixed key", () => {
      // Act
      appStorage.setItem("foo", "bar");

      // Assert
      expect(localStorage.getItem("budget:foo")).toBe("bar");
      expect(localStorage.getItem("foo")).toBeNull();
    });

    it("overwrites existing value under same key", () => {
      // Arrange
      appStorage.setItem("foo", "first");

      // Act
      appStorage.setItem("foo", "second");

      // Assert
      expect(appStorage.getItem("foo")).toBe("second");
    });
  });

  describe("removeItem", () => {
    // Happy path

    it("deletes prefixed key", () => {
      // Arrange
      appStorage.setItem("foo", "bar");

      // Act
      appStorage.removeItem("foo");

      // Assert
      expect(appStorage.getItem("foo")).toBeNull();
    });

    it("does nothing when key is absent", () => {
      // Act & Assert
      expect(() => appStorage.removeItem("missing")).not.toThrow();
    });
  });

  describe("clearAll", () => {
    // Happy path

    it("removes all prefixed keys", () => {
      // Arrange
      appStorage.setItem("one", "1");
      appStorage.setItem("two", "2");
      appStorage.setItem("three", "3");

      // Act
      appStorage.clearAll();

      // Assert
      expect(appStorage.getItem("one")).toBeNull();
      expect(appStorage.getItem("two")).toBeNull();
      expect(appStorage.getItem("three")).toBeNull();
    });

    it("preserves keys without prefix", () => {
      // Arrange
      localStorage.setItem("other", "keep-me");
      appStorage.setItem("foo", "wipe-me");

      // Act
      appStorage.clearAll();

      // Assert
      expect(localStorage.getItem("other")).toBe("keep-me");
      expect(appStorage.getItem("foo")).toBeNull();
    });
  });
});
