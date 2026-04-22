import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AccountRepository } from "../ports/account-repository";
import { SUPPORTED_CURRENCIES } from "../types/currency";
import { fakeAccount } from "../utils/test-utils/models/account-fakes";
import { createMockAccountRepository } from "../utils/test-utils/repositories/account-repository-mocks";
import { CurrencyServiceImpl } from "./currency-service";

describe("CurrencyService", () => {
  let mockAccountRepository: jest.Mocked<AccountRepository>;
  let service: CurrencyServiceImpl;
  let userId: string;

  beforeEach(() => {
    mockAccountRepository = createMockAccountRepository();
    service = new CurrencyServiceImpl(mockAccountRepository);
    userId = faker.string.uuid();
  });

  describe("getSupportedCurrencies", () => {
    // Happy path

    it("returns full alphabetical list when user has no accounts", async () => {
      // Arrange

      // User has no accounts
      mockAccountRepository.findManyByUserId.mockResolvedValue([]);

      // Act
      const result = await service.getSupportedCurrencies({ userId });

      // Assert
      expect(result).toEqual([...SUPPORTED_CURRENCIES]);
      expect(mockAccountRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    it("places deduplicated user currencies at head sorted alphabetically, followed by remaining currencies", async () => {
      // Arrange

      // User has accounts in USD, CHF, and USD again
      mockAccountRepository.findManyByUserId.mockResolvedValue([
        fakeAccount({ currency: "USD" }),
        fakeAccount({ currency: "CHF" }),
        fakeAccount({ currency: "USD" }),
      ]);

      // Act
      const result = await service.getSupportedCurrencies({ userId });

      // Assert
      expect(result.slice(0, 2)).toEqual(["CHF", "USD"]);

      const tail = result.slice(2);
      expect(tail).not.toContain("USD");
      expect(tail).not.toContain("CHF");
      expect(tail).toEqual([...tail].sort());

      expect(result).toHaveLength(SUPPORTED_CURRENCIES.length);

      expect(mockAccountRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    // Dependency failures

    it("propagates error when repository rejects", async () => {
      // Arrange

      // Repository fails to load accounts
      mockAccountRepository.findManyByUserId.mockRejectedValue(
        new Error("db down"),
      );

      // Act & Assert
      await expect(service.getSupportedCurrencies({ userId })).rejects.toThrow(
        "db down",
      );
    });
  });
});
