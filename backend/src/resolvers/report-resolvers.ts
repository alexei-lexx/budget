import { GraphQLError } from "graphql";
import { z } from "zod";
import { ReportType } from "../models/report";
import { GraphQLContext } from "../server";
import { YEAR_RANGE_OFFSET } from "../types/validation";
import { getAuthenticatedUser, handleResolverError } from "./shared";

/**
 * Zod schemas for input validation
 */
const currentYear = new Date().getFullYear();
const yearSchema = z
  .number()
  .int()
  .min(currentYear - YEAR_RANGE_OFFSET)
  .max(currentYear + YEAR_RANGE_OFFSET);
const monthSchema = z.number().int().min(1).max(12);
const reportTypeSchema = z.enum(ReportType);

const monthlyReportInputSchema = z.object({
  year: yearSchema,
  month: monthSchema,
  type: reportTypeSchema,
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

        const monthlyReport = await context.monthlyByCategoryReportService.call(
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
