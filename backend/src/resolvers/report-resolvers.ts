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
  },
};
