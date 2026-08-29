import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { AccountService } from "../../services/account-service";
import { EntityScope } from "../../types/entity-scope";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { createMockAccountService } from "../../utils/test-utils/services/account-service-mocks";
import { getAccounts } from "./get-accounts";
import { GUIDES } from "./guides";

describe("getAccounts", () => {
  let mockAccountService: Mocked<AccountService>;
  const userId = faker.string.uuid();
  let deps: { accountService: Mocked<AccountService>; userId: string };

  const validGuideToken = GUIDES.basics.token;

  beforeEach(() => {
    mockAccountService = createMockAccountService();
    deps = { accountService: mockAccountService, userId };
  });

  // Happy path

  it("scopes lookup to given userId and scope", async () => {
    // Arrange
    mockAccountService.getAccountsByUser.mockResolvedValue([]);

    // Act
    await getAccounts(
      { scope: EntityScope.ALL, guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    expect(mockAccountService.getAccountsByUser).toHaveBeenCalledWith(
      userId,
      EntityScope.ALL,
    );
  });

  it("returns account details", async () => {
    // Arrange
    const account = fakeAccount({
      name: "Checking Account",
      currency: "USD",
      isArchived: false,
    });
    mockAccountService.getAccountsByUser.mockResolvedValue([account]);

    // Act
    const result = await getAccounts(
      { scope: EntityScope.ALL, guideTokens: [validGuideToken] },
      deps,
    );

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

  // Validation failures

  it("rejects without valid basics guide token and does not call service", async () => {
    // Act
    const result = await getAccounts(
      { scope: EntityScope.ALL, guideTokens: [] },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error:
        "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
    });
    expect(mockAccountService.getAccountsByUser).not.toHaveBeenCalled();
  });

  it("does not disclose valid guide token in rejection message", async () => {
    // Act
    const result = await getAccounts(
      { scope: EntityScope.ALL, guideTokens: [] },
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
    const errorMessage = faker.lorem.sentence();
    mockAccountService.getAccountsByUser.mockRejectedValue(
      new Error(errorMessage),
    );

    // Act
    const promise = getAccounts(
      { scope: EntityScope.ALL, guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    await expect(promise).rejects.toThrow(errorMessage);
  });
});
