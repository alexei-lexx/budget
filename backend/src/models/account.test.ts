import { faker } from "@faker-js/faker";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  fakeAccount,
  fakeCreateAccountInput,
} from "../utils/test-utils/models/account-fakes";
import { Account, NAME_MAX_LENGTH } from "./account";
import { ModelError } from "./model-error";

describe("Account", () => {
  describe("create", () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date("2000-01-02T10:11:12.000Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    // Happy path

    it("builds account with all fields populated", () => {
      // Arrange
      const userId = faker.string.uuid();
      const input = fakeCreateAccountInput({
        userId,
        name: "Cash",
        currency: "USD",
        initialBalance: 100,
      });

      // Act
      const result = Account.create(input, { idGenerator: () => "fixed-uuid" });

      // Assert
      expect(result.toData()).toEqual({
        id: "fixed-uuid",
        userId,
        name: "Cash",
        currency: "USD",
        initialBalance: 100,
        isArchived: false,
        version: 0,
        createdAt: "2000-01-02T10:11:12.000Z",
        updatedAt: "2000-01-02T10:11:12.000Z",
      });
    });

    it("trims name", () => {
      // Act
      const result = Account.create(
        fakeCreateAccountInput({ name: "  Cash  " }),
      );

      // Assert
      expect(result.name).toBe("Cash");
    });

    it("uses default id generator when options omitted", () => {
      // Act
      const result = Account.create(fakeCreateAccountInput());

      // Assert
      expect(result.id).toBeDefined();
    });

    // Validation failures

    it("throws when name is empty", () => {
      // Act & Assert
      expect(() =>
        Account.create(fakeCreateAccountInput({ name: "" })),
      ).toThrow(ModelError);
    });

    it("throws when name exceeds maximum length", () => {
      // Arrange
      const tooLong = "a".repeat(NAME_MAX_LENGTH + 1);

      // Act & Assert
      expect(() =>
        Account.create(fakeCreateAccountInput({ name: tooLong })),
      ).toThrow(ModelError);
    });

    it("throws on unsupported currency", () => {
      // Act & Assert
      expect(() =>
        Account.create(fakeCreateAccountInput({ currency: "ZZZ" })),
      ).toThrow(ModelError);
    });
  });

  describe("fromPersistence", () => {
    // Happy path

    it("reconstructs instance from data", () => {
      // Arrange
      const data = fakeAccount().toData();

      // Act
      const result = Account.fromPersistence(data);

      // Assert
      expect(result.toData()).toEqual(data);
    });

    // Validation failures

    it("throws on unsupported currency", () => {
      // Arrange
      const data = { ...fakeAccount().toData(), currency: "ZZZ" };

      // Act & Assert
      expect(() => Account.fromPersistence(data)).toThrow(ModelError);
    });
  });

  describe("toData", () => {
    // Happy path

    it("returns plain object with all data fields", () => {
      // Arrange
      const data = fakeAccount().toData();
      const account = Account.fromPersistence(data);

      // Act & Assert
      expect(account.toData()).toEqual(data);
    });
  });

  describe("bumpVersion", () => {
    // Happy path

    it("increments version by 1 and preserves other fields", () => {
      // Arrange
      const existing = fakeAccount({ version: 4 });

      // Act
      const result = existing.bumpVersion();

      // Assert
      expect(result.toData()).toEqual({
        ...existing.toData(),
        version: 5,
      });
    });
  });

  describe("update", () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date("2000-01-02T10:11:12.000Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    // Happy path

    it("sets name", () => {
      // Arrange
      const existing = fakeAccount({ name: "Cash" });

      // Act
      const result = existing.update({ name: "Wallet" });

      // Assert
      expect(result.name).toBe("Wallet");
    });

    it("sets currency", () => {
      // Arrange
      const existing = fakeAccount({ currency: "USD" });

      // Act
      const result = existing.update({ currency: "EUR" });

      // Assert
      expect(result.currency).toBe("EUR");
    });

    it("sets initialBalance", () => {
      // Arrange
      const existing = fakeAccount({ initialBalance: 100 });

      // Act
      const result = existing.update({ initialBalance: 250 });

      // Assert
      expect(result.initialBalance).toBe(250);
    });

    it("trims name", () => {
      // Act
      const result = fakeAccount().update({ name: "  Wallet  " });

      // Assert
      expect(result.name).toBe("Wallet");
    });

    it("keeps fields when input is empty", () => {
      // Arrange
      const existing = fakeAccount();

      // Act
      const result = existing.update({});

      // Assert
      expect(result.name).toBe(existing.name);
      expect(result.currency).toBe(existing.currency);
      expect(result.initialBalance).toBe(existing.initialBalance);
    });

    it("preserves id, userId, isArchived, version, createdAt", () => {
      // Arrange
      const existing = fakeAccount({
        id: "id-1",
        userId: "user-1",
        version: 3,
        createdAt: "1999-01-01T00:00:00.000Z",
      });

      // Act
      const result = existing.update({ name: "Wallet" });

      // Assert
      expect(result.id).toBe("id-1");
      expect(result.userId).toBe("user-1");
      expect(result.isArchived).toBe(false);
      expect(result.version).toBe(3);
      expect(result.createdAt).toBe("1999-01-01T00:00:00.000Z");
    });

    it("sets updatedAt", () => {
      // Arrange
      const existing = fakeAccount();

      // Act
      const result = existing.update({ name: "Wallet" });

      // Assert
      expect(result.updatedAt).toBe("2000-01-02T10:11:12.000Z");
    });

    // Validation failures

    it("throws on updating archived account", () => {
      // Arrange
      const existing = fakeAccount({ isArchived: true });

      // Act & Assert
      expect(() => existing.update({ name: "Wallet" })).toThrow(
        new ModelError("Cannot update archived account"),
      );
    });

    it("throws when name is empty", () => {
      // Act & Assert
      expect(() => fakeAccount().update({ name: "" })).toThrow(ModelError);
    });

    it("throws when name exceeds maximum length", () => {
      // Arrange
      const tooLong = "a".repeat(NAME_MAX_LENGTH + 1);

      // Act & Assert
      expect(() => fakeAccount().update({ name: tooLong })).toThrow(ModelError);
    });

    it("throws on unsupported currency", () => {
      // Act & Assert
      expect(() => fakeAccount().update({ currency: "ZZZ" })).toThrow(
        ModelError,
      );
    });
  });

  describe("archive", () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date("2000-01-02T10:11:12.000Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    // Happy path

    it("sets isArchived to true", () => {
      // Arrange
      const existing = fakeAccount({ isArchived: false });

      // Act
      const result = existing.archive();

      // Assert
      expect(result.isArchived).toBe(true);
    });

    it("sets updatedAt", () => {
      // Arrange
      const existing = fakeAccount();

      // Act
      const result = existing.archive();

      // Assert
      expect(result.updatedAt).toBe("2000-01-02T10:11:12.000Z");
    });

    // Validation failures

    it("throws on already archived account", () => {
      // Arrange
      const existing = fakeAccount({ isArchived: true });

      // Act & Assert
      expect(() => existing.archive()).toThrow(
        new ModelError("Cannot archive archived account"),
      );
    });
  });
});
