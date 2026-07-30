import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { AccountService } from "../services/account-service";
import { EntityScope } from "../types/entity-scope";
import { fakeAccount } from "../utils/test-utils/models/account-fakes";
import { createMockAccountService } from "../utils/test-utils/services/account-service-mocks";
import { handler } from "./get-accounts";

describe("getAccounts", () => {
  let mockAccountService: Mocked<AccountService>;
  const userId = faker.string.uuid();
  let deps: { accountService: Mocked<AccountService>; userId: string };

  beforeEach(() => {
    mockAccountService = createMockAccountService();
    deps = { accountService: mockAccountService, userId };
  });

  // Happy path

  it("scopes lookup to given userId and scope", async () => {
    // Arrange
    mockAccountService.getAccountsByUser.mockResolvedValue([]);

    // Act
    await handler({ scope: EntityScope.ALL }, deps);

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
    const result = await handler({ scope: EntityScope.ALL }, deps);

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
});
