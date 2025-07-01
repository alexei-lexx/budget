import { userResolvers } from "./userResolvers";
import { accountResolvers } from "./accountResolvers";
import { categoryResolvers } from "./categoryResolvers";
import { transactionResolvers } from "./transactionResolvers";

export const resolvers = {
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
};
