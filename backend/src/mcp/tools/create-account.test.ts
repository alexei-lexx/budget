import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { AccountService } from "../../services/account-service";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { createMockAccountService } from "../../utils/test-utils/services/account-service-mocks";
import { createAccount } from "./create-account";
import { GUIDES } from "./guides";

describe("createAccount", () => {
  let mockAccountService: Mocked<AccountService>;
  const userId = faker.string.uuid();
  let deps: { accountService: Mocked<AccountService>; userId: string };

  const validGuideToken = GUIDES.basics.token;

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
      {
        name: "Checking Account",
        currency: "USD",
        initialBalance: 500,
        guideTokens: [validGuideToken],
      },
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
    await createAccount(
      { name: "Savings", currency: "EUR", guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    expect(mockAccountService.createAccount).toHaveBeenCalledWith({
      userId,
      name: "Savings",
      currency: "EUR",
      initialBalance: 0,
    });
  });

  // Validation failures

  it("rejects without valid basics guide token and does not call service", async () => {
    // Act
    const result = await createAccount(
      { name: "Savings", currency: "EUR", guideTokens: [] },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error:
        "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
    });
    expect(mockAccountService.createAccount).not.toHaveBeenCalled();
  });

  it("does not disclose valid guide token in rejection message", async () => {
    // Act
    const result = await createAccount(
      { name: "Savings", currency: "EUR", guideTokens: [] },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: expect.not.stringContaining(validGuideToken),
    });
  });

  // Dependency failures

  it("propagates error when service throws", async () => {
    // Arrange
    // Account service rejects
    const errorMessage = faker.lorem.sentence();
    mockAccountService.createAccount.mockRejectedValue(new Error(errorMessage));

    // Act
    const promise = createAccount(
      { name: "Savings", currency: "EUR", guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    await expect(promise).rejects.toThrow(errorMessage);
  });
});
