import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AccountService } from "../../services/account-service";
import { BusinessError } from "../../services/business-error";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { createMockAccountService } from "../../utils/test-utils/services/account-service-mocks";
import { toAccountDto } from "./account-dto";
import { UpdateAccountInput, createUpdateAccountTool } from "./update-account";

describe("createUpdateAccountTool", () => {
  let mockAccountService: jest.Mocked<AccountService>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockAccountService = createMockAccountService();
  });

  it("should return tool with correct name", () => {
    // Act
    const updateTool = createUpdateAccountTool({
      accountService: mockAccountService,
    });

    // Assert
    expect(updateTool.name).toBe("update_account");
  });

  // Happy path

  it("should update the account name and return the account", async () => {
    // Arrange
    const accountId = faker.string.uuid();
    const updated = fakeAccount({ id: accountId, name: "Renamed" });

    // Service returns the updated account
    mockAccountService.updateAccount.mockResolvedValue(updated);

    const updateTool = createUpdateAccountTool({
      accountService: mockAccountService,
    });

    const input: UpdateAccountInput = {
      id: accountId,
      name: "Renamed",
    };

    // Act
    const result = await updateTool.invoke(input, { context: { userId } });

    // Assert
    expect(result).toEqual({
      success: true,
      data: toAccountDto(updated),
    });

    expect(mockAccountService.updateAccount).toHaveBeenCalledWith(
      accountId,
      userId,
      { name: "Renamed" },
    );
  });

  it("should update the account currency", async () => {
    // Arrange
    const accountId = faker.string.uuid();
    const updated = fakeAccount({ id: accountId, currency: "EUR" });

    // Service returns the updated account
    mockAccountService.updateAccount.mockResolvedValue(updated);

    const updateTool = createUpdateAccountTool({
      accountService: mockAccountService,
    });

    const input: UpdateAccountInput = {
      id: accountId,
      currency: "EUR",
    };

    // Act
    await updateTool.invoke(input, { context: { userId } });

    // Assert
    expect(mockAccountService.updateAccount).toHaveBeenCalledWith(
      accountId,
      userId,
      { currency: "EUR" },
    );
  });

  it("should update both name and currency", async () => {
    // Arrange
    const accountId = faker.string.uuid();
    const updated = fakeAccount({
      id: accountId,
      name: "Renamed",
      currency: "EUR",
    });

    // Service returns the updated account
    mockAccountService.updateAccount.mockResolvedValue(updated);

    const updateTool = createUpdateAccountTool({
      accountService: mockAccountService,
    });

    const input: UpdateAccountInput = {
      id: accountId,
      name: "Renamed",
      currency: "EUR",
    };

    // Act
    await updateTool.invoke(input, { context: { userId } });

    // Assert
    expect(mockAccountService.updateAccount).toHaveBeenCalledWith(
      accountId,
      userId,
      { name: "Renamed", currency: "EUR" },
    );
  });

  // Validation failures

  it("should throw when userId in context is not a valid UUID", async () => {
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

  it("should reject input shapes containing initialBalance", async () => {
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

  it("should propagate BusinessError from the service unchanged", async () => {
    // Arrange
    const error = new BusinessError(
      "Cannot change currency for account that has existing transactions. Please create a new account with the desired currency instead.",
    );

    // Service rejects with a domain error
    mockAccountService.updateAccount.mockRejectedValue(error);

    const updateTool = createUpdateAccountTool({
      accountService: mockAccountService,
    });

    const input: UpdateAccountInput = {
      id: faker.string.uuid(),
      currency: "EUR",
    };

    // Act & Assert
    await expect(
      updateTool.invoke(input, { context: { userId } }),
    ).rejects.toBe(error);
  });
});
