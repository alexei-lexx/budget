import { GraphQLContext } from "../server";
import { toDateString } from "../types/date";
import { getAuthenticatedUser, handleResolverError } from "./shared";

export const insightResolvers = {
  Query: {
    insight: async (
      _parent: unknown,
      args: {
        input: {
          question: string;
          dateRange: { startDate: string; endDate: string };
        };
      },
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const answer = await context.insightService.call(user.id, {
          ...args.input,
          startDate: toDateString(args.input.dateRange.startDate),
          endDate: toDateString(args.input.dateRange.endDate),
        });

        return { answer };
      } catch (error) {
        handleResolverError(error, "Failed to fetch insight");
      }
    },
  },
};
