import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { AccountService } from "../../services/account-service";
import { BusinessError } from "../../services/business-error";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { createMockAccountService } from "../../utils/test-utils/services/account-service-mocks";
import { CreateAccountInput, createCreateAccountTool } from "./create-account";

describe("createCreateAccountTool", () => {
  let mockAccountService: Mocked<AccountService>;
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

  it("wires input and context userId through to the shared handler", async () => {
    // Arrange
    const created = fakeAccount({ name: "Savings", currency: "USD" });
    mockAccountService.createAccount.mockResolvedValue(created);

    const createTool = createCreateAccountTool({
      accountService: mockAccountService,
    });

    const input: CreateAccountInput = { name: "Savings", currency: "USD" };

    // Act
    const result = await createTool.invoke(input, { context: { userId } });

    // Assert
    expect(result).toMatchObject({ success: true });
    expect(mockAccountService.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({ userId, name: "Savings", currency: "USD" }),
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

  it("returns failure when the shared handler catches a BusinessError", async () => {
    // Arrange
    mockAccountService.createAccount.mockRejectedValue(
      new BusinessError('Account "Savings" already exists'),
    );

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
      success: false,
      error: 'Account "Savings" already exists',
    });
  });
});
