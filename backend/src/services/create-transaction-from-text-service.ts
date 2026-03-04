import { Agent } from "../models/agent";
import { Transaction } from "../models/transaction";
import { DateString, toDateString } from "../types/date";
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

/**
 * How many days back the agent may look for transaction history
 * Used for account resolution via category history (FR-005)
 */
const HISTORY_DAYS = 365;

const SYSTEM_PROMPT = `
## Role

You are a personal finance assistant that creates transactions from natural-language descriptions.

## Task

The user describes a transaction in plain text (e.g. "spent 45 euro at rewe yesterday").
You must infer all required transaction fields and call the createTransaction tool to persist it.

## Process

1. Call getAccounts to retrieve the user's accounts.
2. Call getCategories to retrieve the user's categories.
3. Call getTransactions to retrieve recent transaction history (use today's date as end date and go back up to one year).
4. Infer all fields from the text and the data retrieved:
   - type: INCOME, EXPENSE, or REFUND (see Type Rule below)
   - amount: positive number extracted from text
   - date: YYYY-MM-DD (parse relative dates; default to today)
   - description: meaningful text token(s) from the input (omit when nothing meaningful)
   - categoryId: closest matching category for the inferred type (omit when no reasonable match)
   - accountId: selected per the Account Resolution rule below
5. Call createTransaction with all resolved fields.
6. Output ONLY: {"transaction":{"id":"<id from createTransaction result>"}}

## Type Rule

- Keywords salary, earn, earned, received → type INCOME
- Keyword refund → type REFUND
- Everything else → type EXPENSE

## Account Resolution Rule (FR-005)

1. If a currency is mentioned in the text, prefer accounts with that currency.
2. Among currency-matching accounts (or all accounts if no currency match): pick the account most used for the inferred category in recent transaction history.
3. If no category history: pick the account most used overall in recent history.
4. If no history at all: pick the first account.

## createTransaction tool

Call this tool once you have resolved all fields. It persists the transaction and returns the full transaction object.
Extract the id from the result and output {"transaction":{"id":"<id>"}} as your final answer — no other text.

## Error Handling

If you cannot extract the amount, or there are no accounts available: explain why and do NOT call createTransaction.
`.trim();

interface AgentAnswer {
  transaction: {
    id: string;
  };
}

export class CreateTransactionFromTextService {
  constructor(
    private agentDataService: AgentDataService,
    private agent: Agent,
    private transactionService: TransactionService,
  ) {}

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

    const dataTools = [
      createGetAccountsTool(this.agentDataService, userId),
      createGetCategoriesTool(this.agentDataService, userId),
      createGetTransactionsTool({
        agentDataService: this.agentDataService,
        userId,
        allowedStartDate: toDateString(historyStartDate) as DateString,
        allowedEndDate: toDateString(today) as DateString,
      }),
    ];

    const createTransactionTool = createCreateTransactionTool(
      this.transactionService,
      userId,
    );

    const tools = [...dataTools, createTransactionTool];

    const systemPrompt = `${SYSTEM_PROMPT}\n\nToday's date is ${today}.`;

    const response = await this.agent.call({
      messages: [{ role: "user", content: normalizedText }],
      systemPrompt,
      tools,
    });

    if (!response.answer) {
      throw new BusinessError(
        "Empty response from agent",
        BusinessErrorCodes.EMPTY_RESPONSE,
      );
    }

    let parsed: AgentAnswer;
    try {
      const raw: unknown = JSON.parse(response.answer);
      if (
        typeof raw !== "object" ||
        raw === null ||
        !("transaction" in raw) ||
        typeof (raw as Record<string, unknown>).transaction !== "object" ||
        (raw as Record<string, unknown>).transaction === null
      ) {
        throw new Error("Missing transaction.id in agent answer");
      }
      const transactionField = (raw as Record<string, unknown>)
        .transaction as Record<string, unknown>;
      if (typeof transactionField.id !== "string" || !transactionField.id) {
        throw new Error("Missing transaction.id in agent answer");
      }
      parsed = raw as AgentAnswer;
    } catch {
      // Agent returned a plain-text explanation — required fields were not resolved
      throw new BusinessError(
        response.answer,
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    return this.transactionService.getTransactionById(
      parsed.transaction.id,
      userId,
    );
  }
}
