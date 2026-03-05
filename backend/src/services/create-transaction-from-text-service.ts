import { z } from "zod";
import { Agent, ToolExecution } from "../models/agent";
import { Transaction } from "../models/transaction";
import { toDateString } from "../types/date";
import { formatDateAsYYYYMMDD } from "../utils/date";
import { AgentDataService } from "./agent-data-service";
import {
  createCreateTransactionTool,
  createGetAccountsTool,
  createGetCategoriesTool,
  createGetTransactionsTool,
} from "./agent-data-tools";
import { BusinessError, BusinessErrorCodes } from "./business-error";
import { TransactionService } from "./transaction-service";

// How many days back the agent may look for transaction history
const HISTORY_DAYS = 365;

const SYSTEM_PROMPT = `
## Role

You are an agent that creates payment transactions based on user input in natural language.

## Task

The user describes a transaction in plain text (e.g., "morning coffee 4.5 euro").
You must infer all required and optional transaction fields and persist the transaction.

## Process

1. Retrieve the user's active accounts
   - If there are no active accounts, then the transaction cannot be created. Respond with an error and stop
   - If there are active accounts, then continue to the next step

2. Infer the transaction amount
   - Extract from numeric or written values in the user's text
   - If impossible to infer, then the transaction cannot be created. Respond with an error and stop
   - If multiple amounts are possible, respond with an error that only one transaction can be created at a time and stop

3. Infer the transaction type
   - Use income if the text implies earning money (e.g., "salary", "earned", "received")
   - Use refund if the text implies a refund (e.g., "refund", "returned")
   - Use expense if the text implies spending money (e.g., "bought", "paid", "spent")
   - If difficult to infer, default to expense

4. Infer the transaction category
   - Retrieve a list of the user's active categories for the inferred transaction type
   - Detect indicators in the user's text that can be linked to any of these categories
   - Such indicators can be the category name itself, its synonyms, store names, product names, or any other relevant hint
   - If not possible to infer, leave category blank. This is not a required field

5. Infer the transaction account
   - If there is any currency hint in the user's text, narrow down to accounts with that currency
   - If category was inferred in the previous steps, fetch recent transactions for this category and remember which accounts were used
   - If no category was inferred, fetch recent transactions for the user and remember which accounts were used overall
   - If no transactions fetched at all, then consider the accounts as equally used
   - Pick the most used account among the candidate accounts matching the currency hint (if any)
   - Or pick the first account as a fallback

6. Infer the transaction date
   - If there is a date hint in the user's text, extract it and use it as the transaction date
   - If no date hint, use today's date

7. Infer the transaction description
   - Derive it from the input text if meaningful, otherwise leave blank

8. Persist the transaction with the inferred fields
   - If persistence is successful, respond with the transaction details (see Output section below)
   - If persistence fails for any reason, analyze the error and repeat the inference and persistence steps
   - You have up to 2 attempts to persist the transaction. If after 2 attempts the transaction cannot be created, respond with an error and stop

## Output

- If the transaction is successfully created, respond with OK
- If the transaction cannot be created, respond with an error message explaining why
`.trim();

const createdTransactionSchema = z.object({
  id: z.string(),
});

export class CreateTransactionFromTextService {
  private agent: Agent;
  private agentDataService: AgentDataService;
  private transactionService: TransactionService;

  constructor(options: {
    agentDataService: AgentDataService;
    agent: Agent;
    transactionService: TransactionService;
  }) {
    this.agent = options.agent;
    this.agentDataService = options.agentDataService;
    this.transactionService = options.transactionService;
  }

  async call(userId: string, text: string): Promise<Transaction> {
    if (!userId) {
      throw new BusinessError(
        "User ID is required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    const normalizedText = text.trim();
    if (!normalizedText) {
      throw new BusinessError(
        "Text is required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    const today = formatDateAsYYYYMMDD(new Date());
    const historyStartDate = formatDateAsYYYYMMDD(
      new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000),
    );

    const createTransactionTool = createCreateTransactionTool(
      this.transactionService,
      userId,
    );

    const tools = [
      createGetAccountsTool(this.agentDataService, userId),
      createGetCategoriesTool(this.agentDataService, userId),
      createGetTransactionsTool({
        agentDataService: this.agentDataService,
        userId,
        allowedStartDate: toDateString(historyStartDate),
        allowedEndDate: toDateString(today),
      }),
      createTransactionTool,
    ];

    const systemPrompt = `${SYSTEM_PROMPT}\n\nToday is ${today}.`;

    const { answer, toolExecutions } = await this.agent.call({
      messages: [{ role: "user", content: normalizedText }],
      systemPrompt,
      tools,
    });

    if (toolExecutions && toolExecutions.length > 0) {
      this.logToolExecution(toolExecutions);
    }

    const lastCreateTransactionToolExecution = toolExecutions
      ? toolExecutions.findLast(
          (toolExecution) => toolExecution.tool === createTransactionTool.name,
        )
      : undefined;

    if (!lastCreateTransactionToolExecution) {
      console.log("Agent error", {
        code: BusinessErrorCodes.AGENT_DECLINED,
        error: "Agent did not attempt to create a transaction",
        agentAnswer: answer,
        toolExecutions,
      });

      throw new BusinessError(
        "Agent did not attempt to create a transaction" +
          (answer ? `\n${answer}` : ""),
        BusinessErrorCodes.AGENT_DECLINED,
      );
    }

    let transactionDataJson;
    try {
      transactionDataJson = JSON.parse(
        lastCreateTransactionToolExecution.output,
      );
    } catch (error) {
      console.log("Agent error", {
        code: BusinessErrorCodes.INVALID_AGENT_RESPONSE,
        error: error instanceof Error ? error.message : String(error),
        agentAnswer: answer,
        toolOutput: lastCreateTransactionToolExecution.output,
      });

      throw new BusinessError(
        "Response from agent is not valid JSON",
        BusinessErrorCodes.INVALID_AGENT_RESPONSE,
      );
    }

    const parsedTransactionData =
      createdTransactionSchema.safeParse(transactionDataJson);

    if (!parsedTransactionData.success) {
      console.log("Agent error", {
        code: BusinessErrorCodes.INVALID_AGENT_RESPONSE,
        error: z.prettifyError(parsedTransactionData.error),
        agentAnswer: answer,
        toolOutput: lastCreateTransactionToolExecution.output,
      });

      throw new BusinessError(
        "Response from agent does not match expected format",
        BusinessErrorCodes.INVALID_AGENT_RESPONSE,
      );
    }

    const transactionId = parsedTransactionData.data.id;

    return this.transactionService.getTransactionById(transactionId, userId);
  }

  private logToolExecution(toolExecutions: ToolExecution[]) {
    for (let index = 0; index < toolExecutions.length; index++) {
      console.log(`Tool execution #${index}`, {
        tool: toolExecutions[index].tool,
        input: toolExecutions[index].input,
        output: toolExecutions[index].output,
      });
    }
  }
}
