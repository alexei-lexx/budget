import { faker } from "@faker-js/faker";
import { CLIENT_CAPABILITIES_META_KEY } from "@modelcontextprotocol/server";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { toAccountDto } from "../../langchain/tools/account-dto";
import { AccountService } from "../../services/account-service";
import { BusinessError } from "../../services/business-error";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { createMockAccountService } from "../../utils/test-utils/services/account-service-mocks";
import { deleteAccount } from "./delete-account";
import { GUIDES } from "./guides";

describe("deleteAccount", () => {
  let mockAccountService: Mocked<AccountService>;
  const userId = faker.string.uuid();
  const validGuideToken = GUIDES.basics.token;

  const buildContext = (inputResponses?: Record<string, unknown>) => ({
    mcpReq: {
      envelope: {
        [CLIENT_CAPABILITIES_META_KEY]: { elicitation: { form: {} } },
      },
      inputResponses,
    },
  });

  beforeEach(() => {
    mockAccountService = createMockAccountService();
  });

  // Happy path

  it("elicits confirmation", async () => {
    // Arrange
    const account = fakeAccount({ name: "Checking" });
    // Account found, has 3 transactions
    mockAccountService.getAccountForDeletion.mockResolvedValue({
      account,
      transactionCount: 3,
    });

    // Act
    const result = await deleteAccount(
      { id: account.id, guideTokens: [validGuideToken] },
      { accountService: mockAccountService, userId, context: buildContext() },
    );

    // Assert
    expect(result).toMatchObject({
      inputRequests: {
        confirm: {
          method: "elicitation/create",
          params: {
            message: `Delete account "${account.name}"? It has 3 transaction(s), which will be kept. This cannot be undone.`,
          },
        },
      },
    });

    expect(mockAccountService.getAccountForDeletion).toHaveBeenCalledWith(
      account.id,
      userId,
    );

    expect(mockAccountService.deleteAccount).not.toHaveBeenCalled();
  });

  it("deletes account and returns it when retried call confirms", async () => {
    // Arrange
    // Deleted account returned by the service
    const deleted = fakeAccount();
    mockAccountService.deleteAccount.mockResolvedValue(deleted);

    // Act
    const result = await deleteAccount(
      { id: deleted.id, guideTokens: [validGuideToken] },
      {
        accountService: mockAccountService,
        userId,
        context: buildContext({
          confirm: { action: "accept", content: { confirm: true } },
        }),
      },
    );

    // Assert
    expect(result).toEqual({
      success: true,
      data: toAccountDto(deleted),
    });

    expect(mockAccountService.deleteAccount).toHaveBeenCalledWith(
      deleted.id,
      userId,
    );

    expect(mockAccountService.getAccountForDeletion).not.toHaveBeenCalled();
  });

  it("does not delete account and returns failure when retried call does not confirm", async () => {
    // Act
    const result = await deleteAccount(
      { id: faker.string.uuid(), guideTokens: [validGuideToken] },
      {
        accountService: mockAccountService,
        userId,
        context: buildContext({
          confirm: { action: "accept", content: { confirm: false } },
        }),
      },
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: "Account deletion was not confirmed.",
    });
    expect(mockAccountService.deleteAccount).not.toHaveBeenCalled();
  });

  it("does not delete account and returns failure when retried call declines", async () => {
    // Act
    const result = await deleteAccount(
      { id: faker.string.uuid(), guideTokens: [validGuideToken] },
      {
        accountService: mockAccountService,
        userId,
        context: buildContext({ confirm: { action: "decline" } }),
      },
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: "Account deletion was not confirmed.",
    });
    expect(mockAccountService.deleteAccount).not.toHaveBeenCalled();
  });

  it("does not delete account and returns failure when retried call cancels", async () => {
    // Act
    const result = await deleteAccount(
      { id: faker.string.uuid(), guideTokens: [validGuideToken] },
      {
        accountService: mockAccountService,
        userId,
        context: buildContext({ confirm: { action: "cancel" } }),
      },
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: "Account deletion was not confirmed.",
    });
    expect(mockAccountService.deleteAccount).not.toHaveBeenCalled();
  });

  // Validation failures

  it("fails without elicitation capability", async () => {
    // Act
    const result = await deleteAccount(
      { id: faker.string.uuid(), guideTokens: [validGuideToken] },
      {
        accountService: mockAccountService,
        userId,
        // No elicitation capability declared
        context: { mcpReq: { envelope: {} } },
      },
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error:
        "This client cannot prompt the user for confirmation. Delete the account in the app instead.",
    });

    expect(mockAccountService.getAccountForDeletion).not.toHaveBeenCalled();
  });

  it("rejects without valid basics guide token", async () => {
    // Act
    const result = await deleteAccount(
      { id: faker.string.uuid(), guideTokens: [] },
      { accountService: mockAccountService, userId, context: buildContext() },
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error:
        "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
    });

    expect(mockAccountService.getAccountForDeletion).not.toHaveBeenCalled();
    expect(mockAccountService.deleteAccount).not.toHaveBeenCalled();
  });

  // Dependency failures

  it("returns failure when service throws BusinessError", async () => {
    // Arrange
    // Account does not exist or belongs to another user
    mockAccountService.getAccountForDeletion.mockRejectedValue(
      new BusinessError("Account not found"),
    );

    // Act
    const result = await deleteAccount(
      { id: faker.string.uuid(), guideTokens: [validGuideToken] },
      { accountService: mockAccountService, userId, context: buildContext() },
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: "Account not found",
    });
  });

  it("returns failure when service throws unexpected error", async () => {
    // Arrange
    // Repository throws on DB error
    mockAccountService.deleteAccount.mockRejectedValue(
      new Error("Database error"),
    );

    // Act
    const result = await deleteAccount(
      { id: faker.string.uuid(), guideTokens: [validGuideToken] },
      {
        accountService: mockAccountService,
        userId,
        context: buildContext({
          confirm: { action: "accept", content: { confirm: true } },
        }),
      },
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: "Failed to delete the account",
    });
  });
});
