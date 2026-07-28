import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { EntityScope } from "../../langchain/tools/get-accounts";
import { AccountRepository } from "../../ports/account-repository";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { createMockAccountRepository } from "../../utils/test-utils/repositories/account-repository-mocks";
import { getAccounts } from "./get-accounts";

describe("getAccounts", () => {
  let mockAccountRepository: Mocked<AccountRepository>;
  const userId = faker.string.uuid();
  let deps: { accountRepository: Mocked<AccountRepository>; userId: string };

  beforeEach(() => {
    mockAccountRepository = createMockAccountRepository();
    deps = { accountRepository: mockAccountRepository, userId };
  });

  // Happy path

  it("scopes lookup to given userId", async () => {
    // Arrange
    mockAccountRepository.findManyWithArchivedByUserId.mockResolvedValue([]);

    // Act
    await getAccounts({ scope: EntityScope.ALL }, deps);

    // Assert
    expect(
      mockAccountRepository.findManyWithArchivedByUserId,
    ).toHaveBeenCalledWith(userId);
  });

  it("returns account details", async () => {
    // Arrange
    const account = fakeAccount({
      name: "Checking Account",
      currency: "USD",
      isArchived: false,
    });
    mockAccountRepository.findManyWithArchivedByUserId.mockResolvedValue([
      account,
    ]);

    // Act
    const result = await getAccounts({ scope: EntityScope.ALL }, deps);

    // Assert
    expect(result).toEqual({
      success: true,
      data: [
        {
          id: account.id,
          name: "Checking Account",
          currency: "USD",
          isArchived: false,
        },
      ],
    });
  });

  it("returns both active and archived accounts when scope is all", async () => {
    // Arrange
    const accounts = [
      fakeAccount({ isArchived: true }),
      fakeAccount({ isArchived: false }),
    ];
    mockAccountRepository.findManyWithArchivedByUserId.mockResolvedValue(
      accounts,
    );

    // Act
    const result = await getAccounts({ scope: EntityScope.ALL }, deps);

    // Assert
    expect(result).toEqual({
      success: true,
      data: [
        expect.objectContaining({ isArchived: true }),
        expect.objectContaining({ isArchived: false }),
      ],
    });
  });

  it("returns only active accounts when scope is active", async () => {
    // Arrange
    const accounts = [
      fakeAccount({ isArchived: true }),
      fakeAccount({ isArchived: false }),
    ];
    mockAccountRepository.findManyWithArchivedByUserId.mockResolvedValue(
      accounts,
    );

    // Act
    const result = await getAccounts({ scope: EntityScope.ACTIVE }, deps);

    // Assert
    expect(result).toEqual({
      success: true,
      data: [expect.objectContaining({ isArchived: false })],
    });
  });

  it("returns only archived accounts when scope is archived", async () => {
    // Arrange
    const accounts = [
      fakeAccount({ isArchived: true }),
      fakeAccount({ isArchived: false }),
    ];
    mockAccountRepository.findManyWithArchivedByUserId.mockResolvedValue(
      accounts,
    );

    // Act
    const result = await getAccounts({ scope: EntityScope.ARCHIVED }, deps);

    // Assert
    expect(result).toEqual({
      success: true,
      data: [expect.objectContaining({ isArchived: true })],
    });
  });
});
