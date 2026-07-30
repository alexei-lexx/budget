import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { AccountService } from "../../services/account-service";
import { EntityScope } from "../../types/entity-scope";
import { createMockAccountService } from "../../utils/test-utils/services/account-service-mocks";
import { createGetAccountsTool } from "./get-accounts";

describe("createGetAccountsTool", () => {
  let mockAccountService: Mocked<AccountService>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockAccountService = createMockAccountService();
  });

  it("returns tool with correct name", () => {
    const accountsTool = createGetAccountsTool(mockAccountService);

    expect(accountsTool.name).toBe("get_accounts");
  });

  it("throws when userId in context is not valid UUID", async () => {
    const accountsTool = createGetAccountsTool(mockAccountService);

    await expect(
      accountsTool.invoke(
        { scope: EntityScope.ALL },
        { context: { userId: "not-a-uuid" } },
      ),
    ).rejects.toThrow();
  });

  it("wires input and context userId through to the shared handler", async () => {
    mockAccountService.getAccountsByUser.mockResolvedValue([]);

    const accountsTool = createGetAccountsTool(mockAccountService);
    await accountsTool.invoke(
      { scope: EntityScope.ARCHIVED },
      { context: { userId } },
    );

    expect(mockAccountService.getAccountsByUser).toHaveBeenCalledWith(
      userId,
      EntityScope.ARCHIVED,
    );
  });
});
