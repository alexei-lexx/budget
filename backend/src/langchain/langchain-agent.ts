import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { CallbackManager } from "@langchain/core/callbacks/manager";
import { AIMessage, ReactAgent } from "langchain";
import {
  Agent,
  AgentMessage,
  AgentTraceMessage,
  ToolExecution,
} from "../ports/agent-types";
import {
  extractAgentTraceTexts,
  extractAgentTraceToolResult,
  extractLastMessageText,
} from "./utils";

export class LangChainAgent<TContext extends Record<string, unknown>>
  implements Agent<TContext>
{
  // ReactAgent is generic over its internal state shape, which is irrelevant
  // at this abstraction level — we only call invoke() and read response.messages.
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private agent: ReactAgent<any>,
    private runName?: string,
  ) {}

  async invoke(
    state: { messages: readonly AgentMessage[] },
    config: { context: TContext },
  ) {
    const agentTrace: AgentTraceMessage[] = [];
    const pendingToolInputs = new Map<string, string>();
    const toolExecutions: ToolExecution[] = [];
    const callbackManager = new CallbackManager();

    callbackManager.addHandler(
      BaseCallbackHandler.fromMethods({
        handleLLMEnd(llmResult) {
          for (const promptGenerations of llmResult.generations) {
            for (const generation of promptGenerations) {
              if (!("message" in generation)) {
                // Skip if the generation does not contain a message
                continue;
              }

              const message = generation.message;

              if (!(message instanceof AIMessage)) {
                // Skip to narrow down to AIMessage instances
                continue;
              }

              const agentTraceMessages = extractAgentTraceTexts(message);
              agentTrace.push(...agentTraceMessages);
            }
          }
        },
        handleToolStart(_tool, input, runId) {
          pendingToolInputs.set(runId, input);
        },
        handleToolEnd(output, runId) {
          const agentTraceMessage = extractAgentTraceToolResult(output);
          agentTrace.push(agentTraceMessage);

          toolExecutions.push({
            tool: output.name || "Unknown tool",
            input: pendingToolInputs.get(runId) ?? "Unknown arguments",
            output: output.content ? String(output.content) : "Unknown result",
          });
          pendingToolInputs.delete(runId);
        },
      }),
    );

    const messages = state.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const response = await this.agent.invoke(
      { ...state, messages },
      {
        ...config,
        callbacks: callbackManager,
        ...(this.runName === undefined ? {} : { runName: this.runName }),
      },
    );

    const answer = extractLastMessageText(response.messages)?.trim();

    return { answer, agentTrace, toolExecutions };
  }
}
