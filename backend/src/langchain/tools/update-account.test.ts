import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { AccountService } from "../../services/account-service";
import { BusinessError } from "../../services/business-error";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { createMockAccountService } from "../../utils/test-utils/services/account-service-mocks";
import { UpdateAccountInput, createUpdateAccountTool } from "./update-account";

describe("createUpdateAccountTool", () => {
  let mockAccountService: Mocked<AccountService>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockAccountService = createMockAccountService();
  });

  it("returns tool with correct name", () => {
    // Act
    const updateTool = createUpdateAccountTool({
      accountService: mockAccountService,
    });

    // Assert
    expect(updateTool.name).toBe("update_account");
  });

  it("wires input and context userId through to the shared handler", async () => {
    // Arrange
    const accountId = faker.string.uuid();
    const updated = fakeAccount({ id: accountId, name: "Renamed" });

    mockAccountService.updateAccount.mockResolvedValue(updated);

    const updateTool = createUpdateAccountTool({
      accountService: mockAccountService,
    });

    const input: UpdateAccountInput = { id: accountId, name: "Renamed" };

    // Act
    const result = await updateTool.invoke(input, { context: { userId } });

    // Assert
    expect(result).toMatchObject({ success: true });
    expect(mockAccountService.updateAccount).toHaveBeenCalledWith(
      accountId,
      userId,
      { name: "Renamed" },
    );
  });

  // Validation failures

  it("throws when userId in context is not a valid UUID", async () => {
    // Arrange
    const updateTool = createUpdateAccountTool({
      accountService: mockAccountService,
    });

    const input: UpdateAccountInput = {
      id: faker.string.uuid(),
      name: "Renamed",
    };

    // Act & Assert
    await expect(
      updateTool.invoke(input, { context: { userId: "not-a-uuid" } }),
    ).rejects.toThrow();

    expect(mockAccountService.updateAccount).not.toHaveBeenCalled();
  });

  it("rejects input shapes containing initialBalance", async () => {
    // Arrange
    const updateTool = createUpdateAccountTool({
      accountService: mockAccountService,
    });

    const input = {
      id: faker.string.uuid(),
      initialBalance: 1000,
    };

    // Act & Assert
    await expect(
      updateTool.invoke(input, { context: { userId } }),
    ).rejects.toThrow();

    expect(mockAccountService.updateAccount).not.toHaveBeenCalled();
  });

  // Dependency failures

  it("returns failure when the shared handler catches a BusinessError", async () => {
    // Arrange
    mockAccountService.updateAccount.mockRejectedValue(
      new BusinessError(
        "Cannot change currency for account that has existing transactions. Please create a new account with the desired currency instead.",
      ),
    );

    const updateTool = createUpdateAccountTool({
      accountService: mockAccountService,
    });

    const input: UpdateAccountInput = {
      id: faker.string.uuid(),
      currency: "EUR",
    };

    // Act
    const result = await updateTool.invoke(input, { context: { userId } });

    // Assert
    expect(result).toEqual({
      success: false,
      error:
        "Cannot change currency for account that has existing transactions. Please create a new account with the desired currency instead.",
    });
  });
});
