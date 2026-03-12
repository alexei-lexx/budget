import { QueryMonthlyReportArgs } from "../../__generated__/resolvers-types";
import { GraphQLContext } from "../context";

import { getAuthenticatedUser, handleResolverError } from "./shared";

export const reportResolvers = {
  Query: {
    monthlyReport: async (
      _parent: unknown,
      args: QueryMonthlyReportArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const monthlyReport = await context.monthlyByCategoryReportService.call(
          user.id,
          args.year,
          args.month,
          args.type,
        );

        return monthlyReport;
      } catch (error) {
        handleResolverError(error, "Failed to fetch monthly report");
      }
    },
  },
};
