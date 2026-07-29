import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { AccountService } from "../../services/account-service";
import { EntityScope } from "../../types/entity-scope";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { createMockAccountService } from "../../utils/test-utils/services/account-service-mocks";
import { createGetAccountsTool } from "./get-accounts";

describe("createGetAccountsTool", () => {
  let mockAccountService: Mocked<AccountService>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockAccountService = createMockAccountService();
  });

  it("returns tool with correct name", () => {
    const accountsTool = createGetAccountsTool(mockAccountService);

    expect(accountsTool.name).toBe("get_accounts");
  });

  it("throws when userId in context is not valid UUID", async () => {
    const accountsTool = createGetAccountsTool(mockAccountService);

    await expect(
      accountsTool.invoke(
        { scope: EntityScope.ALL },
        { context: { userId: "not-a-uuid" } },
      ),
    ).rejects.toThrow();
  });

  it("calls service", async () => {
    mockAccountService.getAccountsByUser.mockResolvedValue([]);

    const accountsTool = createGetAccountsTool(mockAccountService);
    await accountsTool.invoke(
      { scope: EntityScope.ARCHIVED },
      { context: { userId } },
    );

    expect(mockAccountService.getAccountsByUser).toHaveBeenCalledWith(
      userId,
      EntityScope.ARCHIVED,
    );
  });

  it("returns required fields only", async () => {
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
    mockAccountService.getAccountsByUser.mockResolvedValue(mockAccounts);

    const accountsTool = createGetAccountsTool(mockAccountService);
    const result = await accountsTool.invoke(
      { scope: EntityScope.ALL },
      { context: { userId } },
    );

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

  it("returns empty array when user has no accounts", async () => {
    mockAccountService.getAccountsByUser.mockResolvedValue([]);

    const accountsTool = createGetAccountsTool(mockAccountService);
    const result = await accountsTool.invoke(
      { scope: EntityScope.ALL },
      { context: { userId } },
    );

    expect(result).toEqual({ success: true, data: [] });
  });
});
