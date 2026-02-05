import { ReportType } from "../models/report";
import { GraphQLContext } from "../server";
import { getAuthenticatedUser, handleResolverError } from "./shared";

export const reportResolvers = {
  Query: {
    aiInsights: async (
      _parent: unknown,
      args: {
        input: {
          question: string;
          period: { startDate: string; endDate: string };
          conversation?:
            | { role: "USER" | "ASSISTANT"; content: string }[]
            | null;
        };
      },
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const answer = await context.aiInsightsService.call(
          user.id,
          args.input,
        );

        return { answer };
      } catch (error) {
        handleResolverError(error, "Failed to fetch AI insights");
      }
    },
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
