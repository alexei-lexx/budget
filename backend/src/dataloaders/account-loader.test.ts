import DataLoader from "dataloader";
import { fakeAccount } from "../__tests__/utils/factories";
import { createMockAccountRepository } from "../__tests__/utils/mock-repositories";
import { batchLoadAccounts, createAccountLoader } from "./account-loader";

describe("Account Batch Loader", () => {
  describe("batchLoadAccounts", () => {
    it("should batch load 5 valid account IDs and return correct data", async () => {
      const mockRepository = createMockAccountRepository();

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
      mockRepository.findByIds.mockResolvedValue([
        account3,
        account4,
        account1,
        account2,
        account5,
      ]);

      const result = await batchLoadAccounts(
        ["acc-1", "acc-2", "acc-3", "acc-4", "acc-5"],
        mockRepository,
        "test-user-id",
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

    it("should handle mix of valid and non-existent accounts with stub data", async () => {
      const mockRepository = createMockAccountRepository();

      const validAccount = fakeAccount({ id: "acc-valid" });

      mockRepository.findByIds.mockResolvedValue([validAccount]);

      const result = await batchLoadAccounts(
        ["acc-valid", "acc-missing"],
        mockRepository,
        "test-user-id",
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

    it("should handle duplicate IDs by deduplicating and preserving order", async () => {
      const mockRepository = createMockAccountRepository();

      const account = fakeAccount({ id: "acc-1" });

      mockRepository.findByIds.mockResolvedValue([account]);

      const result = await batchLoadAccounts(
        ["acc-1", "acc-1", "acc-1"],
        mockRepository,
        "test-user-id",
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

    it("should return empty array for empty input", async () => {
      const mockRepository = createMockAccountRepository();

      const result = await batchLoadAccounts(
        [],
        mockRepository,
        "test-user-id",
      );

      expect(result).toEqual([]);
      expect(mockRepository.findByIds).not.toHaveBeenCalled();
    });
  });

  describe("createAccountLoader", () => {
    it("should create a DataLoader instance", () => {
      const mockRepository = createMockAccountRepository();
      const loader = createAccountLoader(
        mockRepository,
        async () => "test-user-id",
      );

      expect(loader).toBeInstanceOf(DataLoader);
    });

    it("should batch load through DataLoader", async () => {
      const mockRepository = createMockAccountRepository();
      const account = fakeAccount({ id: "acc-1" });

      mockRepository.findByIds.mockResolvedValue([account]);

      const loader = createAccountLoader(
        mockRepository,
        async () => "test-user-id",
      );

      const result = await loader.load("acc-1");

      expect(result).toEqual({
        id: "acc-1",
        name: account.name,
        isArchived: account.isArchived,
      });
    });
  });
});
