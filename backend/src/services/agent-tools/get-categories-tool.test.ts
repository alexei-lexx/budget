import { faker } from "@faker-js/faker";
import { fakeCategory } from "../../utils/test-utils/factories";
import { createMockAgentDataService } from "../../utils/test-utils/mock-services";
import { EntityScope, type IAgentDataService } from "../agent-data-service";
import { createGetCategoriesTool } from "./get-categories-tool";

describe("createGetCategoriesTool", () => {
  let mockAgentDataService: jest.Mocked<IAgentDataService>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockAgentDataService = createMockAgentDataService();
  });

  it("should return tool with correct name", () => {
    const tool = createGetCategoriesTool(mockAgentDataService, userId);

    expect(tool.name).toBe("getCategories");
  });

  it("should return categories as JSON string", async () => {
    const categories = [fakeCategory(), fakeCategory()];
    const categoriesData = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      type: cat.type,
      isArchived: cat.isArchived,
      recentDescriptions: [],
    }));
    mockAgentDataService.getCategories.mockResolvedValue(categoriesData);

    const tool = createGetCategoriesTool(mockAgentDataService, userId);
    const scope = faker.helpers.arrayElement([
      EntityScope.ACTIVE,
      EntityScope.ARCHIVED,
      EntityScope.ALL,
    ]);
    const result = await tool.func({ scope });

    expect(result).toBe(JSON.stringify(categoriesData));
    expect(mockAgentDataService.getCategories).toHaveBeenCalledWith(
      userId,
      scope,
    );
  });
});
