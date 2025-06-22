import { userResolvers } from "./userResolvers";
import { accountResolvers } from "./accountResolvers";

export const resolvers = {
  Query: {
    ...accountResolvers.Query,
  },
  Mutation: {
    ...accountResolvers.Mutation,
    ...userResolvers.Mutation,
  },
};
