import { ReactAgent } from "langchain";
import {
  extractAgentTrace,
  extractLastMessageText,
} from "../../langchain/agents/utils";
import { Failure, Result, Success } from "../../types/result";
import { formatDateAsYYYYMMDD } from "../../utils/date";
import { AccountRepository } from "../ports/account-repository";
import { AgentMessage, AgentTraceMessage } from "../ports/agent";
import { CategoryRepository } from "../ports/category-repository";
import { TransactionRepository } from "../ports/transaction-repository";

export interface InsightInput {
  question: string;
  history?: readonly AgentMessage[];
}

type InsightOutput = Result<
  { answer: string; agentTrace: AgentTraceMessage[] },
  { message: string; agentTrace: AgentTraceMessage[] }
>;

export interface InsightService {
  call(userId: string, input: InsightInput): Promise<InsightOutput>;
}

export class InsightServiceImpl implements InsightService {
  private accountRepository: AccountRepository;
  private categoryRepository: CategoryRepository;
  private transactionRepository: TransactionRepository;
  private insightAgent: ReactAgent;

  constructor({
    accountRepository,
    categoryRepository,
    transactionRepository,
    insightAgent,
  }: {
    accountRepository: AccountRepository;
    categoryRepository: CategoryRepository;
    transactionRepository: TransactionRepository;
    insightAgent: ReactAgent;
  }) {
    this.accountRepository = accountRepository;
    this.categoryRepository = categoryRepository;
    this.transactionRepository = transactionRepository;
    this.insightAgent = insightAgent;
  }

  async call(userId: string, input: InsightInput): Promise<InsightOutput> {
    if (!userId) {
      return Failure({ message: "User ID is required", agentTrace: [] });
    }

    const normalizedQuestion = input.question.trim();
    if (!normalizedQuestion) {
      return Failure({ message: "Question is required", agentTrace: [] });
    }

    const historyMessages: readonly AgentMessage[] = input.history ?? [];
    const currentDate = formatDateAsYYYYMMDD(new Date());
    const currentMessage: AgentMessage = {
      role: "user",
      content: `Today is ${currentDate}.\nMy question: ${normalizedQuestion}`,
    };
    const messages = [...historyMessages, currentMessage].map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const response = await this.insightAgent.invoke(
      { messages },
      { context: { userId } },
    );

    const answer = extractLastMessageText(response.messages)?.trim();
    const agentTrace = extractAgentTrace(response.messages);

    if (!answer) {
      return Failure({
        message: "Empty response",
        agentTrace,
      });
    }

    return Success({
      answer,
      agentTrace,
    });
  }
}
