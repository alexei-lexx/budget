import { tool } from "langchain";
import { z } from "zod";
import { CategoryType } from "../../models/category";
import { UpdateCategoryInput as UpdateCategoryServiceInput } from "../../ports/category-repository";
import { CategoryService } from "../../services/category-service";
import { Success } from "../../types/result";
import { agentContextSchema } from "../agents/agent-context";
import { toCategoryDto } from "./category-dto";

const schema = z
  .object({
    id: z.uuid().describe("Category ID to update"),
    name: z.string().optional().describe("New category name"),
    type: z
      .enum(CategoryType)
      .optional()
      .describe(
        `New category type: ${CategoryType.INCOME} or ${CategoryType.EXPENSE}`,
      ),
  })
  .strict();

export type UpdateCategoryInput = z.infer<typeof schema>;

const description = `
Update an existing category's name and/or type.

Before calling, check the user's existing active (non-archived) categories
to resolve the category id (never guess it or accept it from user input).
If the requested new name is a semantic near-variant of another existing active category
(pluralisation, typo, abbreviation, or synonym)
ask the user to confirm before updating.
Archived categories are not considered — reusing an archived category's name is not a duplicate.

Changing a category's excludeFromReports setting is not supported.
`.trim();

export const createUpdateCategoryTool = ({
  categoryService,
}: {
  categoryService: CategoryService;
}) => {
  return tool(
    async (input: UpdateCategoryInput, config) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );

      const serviceInput: UpdateCategoryServiceInput = {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.type !== undefined && { type: input.type }),
      };

      const updated = await categoryService.updateCategory(
        input.id,
        userId,
        serviceInput,
      );

      return Success(toCategoryDto(updated));
    },
    {
      name: "update_category",
      description,
      schema,
    },
  );
};
