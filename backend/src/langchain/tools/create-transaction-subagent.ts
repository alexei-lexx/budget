import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { tool } from "langchain";
import { z } from "zod";
import { AccountRepository } from "../../ports/account-repository";
import { CategoryRepository } from "../../ports/category-repository";
import { TransactionRepository } from "../../ports/transaction-repository";
import { TransactionService } from "../../services/transaction-service";
import { createCreateTransactionAgent } from "../agents/create-transaction-agent";
import { extractLastMessageText } from "../utils";

export const createCreateTransactionSubagentTool = ({
  model,
  accountRepository,
  categoryRepository,
  transactionRepository,
  transactionService,
}: {
  model: BaseChatModel;
  accountRepository: AccountRepository;
  categoryRepository: CategoryRepository;
  transactionRepository: TransactionRepository;
  transactionService: TransactionService;
}) => {
  const agent = createCreateTransactionAgent({
    model,
    accountRepository,
    categoryRepository,
    transactionRepository,
    transactionService,
  });

  // The agent's invoke accepts a narrower config type than LangChain's generic
  // ToolRunnableConfig. The cast is safe: LangChain always propagates the full
  // runnable config (including context) from the outer agent to tool functions.
  type AgentInvokeConfig = Parameters<typeof agent.invoke>[1];

  return tool(
    async ({ text }, config) => {
      const response = await agent.invoke(
        {
          messages: [
            {
              role: "user",
              content: text,
            },
          ],
        },
        config as AgentInvokeConfig,
      );

      const answer = extractLastMessageText(response.messages)?.trim();

      return (
        answer ??
        "I was unable to process that transaction. Please try again with more details."
      );
    },
    {
      name: "create_transaction_subagent",
      description:
        "Create a transaction from a natural-language description of a financial event " +
        "(e.g. 'bought coffee 5€', 'paid rent 800', 'received salary').",
      schema: z.object({
        text: z
          .string()
          .describe("The user's description of the transaction to create"),
      }),
    },
  );
};
