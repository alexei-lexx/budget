import { z } from "zod";
import { Transaction } from "../models/transaction";
import { Failure, Result, Success } from "../types/result";
import { formatDateAsYYYYMMDD } from "../utils/date";
import { createCreateTransactionTool } from "./agent-tools/create-transaction-tool";
import { createGetAccountsTool } from "./agent-tools/get-accounts-tool";
import { createGetCategoriesTool } from "./agent-tools/get-categories-tool";
import { createGetTransactionsTool } from "./agent-tools/get-transactions-tool";
import { AccountRepository } from "./ports/account-repository";
import { Agent, AgentTraceMessage, ToolExecution } from "./ports/agent";
import { CategoryRepository } from "./ports/category-repository";
import { TransactionRepository } from "./ports/transaction-repository";
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
{{VOICE_AMOUNT_HINT}}

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

const VOICE_AMOUNT_HINT = `
- This description was captured via voice recognition
- Speech-to-text commonly collapses spoken prices — "two thirty four" becomes "234"
- The integer "234" may represent 2.34, 23.4, or 234
- Look up similar past transactions (same or related category, similar description) to assess which interpretation is most realistic
- If no similar history exists, use the amount as transcribed
`.trim();

const createdTransactionSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    data: z.object({
      id: z.string(),
    }),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

interface CreateTransactionFromTextInput {
  isVoiceInput?: boolean;
  text: string;
  userId: string;
}

type CreateTransactionFromTextOutput = Result<
  { transaction: Transaction; agentTrace: AgentTraceMessage[] },
  { message: string; agentTrace: AgentTraceMessage[] }
>;

export class CreateTransactionFromTextService {
  private agent: Agent;
  private accountRepository: AccountRepository;
  private categoryRepository: CategoryRepository;
  private transactionRepository: TransactionRepository;
  private transactionService: TransactionService;

  constructor(options: {
    accountRepository: AccountRepository;
    categoryRepository: CategoryRepository;
    transactionRepository: TransactionRepository;
    agent: Agent;
    transactionService: TransactionService;
  }) {
    this.agent = options.agent;
    this.accountRepository = options.accountRepository;
    this.categoryRepository = options.categoryRepository;
    this.transactionRepository = options.transactionRepository;
    this.transactionService = options.transactionService;
  }

  async call({
    userId,
    text,
    isVoiceInput = false,
  }: CreateTransactionFromTextInput): Promise<CreateTransactionFromTextOutput> {
    if (!userId) {
      return Failure({ message: "User ID is required", agentTrace: [] });
    }

    const normalizedText = text.trim();
    if (!normalizedText) {
      return Failure({ message: "Text is required", agentTrace: [] });
    }

    const today = formatDateAsYYYYMMDD(new Date());

    const createTransactionTool = createCreateTransactionTool({
      maxCreations: 1, // Limit to 1 transaction per call to prevent unexpected multiple creations
      transactionService: this.transactionService,
      userId,
    });

    const tools = [
      createGetAccountsTool(this.accountRepository, userId),
      createGetCategoriesTool({
        categoryRepository: this.categoryRepository,
        transactionRepository: this.transactionRepository,
        userId,
      }),
      createGetTransactionsTool({
        transactionRepository: this.transactionRepository,
        userId,
      }),
      createTransactionTool,
    ];

    const voiceAmountHint = isVoiceInput ? VOICE_AMOUNT_HINT : "";
    const systemPrompt = `${SYSTEM_PROMPT.replace("{{VOICE_AMOUNT_HINT}}", voiceAmountHint)}\n\nToday is ${today}.`;

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
        error: "Agent did not attempt to create a transaction",
        agentAnswer: answer,
      });

      return Failure({
        message:
          "Agent did not attempt to create a transaction" +
          (answer ? `\n${answer}` : ""),
        agentTrace,
      });
    }

    let transactionDataJson;
    try {
      transactionDataJson = JSON.parse(
        lastCreateTransactionToolExecution.output,
      );
    } catch (error) {
      console.log("Agent error", {
        error: error instanceof Error ? error.message : String(error),
        agentAnswer: answer,
        toolOutput: lastCreateTransactionToolExecution.output,
      });

      return Failure({
        message: "Response from agent is not valid JSON",
        agentTrace,
      });
    }

    const parsedTransactionData =
      createdTransactionSchema.safeParse(transactionDataJson);

    if (!parsedTransactionData.success) {
      console.log("Agent error", {
        error: z.prettifyError(parsedTransactionData.error),
        agentAnswer: answer,
        toolOutput: lastCreateTransactionToolExecution.output,
      });

      return Failure({
        message: "Response from agent does not match expected format",
        agentTrace,
      });
    }

    // Tool responded with a failure
    if (!parsedTransactionData.data.success) {
      console.log("Agent error", {
        error: parsedTransactionData.data.error,
        agentAnswer: answer,
        toolOutput: lastCreateTransactionToolExecution.output,
      });

      return Failure({
        message: "Agent failed to create transaction",
        agentTrace,
      });
    }

    const transactionId = parsedTransactionData.data.data.id;

    const transaction = await this.transactionService.getTransactionById(
      transactionId,
      userId,
    );
    return Success({ transaction, agentTrace });
  }
}
