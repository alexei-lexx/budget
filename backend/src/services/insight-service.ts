import { randomUUID } from "crypto";
import { ChatBedrockConverse } from "@langchain/aws";
import { encode } from "@toon-format/toon";
import { AIMessage, ToolMessage, createAgent } from "langchain";
import { IAccountRepository } from "../models/account";
import { ICategoryRepository } from "../models/category";
import { ITransactionRepository, Transaction } from "../models/transaction";
import { YEAR_RANGE_OFFSET } from "../types/validation";
import {
  createBedrockRuntimeClient,
  loadBedrockMaxTokens,
  loadBedrockModelId,
  loadBedrockRegion,
  loadBedrockTemperature,
} from "../utils/bedrock-runtime-client";
import { formatDateAsYYYYMMDD } from "../utils/date";
import { BusinessError, BusinessErrorCodes } from "./business-error";
import { createInsightTools } from "./insight/tools";

const MAX_PERIOD_DAYS = 366;

interface DateRange {
  startDate: string;
  endDate: string;
}

export interface InsightInput {
  question: string;
  dateRange: DateRange;
}

export class InsightService {
  constructor(
    private transactionRepository: ITransactionRepository,
    private accountRepository: IAccountRepository,
    private categoryRepository: ICategoryRepository,
  ) {}

  async call(userId: string, input: InsightInput): Promise<string> {
    if (!userId) {
      throw new BusinessError(
        "User ID is required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    const { question, dateRange } = input;

    const normalizedQuestion = question.trim();
    if (!normalizedQuestion) {
      throw new BusinessError(
        "Question is required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    const validatedDateRange = this.validateDateRange(dateRange);

    const transactions = await this.transactionRepository.findActiveByDateRange(
      userId,
      validatedDateRange.startDate,
      validatedDateRange.endDate,
    );

    const accountNamesById = await this.buildAccountLookupMap(
      transactions,
      userId,
    );
    const categoryNamesById = await this.buildCategoryLookupMaps(
      transactions,
      userId,
    );

    const dataPayload = this.buildDataPayload(
      transactions,
      validatedDateRange,
      accountNamesById,
      categoryNamesById,
    );

    const systemPrompt = this.buildSystemPrompt();
    const userInput = this.buildUserInput(
      normalizedQuestion,
      validatedDateRange,
      dataPayload,
    );

    // Create calculation tools
    const tools = createInsightTools();

    // Create Bedrock model via LangChain
    const model = new ChatBedrockConverse({
      model: loadBedrockModelId(),
      region: loadBedrockRegion(),
      maxTokens: loadBedrockMaxTokens(),
      temperature: loadBedrockTemperature(),
      client: createBedrockRuntimeClient(),
    });

    // Create ReAct agent with tools
    const agent = createAgent({
      model,
      tools,
      systemPrompt,
    });

    try {
      const result = await agent.invoke({
        messages: [{ role: "user", content: userInput }],
      });

      // Extract tool calls for user-facing summary
      const toolCallsSummary = new Map<
        string,
        {
          tool: string;
          args: string;
          result: string;
        }
      >();

      // Collect tool calls and results from agent conversation
      result.messages.forEach((message) => {
        if (message instanceof AIMessage) {
          for (const toolCall of message.tool_calls || []) {
            const toolCallId = toolCall.id || randomUUID();
            toolCallsSummary.set(toolCallId, {
              tool: toolCall.name,
              args: JSON.stringify(toolCall.args),
              result: "Not executed",
            });
          }
        } else if (message instanceof ToolMessage) {
          const toolCallId = message.tool_call_id || randomUUID();
          const existing = toolCallsSummary.get(toolCallId);

          if (existing) {
            toolCallsSummary.set(toolCallId, {
              ...existing,
              result: message.content
                ? String(message.content)
                : "Unknown result",
            });
          } else {
            toolCallsSummary.set(toolCallId, {
              tool: message.name || "Unknown tool",
              args: "Unknown arguments",
              result: message.content
                ? String(message.content)
                : "Unknown result",
            });
          }
        }
      });

      // Extract final answer from agent messages
      const lastMessage = result.messages[result.messages.length - 1];

      if (!lastMessage || !lastMessage.content) {
        throw new BusinessError(
          "Empty response",
          BusinessErrorCodes.EMPTY_RESPONSE,
        );
      }

      let finalAnswer =
        typeof lastMessage.content === "string"
          ? lastMessage.content
          : String(lastMessage.content);

      // Append tool calls summary to the response for observability
      const toolCallsSummaryArray = Array.from(toolCallsSummary.values());
      if (toolCallsSummaryArray.length > 0) {
        const calculations = toolCallsSummaryArray.map((call, index) => {
          const formattedArgs = this.formatToolArguments(call.args);
          return `${index + 1}. ${call.tool}(${formattedArgs}) = ${call.result}`;
        });

        finalAnswer += "\n\n---\n**Tools performed:**\n";
        finalAnswer += calculations.join("\n") + "\n";
      }

      return finalAnswer;
    } catch (error) {
      console.error("Failed to generate AI insight:", error);
      throw error;
    }
  }

  private validateDateRange(dateRange: DateRange): DateRange {
    if (!dateRange.startDate) {
      throw new BusinessError(
        "Start date is required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    if (!dateRange.endDate) {
      throw new BusinessError(
        "End date is required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    const startDate = this.parseDate(dateRange.startDate, "Start date");
    const endDate = this.parseDate(dateRange.endDate, "End date");

    if (startDate > endDate) {
      throw new BusinessError(
        "Start date must be before or equal to end date",
        BusinessErrorCodes.INVALID_DATE,
      );
    }

    const differenceInDays =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (differenceInDays > MAX_PERIOD_DAYS) {
      throw new BusinessError(
        `Date range cannot exceed ${MAX_PERIOD_DAYS} days`,
        BusinessErrorCodes.INVALID_DATE,
      );
    }

    return { ...dateRange };
  }

  private parseDate(value: string, fieldName: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BusinessError(
        `${fieldName} must be a valid date in YYYY-MM-DD format`,
        BusinessErrorCodes.INVALID_DATE,
      );
    }

    const currentYear = new Date().getFullYear();
    const minimumYear = currentYear - YEAR_RANGE_OFFSET;
    const maximumYear = currentYear + YEAR_RANGE_OFFSET;
    const yearValue = parsed.getFullYear();

    if (yearValue < minimumYear || yearValue > maximumYear) {
      throw new BusinessError(
        `${fieldName} must be between ${minimumYear} and ${maximumYear}`,
        BusinessErrorCodes.INVALID_DATE,
      );
    }

    return parsed;
  }

  private buildDataPayload(
    transactions: Transaction[],
    dateRange: DateRange,
    accountNamesById: Map<string, string>,
    categoryNamesById: Map<string, string>,
  ): string {
    if (transactions.length === 0) {
      return `No transactions were recorded between ${dateRange.startDate} and ${dateRange.endDate}.`;
    }

    const transactionRows = transactions.map((transaction) => {
      const accountName =
        accountNamesById.get(transaction.accountId) ?? "Unknown account";

      const categoryName = transaction.categoryId
        ? (categoryNamesById.get(transaction.categoryId) ?? "Unknown category")
        : "Uncategorized";

      return {
        date: transaction.date,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        account: accountName,
        category: categoryName,
        description: transaction.description || "",
      };
    });

    const data = {
      transactions: transactionRows,
    };

    return encode(data);
  }

  private async buildAccountLookupMap(
    transactions: Transaction[],
    userId: string,
  ): Promise<Map<string, string>> {
    const accountIds = Array.from(
      new Set(transactions.map((transaction) => transaction.accountId)),
    );

    const accounts =
      accountIds.length > 0
        ? await this.accountRepository.findByIds(accountIds, userId)
        : [];

    const accountNamesById = new Map(
      accounts.map((account) => [account.id, account.name]),
    );

    return accountNamesById;
  }

  private async buildCategoryLookupMaps(
    transactions: Transaction[],
    userId: string,
  ): Promise<Map<string, string>> {
    const categoryIds = Array.from(
      new Set(
        transactions
          .map((transaction) => transaction.categoryId)
          .filter((categoryId) => categoryId !== undefined),
      ),
    );

    const categories =
      categoryIds.length > 0
        ? await this.categoryRepository.findByIds(categoryIds, userId)
        : [];

    const categoryNamesById = new Map(
      categories.map((category) => [category.id, category.name]),
    );

    return categoryNamesById;
  }

  private buildUserInput(
    question: string,
    dateRange: DateRange,
    dataPayload: string,
  ): string {
    return [
      `I have a list of transactions between ${dateRange.startDate} and ${dateRange.endDate}.`,
      "The data is in TOON format. Each transaction has: date, type, amount, currency, account, category, description.",
      "",
      "Here are the transactions:",
      "",
      dataPayload,
      "",
      `My question: ${question}`,
    ].join("\n");
  }

  private buildSystemPrompt(): string {
    const currentDate = formatDateAsYYYYMMDD(new Date());

    return [
      "You are a personal finance assistant.",
      "Answer user's questions based on the provided transaction data.",
      "",
      "Transaction types: INCOME, EXPENSE, REFUND, TRANSFER_IN, TRANSFER_OUT.",
      "Refunds are money returned from previous expenses.",
      "Transfers are internal movements between accounts.",
      "",
      "Keep responses concise. Use plain text only, no markdown.",
      "",
      `Today is ${currentDate}.`,
    ].join("\n");
  }

  private formatToolArguments(jsonInput: string): string {
    try {
      const parsed = JSON.parse(jsonInput);

      // If there's a single 'input' key with a string value, try parsing that
      if (
        Object.keys(parsed).length === 1 &&
        "input" in parsed &&
        typeof parsed.input === "string"
      ) {
        try {
          const nestedParsed = JSON.parse(parsed.input);
          return this.formatParsedArguments(nestedParsed);
        } catch {
          // If nested parsing fails, continue with outer parsed object
        }
      }

      return this.formatParsedArguments(parsed);
    } catch {
      // Fallback to simple string cleaning if parsing fails
      return jsonInput
        .replace(/^{|}$/g, "")
        .replace(/"/g, "")
        .replace(/,/g, ", ");
    }
  }

  private formatParsedArguments(parsed: Record<string, unknown>): string {
    const entries = Object.entries(parsed);

    if (entries.length === 0) {
      return "";
    }

    // Format as "key: value" pairs
    return entries
      .map(([key, value]) => {
        const formattedValue = Array.isArray(value)
          ? `[${value.join(", ")}]`
          : JSON.stringify(value);
        return `${key}: ${formattedValue}`;
      })
      .join(", ");
  }
}
