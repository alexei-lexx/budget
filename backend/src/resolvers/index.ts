import { userResolvers } from "./userResolvers";
import { accountResolvers } from "./accountResolvers";
import { categoryResolvers } from "./categoryResolvers";
import { transactionResolvers } from "./transactionResolvers";
import { Resolvers } from "../__generated__/resolvers-types";

export const resolvers: Resolvers = {
  Query: {
    ...accountResolvers.Query,
    ...categoryResolvers.Query,
    ...transactionResolvers.Query,
  },
  Mutation: {
    ...accountResolvers.Mutation,
    ...userResolvers.Mutation,
    ...categoryResolvers.Mutation,
    ...transactionResolvers.Mutation,
  },
  Account: accountResolvers.Account,
};
