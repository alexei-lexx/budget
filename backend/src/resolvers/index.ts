import { userResolvers } from "./userResolvers";
import { accountResolvers } from "./accountResolvers";
import { categoryResolvers } from "./categoryResolvers";

export const resolvers = {
  Query: {
    ...accountResolvers.Query,
    ...categoryResolvers.Query,
  },
  Mutation: {
    ...accountResolvers.Mutation,
    ...userResolvers.Mutation,
    ...categoryResolvers.Mutation,
  },
};
