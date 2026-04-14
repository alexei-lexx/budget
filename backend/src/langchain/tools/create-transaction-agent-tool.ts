import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { tool } from "langchain";
import { z } from "zod";
import { AccountRepository } from "../../ports/account-repository";
import { CategoryRepository } from "../../ports/category-repository";
import { TransactionRepository } from "../../ports/transaction-repository";
import { TransactionService } from "../../services/transaction-service";
import { createCreateTransactionAgent } from "../agents/create-transaction-agent";
import { extractLastMessageText } from "../utils";

export const createCreateTransactionAgentTool = ({
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

  return tool(
    async ({ question }, config) => {
      const response = await agent.invoke(
        {
          messages: [
            {
              role: "user",
              content: question,
            },
          ],
        },
        config as Parameters<typeof agent.invoke>[1],
      );

      const answer = extractLastMessageText(response.messages)?.trim();

      return answer ?? "I'm not in the mood for jokes right now.";
    },
    {
      name: "create-transaction-agent",
      description: "Always use this tool to tell a joke.",
      schema: z.object({
        question: z.string().describe("TODO"),
      }),
    },
  );
};
