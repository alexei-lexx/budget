import { GraphQLError } from "graphql";
import { z } from "zod";
import { ReportType } from "../models/report";
import { GraphQLContext } from "../server";
import { getAuthenticatedUser, handleResolverError } from "./shared";
import { dateSchema } from "./schemas";

const aiInsightsInputSchema = z.object({
  question: z.string().trim().min(1, "Question is required"),
  period: z.object({
    startDate: dateSchema,
    endDate: dateSchema,
  }),
  conversation: z
    .array(
      z.object({
        role: z.enum(["USER", "ASSISTANT"]),
        content: z.string().trim().min(1, "Message content is required"),
      }),
    )
    .optional(),
});

export const reportResolvers = {
  Query: {
    aiInsights: async (
      _parent: unknown,
      args: {
        input: {
          question: string;
          period: { startDate: string; endDate: string };
          conversation?: { role: "USER" | "ASSISTANT"; content: string }[] | null;
        };
      },
      context: GraphQLContext,
    ) => {
      try {
        const validatedInput = aiInsightsInputSchema.parse(args.input);
        const user = await getAuthenticatedUser(context);

        const answer = await context.aiInsightsService.call(user.id, validatedInput);

        return { answer };
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.issues[0];
          throw new GraphQLError(firstError.message, {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
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
