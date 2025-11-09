import { Resolvers } from "../__generated__/resolvers-types";
import { accountResolvers } from "./accountResolvers";
import { categoryResolvers } from "./categoryResolvers";
import { reportResolvers } from "./reportResolvers";
import { transactionResolvers } from "./transactionResolvers";
import { transferResolvers } from "./transferResolvers";
import { userResolvers } from "./userResolvers";

export const resolvers: Resolvers = {
  Query: {
    ...accountResolvers.Query,
    ...categoryResolvers.Query,
    ...transactionResolvers.Query,
    ...transferResolvers.Query,
    ...reportResolvers.Query,
  },
  Mutation: {
    ...accountResolvers.Mutation,
    ...userResolvers.Mutation,
    ...categoryResolvers.Mutation,
    ...transactionResolvers.Mutation,
    ...transferResolvers.Mutation,
  },
  Account: accountResolvers.Account,
  Transaction: transactionResolvers.Transaction,
};
