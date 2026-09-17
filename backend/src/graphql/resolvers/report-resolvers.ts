import { QueryByCategoryReportArgs } from "../../__generated__/resolvers-types";
import { GraphQLContext } from "../context";

import { getAuthenticatedUser } from "./shared";

export const reportResolvers = {
  Query: {
    byCategoryReport: async (
      _parent: unknown,
      args: QueryByCategoryReportArgs,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);

      const report = await context.byCategoryReportService.call(
        user.id,
        args.year,
        args.month ?? undefined,
        args.type,
      );

      return report;
    },
  },
};
