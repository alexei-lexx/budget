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

        const { answer, agentTrace } = await context.insightService.call(
          user.id,
          {
            ...args.input,
            startDate: toDateString(args.input.dateRange.startDate),
            endDate: toDateString(args.input.dateRange.endDate),
          },
        );

        return { answer, agentTrace };
      } catch (error) {
        handleResolverError(error, "Failed to fetch insight");
      }
    },
  },
};
