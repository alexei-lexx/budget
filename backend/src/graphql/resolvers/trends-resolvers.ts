import { GraphQLError } from "graphql";
import { QueryExpenseTrendArgs } from "../../__generated__/resolvers-types";
import { toDateString } from "../../types/date-string";
import { GraphQLContext } from "../context";

import { getAuthenticatedUser, handleResolverError } from "./shared";

export const trendsResolvers = {
  Query: {
    expenseTrend: async (
      _parent: unknown,
      args: QueryExpenseTrendArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const result = await context.expenseTrendService.call({
          userId: user.id,
          periodUnit: args.input.periodUnit,
          lookback: args.input.lookback,
          currency: args.input.currency,
          today: toDateString(args.input.today),
          categoryIds: args.input.categoryIds ?? undefined,
          includeUncategorized: args.input.includeUncategorized ?? undefined,
        });

        if (!result.success) {
          throw new GraphQLError(result.error);
        }

        return result.data;
      } catch (error) {
        handleResolverError(error, "Failed to fetch expense trend");
      }
    },
  },
};
