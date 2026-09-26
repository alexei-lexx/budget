import { GraphQLError } from "graphql";
import {
  MutationCreateTransferArgs,
  MutationDeleteTransferArgs,
  MutationUpdateTransferArgs,
  QueryTransferArgs,
} from "../../__generated__/resolvers-types";

import { toDateString, toDateStringOrUndefined } from "../../types/date-string";
import { GraphQLContext } from "../context";
import { getAuthenticatedUser } from "./shared";

export const transferResolvers = {
  Query: {
    transfer: async (
      _parent: unknown,
      args: QueryTransferArgs,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const result = await context.transferService.getTransfer(
        args.id,
        user.id,
      );

      const transferResult = result.unwrapOrThrowAs(GraphQLError);

      if (!transferResult) {
        return undefined;
      }

      return {
        id: transferResult.transferId,
        outboundTransaction: transferResult.outboundTransaction,
        inboundTransaction: transferResult.inboundTransaction,
      };
    },
  },
  Mutation: {
    createTransfer: async (
      _parent: unknown,
      args: MutationCreateTransferArgs,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);

      const result = await context.transferService.createTransfer(
        {
          ...args.input,
          date: toDateString(args.input.date),
        },
        user.id,
      );

      const transferResult = result.unwrapOrThrowAs(GraphQLError);

      return {
        id: transferResult.transferId,
        outboundTransaction: transferResult.outboundTransaction,
        inboundTransaction: transferResult.inboundTransaction,
      };
    },
    updateTransfer: async (
      _parent: unknown,
      args: MutationUpdateTransferArgs,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const { id, ...updateData } = args.input;

      const result = await context.transferService.updateTransfer(id, user.id, {
        ...updateData,
        amount: updateData.amount ?? undefined,
        date: toDateStringOrUndefined(updateData.date),
        fromAccountId: updateData.fromAccountId ?? undefined,
        toAccountId: updateData.toAccountId ?? undefined,
      });

      const transferResult = result.unwrapOrThrowAs(GraphQLError);

      return {
        id: transferResult.transferId,
        outboundTransaction: transferResult.outboundTransaction,
        inboundTransaction: transferResult.inboundTransaction,
      };
    },
    deleteTransfer: async (
      _parent: unknown,
      args: MutationDeleteTransferArgs,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const result = await context.transferService.deleteTransfer(
        args.id,
        user.id,
      );

      result.unwrapOrThrowAs(GraphQLError);

      return true;
    },
  },
};
