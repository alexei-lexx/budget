import { tool } from "langchain";
import { z } from "zod";
import { CategoryType } from "../../models/category";
import { CategoryService } from "../../services/category-service";
import { Success } from "../../types/result";
import { agentContextSchema } from "../agents/agent-context";
import { toCategoryDto } from "./category-dto";

const schema = z.object({
  name: z.string().describe("Category name"),
  type: z.enum(CategoryType).describe("Category type: INCOME or EXPENSE"),
});

export type CreateCategoryInput = z.infer<typeof schema>;

const description = `
Create a new category for the user.

Before calling, check the user's existing categories.
If the requested name is a semantic near-variant of an existing one
(pluralisation, typo, abbreviation, or synonym)
ask the user to confirm before creating.
`.trim();

export const createCreateCategoryTool = ({
  categoryService,
}: {
  categoryService: CategoryService;
}) => {
  return tool(
    async (input: CreateCategoryInput, config) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );

      const created = await categoryService.createCategory({
        userId,
        name: input.name,
        type: input.type,
        excludeFromReports: false,
      });

      return Success(toCategoryDto(created));
    },
    {
      name: "create_category",
      description,
      schema,
    },
  );
};
