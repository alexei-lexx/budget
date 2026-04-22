import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AccountService } from "../../services/account-service";
import { BusinessError } from "../../services/business-error";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { createMockAccountService } from "../../utils/test-utils/services/account-service-mocks";
import { toAccountDto } from "./account-dto";
import { CreateAccountInput, createCreateAccountTool } from "./create-account";

describe("createCreateAccountTool", () => {
  let mockAccountService: jest.Mocked<AccountService>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockAccountService = createMockAccountService();
  });

  it("returns tool with correct name", () => {
    // Act
    const createTool = createCreateAccountTool({
      accountService: mockAccountService,
    });

    // Assert
    expect(createTool.name).toBe("create_account");
  });

  // Happy path

  it("creates account and defaults initialBalance to 0 when omitted", async () => {
    // Arrange
    const created = fakeAccount({
      name: "Savings",
      currency: "USD",
      initialBalance: 0,
    });

    // Service returns the created account
    mockAccountService.createAccount.mockResolvedValue(created);

    const createTool = createCreateAccountTool({
      accountService: mockAccountService,
    });

    const input: CreateAccountInput = {
      name: "Savings",
      currency: "USD",
    };

    // Act
    const result = await createTool.invoke(input, { context: { userId } });

    // Assert
    expect(result).toEqual({
      success: true,
      data: {
        ...toAccountDto(created),
        initialBalance: 0,
      },
    });

    expect(mockAccountService.createAccount).toHaveBeenCalledWith({
      userId,
      name: "Savings",
      currency: "USD",
      initialBalance: 0,
    });
  });

  it("passes initialBalance through when provided", async () => {
    // Arrange
    const created = fakeAccount({ initialBalance: 500 });

    // Service returns the created account
    mockAccountService.createAccount.mockResolvedValue(created);

    const createTool = createCreateAccountTool({
      accountService: mockAccountService,
    });

    const input: CreateAccountInput = {
      name: "Checking",
      currency: "EUR",
      initialBalance: 500,
    };

    // Act
    await createTool.invoke(input, { context: { userId } });

    // Assert
    expect(mockAccountService.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        initialBalance: 500,
      }),
    );
  });

  // Validation failures

  it("throws when userId in context is not valid UUID", async () => {
    // Arrange
    const createTool = createCreateAccountTool({
      accountService: mockAccountService,
    });

    const input: CreateAccountInput = {
      name: "Savings",
      currency: "USD",
    };

    // Act & Assert
    await expect(
      createTool.invoke(input, { context: { userId: "not-a-uuid" } }),
    ).rejects.toThrow();

    expect(mockAccountService.createAccount).not.toHaveBeenCalled();
  });

  // Dependency failures

  it("propagates BusinessError from service unchanged", async () => {
    // Arrange
    const error = new BusinessError('Account "Savings" already exists');

    // Service rejects with a domain error
    mockAccountService.createAccount.mockRejectedValue(error);

    const createTool = createCreateAccountTool({
      accountService: mockAccountService,
    });

    const input: CreateAccountInput = {
      name: "Savings",
      currency: "USD",
    };

    // Act & Assert
    await expect(
      createTool.invoke(input, { context: { userId } }),
    ).rejects.toBe(error);
  });
});
