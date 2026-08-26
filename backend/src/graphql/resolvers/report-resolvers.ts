import { QueryByCategoryReportArgs } from "../../__generated__/resolvers-types";
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
  },
};
