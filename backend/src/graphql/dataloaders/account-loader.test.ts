import DataLoader from "dataloader";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { AccountRepository } from "../../ports/account-repository";
import { Logger } from "../../ports/logger";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { createMockLogger } from "../../utils/test-utils/providers/logger-mocks";
import { createMockAccountRepository } from "../../utils/test-utils/repositories/account-repository-mocks";
import { batchLoadAccounts, createAccountLoader } from "./account-loader";

describe("Account Batch Loader", () => {
  let deps: {
    accountRepository: Mocked<AccountRepository>;
    logger: Mocked<Logger>;
  };

  beforeEach(() => {
    deps = {
      accountRepository: createMockAccountRepository(),
      logger: createMockLogger(),
    };
  });

  describe("batchLoadAccounts", () => {
    it("batch-loads 5 valid account IDs and returns correct data", async () => {
      // Create 5 fake accounts
      const account1 = fakeAccount({
        id: "acc-1",
        name: "Checking",
        isArchived: false,
      });
      const account2 = fakeAccount({
        id: "acc-2",
        name: "Savings",
        isArchived: true,
      });
      const account3 = fakeAccount({
        id: "acc-3",
        name: "Cash",
        isArchived: false,
      });
      const account4 = fakeAccount({
        id: "acc-4",
        name: "Credit",
        isArchived: true,
      });
      const account5 = fakeAccount({
        id: "acc-5",
        name: "Investment",
        isArchived: false,
      });

      // Mock repository to return accounts
      deps.accountRepository.findManyWithArchivedByIds.mockResolvedValue([
        account3,
        account4,
        account1,
        account2,
        account5,
      ]);

      const result = await batchLoadAccounts(
        {
          accountIds: ["acc-1", "acc-2", "acc-3", "acc-4", "acc-5"],
          userId: "test-user-id",
        },
        deps,
      );

      expect(result).toHaveLength(5);

      expect(result[0]).toEqual({
        id: "acc-1",
        name: "Checking",
        isArchived: false,
      });

      expect(result[1]).toEqual({
        id: "acc-2",
        name: "Savings",
        isArchived: true,
      });

      expect(result[2]).toEqual({
        id: "acc-3",
        name: "Cash",
        isArchived: false,
      });

      expect(result[3]).toEqual({
        id: "acc-4",
        name: "Credit",
        isArchived: true,
      });

      expect(result[4]).toEqual({
        id: "acc-5",
        name: "Investment",
        isArchived: false,
      });
    });

    it("handles mix of valid and non-existent accounts with stub data", async () => {
      const validAccount = fakeAccount({ id: "acc-valid" });

      deps.accountRepository.findManyWithArchivedByIds.mockResolvedValue([
        validAccount,
      ]);

      const result = await batchLoadAccounts(
        { accountIds: ["acc-valid", "acc-missing"], userId: "test-user-id" },
        deps,
      );

      expect(result).toHaveLength(2);

      expect(result[0]).toEqual({
        id: "acc-valid",
        name: validAccount.name,
        isArchived: validAccount.isArchived,
      });

      // Missing account should return stub data
      expect(result[1]).toEqual({
        id: "acc-missing",
        name: "Unknown",
        isArchived: false,
      });
    });

    it("handles duplicate IDs by deduplicating and preserving order", async () => {
      const account = fakeAccount({ id: "acc-1" });

      deps.accountRepository.findManyWithArchivedByIds.mockResolvedValue([
        account,
      ]);

      const result = await batchLoadAccounts(
        { accountIds: ["acc-1", "acc-1", "acc-1"], userId: "test-user-id" },
        deps,
      );

      // Should still return 3 items (same count as input), all with same account data
      expect(result).toHaveLength(3);

      result.forEach((acc) => {
        expect(acc).toEqual({
          id: "acc-1",
          name: account.name,
          isArchived: account.isArchived,
        });
      });
    });

    it("returns empty array for empty input", async () => {
      const result = await batchLoadAccounts(
        { accountIds: [], userId: "test-user-id" },
        deps,
      );

      expect(result).toEqual([]);
      expect(
        deps.accountRepository.findManyWithArchivedByIds,
      ).not.toHaveBeenCalled();
    });
  });

  describe("createAccountLoader", () => {
    it("creates DataLoader instance", () => {
      const loader = createAccountLoader({
        ...deps,
        getUserId: async () => "test-user-id",
      });

      expect(loader).toBeInstanceOf(DataLoader);
    });

    it("batch-loads through DataLoader", async () => {
      const account = fakeAccount({ id: "acc-1" });

      deps.accountRepository.findManyWithArchivedByIds.mockResolvedValue([
        account,
      ]);

      const loader = createAccountLoader({
        ...deps,
        getUserId: async () => "test-user-id",
      });

      const result = await loader.load("acc-1");

      expect(result).toEqual({
        id: "acc-1",
        name: account.name,
        isArchived: account.isArchived,
      });
    });
  });
});
