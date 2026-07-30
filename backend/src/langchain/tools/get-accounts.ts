import { tool } from "langchain";
import { z } from "zod";
import { AccountService } from "../../services/account-service";
import { description, handler, inputSchema } from "../../tools/get-accounts";
import { agentContextSchema } from "../agents/agent-context";

const schema = z.object(inputSchema);

export const createGetAccountsTool = (accountService: AccountService) =>
  tool(
    async (input: z.infer<typeof schema>, config) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );

      return handler(input, { accountService, userId });
    },
    {
      name: "get_accounts",
      description,
      schema,
    },
  );
