import { QueryInsightArgs } from "../../__generated__/resolvers-types";
import { toDateString } from "../../types/date";
import { GraphQLContext } from "../context";
import { getAuthenticatedUser, handleResolverError } from "./shared";

export const insightResolvers = {
  Query: {
    insight: async (
      _parent: unknown,
      args: QueryInsightArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const result = await context.insightService.call(user.id, {
          question: args.input.question,
          startDate: toDateString(args.input.dateRange.startDate),
          endDate: toDateString(args.input.dateRange.endDate),
          history: args.input.history?.map((message) => ({
            role: message.role as "user" | "assistant",
            content: message.content,
          })),
        });

        if (!result.success) {
          return {
            __typename: "InsightFailure" as const,
            message: result.error.message,
            agentTrace: result.error.agentTrace,
          };
        }

        return {
          __typename: "InsightSuccess" as const,
          answer: result.data.answer,
          agentTrace: result.data.agentTrace,
        };
      } catch (error) {
        handleResolverError(error, "Failed to fetch insight");
      }
    },
  },
};
