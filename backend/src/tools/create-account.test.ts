import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { AccountService } from "../services/account-service";
import { BusinessError } from "../services/business-error";
import { fakeAccount } from "../utils/test-utils/models/account-fakes";
import { createMockAccountService } from "../utils/test-utils/services/account-service-mocks";
import { createAccount } from "./create-account";

describe("createAccount", () => {
  let mockAccountService: Mocked<AccountService>;
  const userId = faker.string.uuid();
  let deps: { accountService: Mocked<AccountService>; userId: string };

  beforeEach(() => {
    mockAccountService = createMockAccountService();
    deps = { accountService: mockAccountService, userId };
  });

  // Happy path

  it("creates account and returns created fields", async () => {
    // Arrange
    const created = fakeAccount({
      name: "Checking Account",
      currency: "USD",
      isArchived: false,
      initialBalance: 500,
    });
    // Persists and returns new account
    mockAccountService.createAccount.mockResolvedValue(created);

    // Act
    const result = await createAccount(
      { name: "Checking Account", currency: "USD", initialBalance: 500 },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: true,
      data: {
        id: created.id,
        name: "Checking Account",
        currency: "USD",
        isArchived: false,
        initialBalance: 500,
      },
    });
    expect(mockAccountService.createAccount).toHaveBeenCalledWith({
      userId,
      name: "Checking Account",
      currency: "USD",
      initialBalance: 500,
    });
  });

  it("defaults initialBalance to 0 when omitted", async () => {
    // Arrange
    const created = fakeAccount({ initialBalance: 0 });
    // Persists and returns new account
    mockAccountService.createAccount.mockResolvedValue(created);

    // Act
    await createAccount({ name: "Savings", currency: "EUR" }, deps);

    // Assert
    expect(mockAccountService.createAccount).toHaveBeenCalledWith({
      userId,
      name: "Savings",
      currency: "EUR",
      initialBalance: 0,
    });
  });

  // Dependency failures

  it("returns failure when service throws", async () => {
    // Arrange
    // Account service rejects
    mockAccountService.createAccount.mockRejectedValue(
      new BusinessError('Account "Savings" already exists'),
    );

    // Act
    const result = await createAccount(
      { name: "Savings", currency: "EUR" },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: 'Account "Savings" already exists',
    });
  });
});
