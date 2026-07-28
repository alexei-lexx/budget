import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CategoryDto, toCategoryDto } from "../../langchain/tools/category-dto";
import { EntityScope } from "../../langchain/tools/get-accounts";
import { CategoryRepository } from "../../ports/category-repository";
import { Result, Success } from "../../types/result";
import { toToolResult } from "./to-tool-result";

export async function getCategories(
  { scope }: { scope: EntityScope },
  {
    categoryRepository,
    userId,
  }: {
    categoryRepository: CategoryRepository;
    userId: string;
  },
): Promise<Result<CategoryDto[]>> {
  const categories =
    await categoryRepository.findManyWithArchivedByUserId(userId);

  const filteredCategories = categories.filter((category) => {
    if (scope === EntityScope.ALL) return true;
    if (scope === EntityScope.ACTIVE) return !category.isArchived;
    return category.isArchived;
  });

  return Success(filteredCategories.map(toCategoryDto));
}

const inputSchema = {
  scope: z
    .enum(EntityScope)
    .describe(
      `Which categories to retrieve: "${EntityScope.ACTIVE}" for active (non-archived) only, "${EntityScope.ARCHIVED}" for archived only, "${EntityScope.ALL}" for both active and archived`,
    ),
};

const description = `
Get user categories filtered by scope.
Each category includes an isArchived flag.
`.trim();

export function registerGetCategoriesTool(
  server: McpServer,
  deps: { categoryRepository: CategoryRepository; userId: string },
): void {
  server.registerTool(
    "get_categories",
    { description, inputSchema },
    async ({ scope }) => toToolResult(await getCategories({ scope }, deps)),
  );
}
