export const typeDefs = `#graphql
  type User {
    email: String!
  }

  type Mutation {
    ensureUser: User!
  }
`;
