import { tool } from "langchain";
import { z } from "zod";
import {
  CreateTransactionServiceInput,
  TransactionService,
} from "../../services/transaction-service";
import {
  createTransaction,
  description,
  inputSchema,
} from "../../tools/create-transaction";
import { agentContextSchema } from "../agents/agent-context";

const schema = z.object(inputSchema);

export type CreateTransactionInput = z.infer<typeof schema>;

export const CREATE_TRANSACTION_TOOL_NAME = "create_transaction";

export const createCreateTransactionTool = ({
  transactionService,
}: {
  transactionService: TransactionService;
}) => {
  return tool(
    async (input: CreateTransactionInput, config) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );

      const serviceInput: CreateTransactionServiceInput = { ...input };

      return createTransaction(serviceInput, { transactionService, userId });
    },
    {
      name: CREATE_TRANSACTION_TOOL_NAME,
      description,
      schema,
    },
  );
};
