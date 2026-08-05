import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { AccountService } from "../../services/account-service";
import { BusinessError } from "../../services/business-error";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { createMockAccountService } from "../../utils/test-utils/services/account-service-mocks";
import { GUIDES } from "./guides";
import { updateAccount } from "./update-account";

describe("updateAccount", () => {
  let mockAccountService: Mocked<AccountService>;
  const userId = faker.string.uuid();
  let deps: { accountService: Mocked<AccountService>; userId: string };

  const validGuideToken = GUIDES.basics.token;

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
    // Persists and returns updated account
    mockAccountService.updateAccount.mockResolvedValue(updated);

    // Act
    const result = await updateAccount(
      {
        id: updated.id,
        name: "Renamed Account",
        currency: "EUR",
        guideTokens: [validGuideToken],
      },
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

  it("passes only supplied fields to service", async () => {
    // Arrange
    const accountId = faker.string.uuid();
    // Persists and returns updated account
    mockAccountService.updateAccount.mockResolvedValue(fakeAccount());

    // Act
    await updateAccount(
      { id: accountId, name: "Renamed Only", guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    expect(mockAccountService.updateAccount).toHaveBeenCalledWith(
      accountId,
      userId,
      { name: "Renamed Only" },
    );
  });

  // Validation failures

  it("rejects without valid basics guide token and does not call service", async () => {
    // Act
    const result = await updateAccount(
      { id: faker.string.uuid(), name: "Renamed Only", guideTokens: [] },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error:
        "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
    });
    expect(mockAccountService.updateAccount).not.toHaveBeenCalled();
  });

  it("does not disclose valid guide token in rejection message", async () => {
    // Act
    const result = await updateAccount(
      { id: faker.string.uuid(), name: "Renamed Only", guideTokens: [] },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: expect.not.stringContaining(validGuideToken),
    });
  });

  // Dependency failures

  it("returns failure when service throws", async () => {
    // Arrange
    // Account service rejects
    mockAccountService.updateAccount.mockRejectedValue(
      new BusinessError("Account not found"),
    );

    // Act
    const result = await updateAccount(
      {
        id: faker.string.uuid(),
        name: "Renamed Account",
        guideTokens: [validGuideToken],
      },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: "Account not found",
    });
  });
});
