import {
  MutationCreateTransferArgs,
  MutationDeleteTransferArgs,
  MutationUpdateTransferArgs,
  QueryTransferArgs,
} from "../../__generated__/resolvers-types";

import { toDateString, toDateStringOrUndefined } from "../../types/date";
import { GraphQLContext } from "../context";
import { getAuthenticatedUser, handleResolverError } from "./shared";

export const transferResolvers = {
  Query: {
    transfer: async (
      _parent: unknown,
      args: QueryTransferArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        const transferResult = await context.transferService.getTransfer(
          args.id,
          user.id,
        );

        if (!transferResult) {
          return undefined;
        }

        return {
          id: transferResult.transferId,
          outboundTransaction: transferResult.outboundTransaction,
          inboundTransaction: transferResult.inboundTransaction,
        };
      } catch (error) {
        handleResolverError(error, "Failed to get transfer");
      }
    },
  },
  Mutation: {
    createTransfer: async (
      _parent: unknown,
      args: MutationCreateTransferArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const transferResult = await context.transferService.createTransfer(
          {
            ...args.input,
            date: toDateString(args.input.date),
          },
          user.id,
        );

        return {
          id: transferResult.transferId,
          outboundTransaction: transferResult.outboundTransaction,
          inboundTransaction: transferResult.inboundTransaction,
        };
      } catch (error) {
        handleResolverError(error, "Failed to create transfer");
      }
    },
    updateTransfer: async (
      _parent: unknown,
      args: MutationUpdateTransferArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        const { id, ...updateData } = args.input;

        const transferResult = await context.transferService.updateTransfer(
          id,
          user.id,
          {
            ...updateData,
            amount: updateData.amount ?? undefined,
            date: toDateStringOrUndefined(updateData.date),
            fromAccountId: updateData.fromAccountId ?? undefined,
            toAccountId: updateData.toAccountId ?? undefined,
          },
        );

        return {
          id: transferResult.transferId,
          outboundTransaction: transferResult.outboundTransaction,
          inboundTransaction: transferResult.inboundTransaction,
        };
      } catch (error) {
        handleResolverError(error, "Failed to update transfer");
      }
    },
    deleteTransfer: async (
      _parent: unknown,
      args: MutationDeleteTransferArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        await context.transferService.deleteTransfer(args.id, user.id);
        return true;
      } catch (error) {
        handleResolverError(error, "Failed to delete transfer");
      }
    },
  },
};
