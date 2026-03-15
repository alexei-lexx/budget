import { z } from "zod";
import { Transaction } from "../models/transaction";
import { formatDateAsYYYYMMDD } from "../utils/date";
import { IAgentDataService } from "./agent-data-service";
import { createCreateTransactionTool } from "./agent-tools/create-transaction-tool";
import { createGetAccountsTool } from "./agent-tools/get-accounts-tool";
import { createGetCategoriesTool } from "./agent-tools/get-categories-tool";
import { createGetTransactionsTool } from "./agent-tools/get-transactions-tool";
import { BusinessError, BusinessErrorCodes } from "./business-error";
import { Agent, AgentTraceMessage, ToolExecution } from "./ports/agent";
import { TransactionService } from "./transaction-service";

const SYSTEM_PROMPT = `
## Role

You are an agent that creates payment transactions based on user input in natural language.

## Task

The user describes a transaction in plain text (e.g., "morning coffee 4.5 euro").
You MUST infer all mandatory and optional transaction fields and then MUST persist the transaction.

## Process

1. Infer all transaction fields — both mandatory and optional — following the rules below
2. If a mandatory field cannot be inferred, MUST stop and respond with an error
3. Create the transaction with all inferred fields
4. If creation fails, analyze the error and retry once with corrected fields
5. If the second attempt also fails, respond with an error and stop

## Inference rules

### Type

- Mandatory field
- Supported values:
  - income — money received (e.g., salary, earned, received)
  - expense — money spent (e.g., bought, paid, spent)
  - refund — money returned for a previous expense (e.g., refund, returned)
- Default to expense when intent is unclear

### Amount

- Mandatory field
- Numeric or written value representing a money quantity (e.g., 25, 20.5, "twenty five euros")
- If multiple amounts are present, MUST stop and report an error — only one transaction at a time

### Account

- Mandatory field
- Account MUST be active
- Select by priority:
  1. Currency match — account MUST match the mentioned currency
  2. Name match — prefer the account named or implied in user input
  3. Category history — prefer the account most used with the inferred category
  4. Overall history — prefer the account most used overall
- MUST look up past transactions for history-based criteria — do not guess

### Category

- Optional field
- Category MUST be active
- Infer by priority:
  1. Name match — category name mentioned in user input
  2. Signal match — synonyms, store names, product names imply a category
  3. History — most used category for similar transactions
- May look up past transactions for history-based criteria — do not guess

### Date

- Mandatory field
- Default to today's date unless an explicit date is provided

### Description

- Optional field
- Keep the original language of the user's text
- MUST be grammatically correct, without typos
- MUST describe the item or service — not the reason, parties, or context
- MUST provide meaningful details that supplement the transaction
- MUST NOT build description from the category name, its variations, or its translations
- Default to blank if no meaningful description can be formed

## Output

- If the transaction is successfully created, respond with OK
- If the transaction cannot be created, respond with an error message explaining why
`.trim();

const createdTransactionSchema = z.object({
  id: z.string(),
});

export class CreateTransactionFromTextService {
  private agent: Agent;
  private agentDataService: IAgentDataService;
  private transactionService: TransactionService;

  constructor(options: {
    agentDataService: IAgentDataService;
    agent: Agent;
    transactionService: TransactionService;
  }) {
    this.agent = options.agent;
    this.agentDataService = options.agentDataService;
    this.transactionService = options.transactionService;
  }

  async call(
    userId: string,
    text: string,
  ): Promise<{ transaction: Transaction; agentTrace: AgentTraceMessage[] }> {
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

    const createTransactionTool = createCreateTransactionTool({
      maxCreations: 1, // Limit to 1 transaction per call to prevent unexpected multiple creations
      transactionService: this.transactionService,
      userId,
    });

    const tools = [
      createGetAccountsTool(this.agentDataService, userId),
      createGetCategoriesTool(this.agentDataService, userId),
      createGetTransactionsTool({
        agentDataService: this.agentDataService,
        userId,
      }),
      createTransactionTool,
    ];

    const systemPrompt = `${SYSTEM_PROMPT}\n\nToday is ${today}.`;

    const { answer, toolExecutions, agentTrace } = await this.agent.call({
      messages: [{ role: "user", content: normalizedText }],
      systemPrompt,
      tools,
    });

    const lastCreateTransactionToolExecution: ToolExecution | undefined =
      toolExecutions && toolExecutions.length > 0
        ? toolExecutions.findLast(
            (toolExecution) =>
              toolExecution.tool === createTransactionTool.name,
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

    const transaction = await this.transactionService.getTransactionById(
      transactionId,
      userId,
    );
    return { transaction, agentTrace };
  }
}
