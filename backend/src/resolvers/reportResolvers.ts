import { GraphQLError } from "graphql";
import { z } from "zod";
import { GraphQLContext } from "../server";
import { getAuthenticatedUser, handleResolverError } from "./shared";
import { TransactionType } from "../models/Transaction";
import { YEAR_RANGE_OFFSET } from "../types/validation";

/**
 * Zod schemas for input validation
 */
const currentYear = new Date().getFullYear();
const monthlyReportInputSchema = z.object({
  year: z
    .number()
    .int()
    .min(currentYear - YEAR_RANGE_OFFSET)
    .max(currentYear + YEAR_RANGE_OFFSET),
  month: z.number().int().min(1).max(12),
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]),
});

export const reportResolvers = {
  Query: {
    monthlyReport: async (
      _parent: unknown,
      args: { year: unknown; month: unknown; type: unknown },
      context: GraphQLContext,
    ) => {
      try {
        // Validate input parameters
        const validatedInput = monthlyReportInputSchema.parse(args);
        const user = await getAuthenticatedUser(context);

        const monthlyReport = await context.reportsService.getMonthlyReport(
          user.id,
          validatedInput.year,
          validatedInput.month,
          validatedInput.type,
        );

        return monthlyReport;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.issues[0];
          throw new GraphQLError(firstError.message, {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        handleResolverError(error, "Failed to fetch monthly report");
      }
    },
  },
};
