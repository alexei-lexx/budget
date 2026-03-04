import { Resolvers } from "../__generated__/resolvers-types";
import { accountResolvers } from "./account-resolvers";
import { categoryResolvers } from "./category-resolvers";
import { createTransactionFromTextResolvers } from "./create-transaction-from-text-resolvers";
import { insightResolvers } from "./insight-resolvers";
import { reportResolvers } from "./report-resolvers";
import { transactionResolvers } from "./transaction-resolvers";
import { transferResolvers } from "./transfer-resolvers";
import { userResolvers } from "./user-resolvers";

export const resolvers: Resolvers = {
  Query: {
    ...accountResolvers.Query,
    ...categoryResolvers.Query,
    ...insightResolvers.Query,
    ...reportResolvers.Query,
    ...transactionResolvers.Query,
    ...transferResolvers.Query,
  },
  Mutation: {
    ...createTransactionFromTextResolvers.Mutation,
    ...accountResolvers.Mutation,
    ...userResolvers.Mutation,
    ...categoryResolvers.Mutation,
    ...transactionResolvers.Mutation,
    ...transferResolvers.Mutation,
  },
  Account: accountResolvers.Account,
  Transaction: transactionResolvers.Transaction,
};
