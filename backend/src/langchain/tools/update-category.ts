import { tool } from "langchain";
import { z } from "zod";
import { CategoryService } from "../../services/category-service";
import {
  description,
  inputSchema,
  updateCategory,
} from "../../tools/update-category";
import { agentContextSchema } from "../agents/agent-context";

const schema = z.object(inputSchema).strict();

export type UpdateCategoryInput = z.infer<typeof schema>;

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

      return updateCategory(input, { categoryService, userId });
    },
    {
      name: "update_category",
      description,
      schema,
    },
  );
};
