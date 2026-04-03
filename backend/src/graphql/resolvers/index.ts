import { Resolvers } from "../../__generated__/resolvers-types";
import { AgentTraceMessageType } from "../../services/ports/agent";
import { accountResolvers } from "./account-resolvers";
import { categoryResolvers } from "./category-resolvers";
import { createTransactionFromTextResolvers } from "./create-transaction-from-text-resolvers";
import { insightResolvers } from "./insight-resolvers";
import { reportResolvers } from "./report-resolvers";
import { telegramBotResolvers } from "./telegram-bot-resolvers";
import { transactionResolvers } from "./transaction-resolvers";
import { transferResolvers } from "./transfer-resolvers";
import { userResolvers } from "./user-resolvers";

export const resolvers: Resolvers = {
  Query: {
    ...accountResolvers.Query,
    ...categoryResolvers.Query,
    ...reportResolvers.Query,
    ...telegramBotResolvers.Query,
    ...transactionResolvers.Query,
    ...transferResolvers.Query,
    ...userResolvers.Query,
  },
  Mutation: {
    ...accountResolvers.Mutation,
    ...insightResolvers.Mutation,
    ...userResolvers.Mutation,
    ...categoryResolvers.Mutation,
    ...createTransactionFromTextResolvers.Mutation,
    ...telegramBotResolvers.Mutation,
    ...transactionResolvers.Mutation,
    ...transferResolvers.Mutation,
  },
  Account: accountResolvers.Account,
  Transaction: transactionResolvers.Transaction,
  AgentTraceMessage: {
    // GraphQL requires a __resolveType function for union types so it knows
    // which concrete type to use when serialising each item in agentTrace[].
    // The service layer uses a discriminated union keyed on `type`, so we map
    // that enum value to the corresponding GraphQL type name here.
    __resolveType(obj) {
      // Guard against unexpected shapes coming from the service layer.
      if (typeof obj !== "object" || obj === null) return undefined;
      if (!("type" in obj) || typeof obj.type !== "string") return undefined;

      switch (obj.type) {
        case AgentTraceMessageType.TEXT:
          return "AgentTraceText";
        case AgentTraceMessageType.TOOL_CALL:
          return "AgentTraceToolCall";
        case AgentTraceMessageType.TOOL_RESULT:
          return "AgentTraceToolResult";
        // Unknown type — returning undefined causes a GraphQL error
        default:
          return undefined;
      }
    },
  },
};
