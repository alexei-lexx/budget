export const typeDefs = `#graphql
  type Query {
    _empty: String
  }

  type User {
    email: String!
  }

  type Mutation {
    ensureUser: User!
  }
`;
