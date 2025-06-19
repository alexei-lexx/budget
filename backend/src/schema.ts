export const typeDefs = `#graphql
  type Query {
    health: String!
  }

  type User {
    email: String!
  }

  type Mutation {
    ensureUser: User!
  }
`;
