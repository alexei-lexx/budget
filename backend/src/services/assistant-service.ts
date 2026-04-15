import { Agent, AgentMessage, AgentTraceMessage } from "../ports/agent-types";
import { Failure, Result, Success } from "../types/result";
import { formatDateAsYYYYMMDD } from "../utils/date";

export interface AssistantInput {
  question: string;
  history?: readonly AgentMessage[];
  isVoiceInput?: boolean;
}

type AssistantOutput = Result<
  { answer: string; agentTrace: AgentTraceMessage[] },
  { message: string; agentTrace: AgentTraceMessage[] }
>;

export interface AssistantService {
  call(userId: string, input: AssistantInput): Promise<AssistantOutput>;
}

export class AssistantServiceImpl implements AssistantService {
  constructor(
    private assistantAgent: Agent<{
      isVoiceInput: boolean;
      today: string;
      userId: string;
    }>,
  ) {}

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
      {
        context: {
          isVoiceInput: input.isVoiceInput ?? false,
          today: formatDateAsYYYYMMDD(new Date()),
          userId,
        },
      },
    );

    const { answer: rawAnswer, agentTrace } = response;
    const answer = rawAnswer?.trim();

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
