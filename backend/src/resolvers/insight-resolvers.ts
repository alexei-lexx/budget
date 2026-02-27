import { GraphQLContext } from "../server";
import { toDateString } from "../types/date";
import { toDateRange } from "../types/date-range";
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

        const { startDate, endDate } = args.input.dateRange;
        const dateRange = toDateRange(
          toDateString(startDate),
          toDateString(endDate),
        );

        const answer = await context.insightService.call(user.id, {
          question: args.input.question,
          dateRange,
        });

        return { answer };
      } catch (error) {
        handleResolverError(error, "Failed to fetch insight");
      }
    },
  },
};
