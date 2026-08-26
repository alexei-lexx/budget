import { GraphQLError } from "graphql";
import {
  QueryByCategoryReportArgs,
  QueryExpenseTrendArgs,
} from "../../__generated__/resolvers-types";
import { GraphQLContext } from "../context";

import { getAuthenticatedUser, handleResolverError } from "./shared";

export const reportResolvers = {
  Query: {
    byCategoryReport: async (
      _parent: unknown,
      args: QueryByCategoryReportArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const report = await context.byCategoryReportService.call(
          user.id,
          args.year,
          args.month ?? undefined,
          args.type,
        );

        return report;
      } catch (error) {
        handleResolverError(error, "Failed to fetch report");
      }
    },

    expenseTrend: async (
      _parent: unknown,
      args: QueryExpenseTrendArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const result = await context.expenseTrendService.call({
          userId: user.id,
          period: args.input.period,
          lookback: args.input.lookback,
          currency: args.input.currency,
          today: args.input.today,
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
