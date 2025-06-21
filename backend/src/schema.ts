export const typeDefs = `#graphql
  type Query {
    activeAccounts: [Account!]!
  }

  type User {
    email: String!
  }

  type Account {
    id: ID!
    userId: ID!
    name: String!
    currency: String!
    initialBalance: Float!
  }

  input CreateAccountInput {
    name: String!
    currency: String!
    initialBalance: Float!
  }

  input UpdateAccountInput {
    name: String
    currency: String
    initialBalance: Float
  }

  type Mutation {
    ensureUser: User!
    createAccount(input: CreateAccountInput!): Account!
    updateAccount(id: ID!, input: UpdateAccountInput!): Account!
    archiveAccount(id: ID!): Account!
  }
`;
