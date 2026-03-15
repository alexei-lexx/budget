import { faker } from "@faker-js/faker";
import { fakeAccount } from "../../utils/test-utils/factories";
import { createMockAgentDataService } from "../../utils/test-utils/mock-services";
import { EntityScope, type IAgentDataService } from "../agent-data-service";
import { createGetAccountsTool } from "./get-accounts-tool";

describe("createGetAccountsTool", () => {
  let mockAgentDataService: jest.Mocked<IAgentDataService>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockAgentDataService = createMockAgentDataService();
  });

  it("should return tool with correct name", () => {
    const tool = createGetAccountsTool(mockAgentDataService, userId);

    expect(tool.name).toBe("getAccounts");
  });

  it("should return accounts as JSON string", async () => {
    const accounts = [fakeAccount(), fakeAccount()];
    const accountsData = accounts.map((account) => ({
      id: account.id,
      name: account.name,
      currency: account.currency,
      isArchived: account.isArchived,
    }));
    mockAgentDataService.getAccounts.mockResolvedValue(accountsData);

    const tool = createGetAccountsTool(mockAgentDataService, userId);
    const scope = faker.helpers.arrayElement([
      EntityScope.ACTIVE,
      EntityScope.ARCHIVED,
      EntityScope.ALL,
    ]);
    const result = await tool.func({ scope });

    expect(result).toBe(JSON.stringify(accountsData));
    expect(mockAgentDataService.getAccounts).toHaveBeenCalledWith(
      userId,
      scope,
    );
  });
});
