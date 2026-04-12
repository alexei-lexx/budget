import { ReactAgent } from "langchain";
import { extractAgentTrace, extractLastMessageText } from "../langchain/utils";
import { AgentMessage, AgentTraceMessage } from "../ports/agent-types";
import { Failure, Result, Success } from "../types/result";
import { formatDateAsYYYYMMDD } from "../utils/date";

export interface AssistantInput {
  question: string;
  history?: readonly AgentMessage[];
}

type AssistantOutput = Result<
  { answer: string; agentTrace: AgentTraceMessage[] },
  { message: string; agentTrace: AgentTraceMessage[] }
>;

export interface AssistantService {
  call(userId: string, input: AssistantInput): Promise<AssistantOutput>;
}

export class AssistantServiceImpl implements AssistantService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private assistantAgent: ReactAgent<any>) {}

  async call(userId: string, input: AssistantInput): Promise<AssistantOutput> {
    if (!userId) {
      return Failure({ message: "User ID is required", agentTrace: [] });
    }

    const normalizedQuestion = input.question.trim();
    if (!normalizedQuestion) {
      return Failure({ message: "Question is required", agentTrace: [] });
    }

    const historyMessages: readonly AgentMessage[] = input.history ?? [];
    const currentMessage: AgentMessage = {
      role: "user",
      content: `My question: ${normalizedQuestion}`,
    };
    const messages = [...historyMessages, currentMessage].map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const response = await this.assistantAgent.invoke(
      { messages },
      { context: { userId, today: formatDateAsYYYYMMDD(new Date()) } },
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
