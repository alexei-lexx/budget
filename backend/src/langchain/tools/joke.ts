import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { tool } from "langchain";
import { z } from "zod";
import { createJokeAgent } from "../agents/joke-agent";
import { extractLastMessageText } from "../utils";

export const createJokeTool = (model: BaseChatModel) => {
  const agent = createJokeAgent(model);

  return tool(
    async ({ topic }) => {
      const response = await agent.invoke({
        messages: [
          {
            role: "user",
            content: topic
              ? `Tell me a joke about ${topic}.`
              : "Tell me a joke.",
          },
        ],
      });

      const answer = extractLastMessageText(response.messages)?.trim();

      return answer;
    },
    {
      name: "joke",
      description: "Always use this tool to tell a joke.",
      schema: z.object({
        topic: z.string().optional().describe("Topic for the joke"),
      }),
    },
  );
};
