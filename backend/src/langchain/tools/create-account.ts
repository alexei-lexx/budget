import { tool } from "langchain";
import { z } from "zod";
import { AccountService } from "../../services/account-service";
import {
  createAccount,
  description,
  inputSchema,
} from "../../tools/create-account";
import { agentContextSchema } from "../agents/agent-context";

const schema = z.object(inputSchema);

export type CreateAccountInput = z.infer<typeof schema>;

export const createCreateAccountTool = ({
  accountService,
}: {
  accountService: AccountService;
}) => {
  return tool(
    async (input: CreateAccountInput, config) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );

      return createAccount(input, { accountService, userId });
    },
    {
      name: "create_account",
      description,
      schema,
    },
  );
};
