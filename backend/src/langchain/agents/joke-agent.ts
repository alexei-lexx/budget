import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createAgent } from "langchain";

export const createJokeAgent = (model: BaseChatModel) =>
  createAgent({
    model,
    systemPrompt:
      "You are a comedian. Tell a short, funny joke." +
      " One or two sentences max.",
  });
