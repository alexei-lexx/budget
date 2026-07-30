import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { AccountService } from "../../services/account-service";
import { BusinessError } from "../../services/business-error";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { createMockAccountService } from "../../utils/test-utils/services/account-service-mocks";
import { updateAccount } from "./update-account";

describe("updateAccount", () => {
  let mockAccountService: Mocked<AccountService>;
  const userId = faker.string.uuid();
  let deps: { accountService: Mocked<AccountService>; userId: string };

  beforeEach(() => {
    mockAccountService = createMockAccountService();
    deps = { accountService: mockAccountService, userId };
  });

  // Happy path

  it("updates account and returns updated fields", async () => {
    // Arrange
    const updated = fakeAccount({
      name: "Renamed Account",
      currency: "EUR",
      isArchived: false,
    });
    mockAccountService.updateAccount.mockResolvedValue(updated);

    // Act
    const result = await updateAccount(
      { id: updated.id, name: "Renamed Account", currency: "EUR" },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: true,
      data: {
        id: updated.id,
        name: "Renamed Account",
        currency: "EUR",
        isArchived: false,
      },
    });
    expect(mockAccountService.updateAccount).toHaveBeenCalledWith(
      updated.id,
      userId,
      { name: "Renamed Account", currency: "EUR" },
    );
  });

  it("passes only the supplied fields to the service", async () => {
    // Arrange
    const accountId = faker.string.uuid();
    mockAccountService.updateAccount.mockResolvedValue(fakeAccount());

    // Act
    await updateAccount({ id: accountId, name: "Renamed Only" }, deps);

    // Assert
    expect(mockAccountService.updateAccount).toHaveBeenCalledWith(
      accountId,
      userId,
      { name: "Renamed Only" },
    );
  });

  // Error handling

  it("returns failure when service throws", async () => {
    // Arrange
    mockAccountService.updateAccount.mockRejectedValue(
      new BusinessError("Account not found"),
    );

    // Act
    const result = await updateAccount(
      { id: faker.string.uuid(), name: "Renamed Account" },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: "Account not found",
    });
  });
});
