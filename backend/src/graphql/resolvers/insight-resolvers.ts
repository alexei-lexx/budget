import { MutationAskInsightArgs } from "../../__generated__/resolvers-types";
import { GraphQLContext } from "../context";
import { getAuthenticatedUser, handleResolverError } from "./shared";

export const insightResolvers = {
  Mutation: {
    askInsight: async (
      _parent: unknown,
      args: MutationAskInsightArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const result = await context.insightService.call(user.id, {
          question: args.input.question,
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
