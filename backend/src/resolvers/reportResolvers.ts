import { GraphQLError } from "graphql";
import { z } from "zod";
import {
  Weekday,
  MonthlyWeekdayReport,
} from "../__generated__/resolvers-types";
import { TransactionType } from "../models/Transaction";
import { GraphQLContext } from "../server";
import {
  DayOfWeek,
  WeekdayReport,
} from "../services/MonthlyByWeekdayReportService";
import { YEAR_RANGE_OFFSET } from "../types/validation";
import { getAuthenticatedUser, handleResolverError } from "./shared";

/**
 * Map domain DayOfWeek to GraphQL Weekday enum
 */
const dayOfWeekToWeekday: Record<DayOfWeek, Weekday> = {
  [DayOfWeek.SUNDAY]: Weekday.Sun,
  [DayOfWeek.MONDAY]: Weekday.Mon,
  [DayOfWeek.TUESDAY]: Weekday.Tue,
  [DayOfWeek.WEDNESDAY]: Weekday.Wed,
  [DayOfWeek.THURSDAY]: Weekday.Thu,
  [DayOfWeek.FRIDAY]: Weekday.Fri,
  [DayOfWeek.SATURDAY]: Weekday.Sat,
};

/**
 * Convert domain WeekdayReport to GraphQL MonthlyWeekdayReport
 */
function mapWeekdayReportToGraphQL(
  domainReport: WeekdayReport,
): MonthlyWeekdayReport {
  return {
    ...domainReport,
    weekdays: domainReport.weekdays.map((day) => ({
      ...day,
      weekday: dayOfWeekToWeekday[day.dayOfWeek],
    })),
  };
}

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
const transactionTypeSchema = z.enum([
  TransactionType.INCOME,
  TransactionType.EXPENSE,
]);

const monthlyReportInputSchema = z.object({
  year: yearSchema,
  month: monthSchema,
  type: transactionTypeSchema,
});

const monthlyWeekdayReportInputSchema = z.object({
  year: yearSchema,
  month: monthSchema,
  type: transactionTypeSchema,
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

    monthlyWeekdayReport: async (
      _parent: unknown,
      args: { year: unknown; month: unknown; type: unknown },
      context: GraphQLContext,
    ) => {
      try {
        // Validate input parameters
        const validatedInput = monthlyWeekdayReportInputSchema.parse(args);
        const user = await getAuthenticatedUser(context);

        // Get domain report from service
        const domainReport =
          await context.monthlyByWeekdayReportService.call(
            user.id,
            validatedInput.year,
            validatedInput.month,
            validatedInput.type,
          );

        // Map domain types to GraphQL types
        return mapWeekdayReportToGraphQL(domainReport);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.issues[0];
          throw new GraphQLError(firstError.message, {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        handleResolverError(error, "Failed to fetch monthly weekday report");
      }
    },
  },
};
