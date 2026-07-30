import { tool } from "langchain";
import { z } from "zod";
import { CategoryService } from "../../services/category-service";
import { handler, description, inputSchema } from "../../tools/create-category";
import { agentContextSchema } from "../agents/agent-context";

const schema = z.object(inputSchema);

export type CreateCategoryInput = z.infer<typeof schema>;

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

      return handler(input, { categoryService, userId });
    },
    {
      name: "create_category",
      description,
      schema,
    },
  );
};
