import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AccountRepository } from "../../services/ports/account-repository";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { createMockAccountRepository } from "../../utils/test-utils/repositories/account-repository-mocks";
import { EntityScope, createGetAccountsTool } from "./get-accounts";

describe("createGetAccountsTool", () => {
  let mockAccountRepository: jest.Mocked<AccountRepository>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockAccountRepository = createMockAccountRepository();
  });

  it("should return tool with correct name", () => {
    const accountsTool = createGetAccountsTool(mockAccountRepository, userId);

    expect(accountsTool.name).toBe("getAccounts");
  });

  it("should call repository", async () => {
    mockAccountRepository.findManyWithArchivedByUserId.mockResolvedValue([]);

    const accountsTool = createGetAccountsTool(mockAccountRepository, userId);
    await accountsTool.invoke({ scope: EntityScope.ALL });

    expect(
      mockAccountRepository.findManyWithArchivedByUserId,
    ).toHaveBeenCalledWith(userId);
  });

  it("should return all accounts when scope is all", async () => {
    const mockAccounts = [
      fakeAccount({ isArchived: true }),
      fakeAccount({ isArchived: false }),
    ];
    mockAccountRepository.findManyWithArchivedByUserId.mockResolvedValue(
      mockAccounts,
    );

    const accountsTool = createGetAccountsTool(mockAccountRepository, userId);
    const result = await accountsTool.invoke({ scope: EntityScope.ALL });

    expect(result).toEqual({
      success: true,
      data: [
        expect.objectContaining({ isArchived: true }),
        expect.objectContaining({ isArchived: false }),
      ],
    });
  });

  it("should return only active accounts when scope is active", async () => {
    const mockAccounts = [
      fakeAccount({ isArchived: true }),
      fakeAccount({ isArchived: false }),
    ];
    mockAccountRepository.findManyWithArchivedByUserId.mockResolvedValue(
      mockAccounts,
    );

    const accountsTool = createGetAccountsTool(mockAccountRepository, userId);
    const result = await accountsTool.invoke({ scope: EntityScope.ACTIVE });

    expect(result).toEqual({
      success: true,
      data: [expect.objectContaining({ isArchived: false })],
    });
  });

  it("should return only archived accounts when scope is archived", async () => {
    const mockAccounts = [
      fakeAccount({ isArchived: true }),
      fakeAccount({ isArchived: false }),
    ];
    mockAccountRepository.findManyWithArchivedByUserId.mockResolvedValue(
      mockAccounts,
    );

    const accountsTool = createGetAccountsTool(mockAccountRepository, userId);
    const result = await accountsTool.invoke({ scope: EntityScope.ARCHIVED });

    expect(result).toEqual({
      success: true,
      data: [expect.objectContaining({ isArchived: true })],
    });
  });

  it("should return required fields only", async () => {
    const mockAccounts = [
      fakeAccount({
        userId,
        name: "Checking Account",
        currency: "USD",
        isArchived: false,
      }),
      fakeAccount({
        userId,
        name: "Savings Account",
        currency: "EUR",
        isArchived: true,
      }),
    ];
    mockAccountRepository.findManyWithArchivedByUserId.mockResolvedValue(
      mockAccounts,
    );

    const accountsTool = createGetAccountsTool(mockAccountRepository, userId);
    const result = await accountsTool.invoke({ scope: EntityScope.ALL });

    expect(result).toEqual({
      success: true,
      data: [
        {
          id: mockAccounts[0].id,
          name: "Checking Account",
          currency: "USD",
          isArchived: false,
        },
        {
          id: mockAccounts[1].id,
          name: "Savings Account",
          currency: "EUR",
          isArchived: true,
        },
      ],
    });
  });

  it("should return empty array when user has no accounts", async () => {
    mockAccountRepository.findManyWithArchivedByUserId.mockResolvedValue([]);

    const accountsTool = createGetAccountsTool(mockAccountRepository, userId);
    const result = await accountsTool.invoke({ scope: EntityScope.ALL });

    expect(result).toEqual({ success: true, data: [] });
  });
});
