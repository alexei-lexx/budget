import { ReportType } from "../models/report";
import { GraphQLContext } from "../server";
import { getAuthenticatedUser, handleResolverError } from "./shared";

export const reportResolvers = {
  Query: {
    monthlyReport: async (
      _parent: unknown,
      args: { year: number; month: number; type: ReportType },
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
    categoryTopTransactions: async (
      _parent: unknown,
      args: {
        year: number;
        month: number;
        categoryId?: string;
        type: ReportType;
        limit?: number;
      },
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const result = await context.categoryTopTransactionsService.call(
          user.id,
          args.year,
          args.month,
          args.categoryId || undefined,
          args.type,
          args.limit,
        );

        return result;
      } catch (error) {
        handleResolverError(error, "Failed to fetch category top transactions");
      }
    },
  },
};
