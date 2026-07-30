import { tool } from "langchain";
import { z } from "zod";
import { AccountService } from "../../services/account-service";
import { description, inputSchema, handler } from "../../tools/update-account";
import { agentContextSchema } from "../agents/agent-context";

const schema = z.object(inputSchema).strict();

export type UpdateAccountInput = z.infer<typeof schema>;

export const createUpdateAccountTool = ({
  accountService,
}: {
  accountService: AccountService;
}) => {
  return tool(
    async (input: UpdateAccountInput, config) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );

      return handler(input, { accountService, userId });
    },
    {
      name: "update_account",
      description,
      schema,
    },
  );
};
