export const typeDefs = `#graphql
  type Query {
    activeAccounts: [Account!]!
    supportedCurrencies: [String!]!
    activeCategories(type: CategoryType): [Category!]!
  }

  type User {
    email: String!
  }

  type Account {
    id: ID!
    name: String!
    currency: String!
    initialBalance: Float!
  }

  enum CategoryType {
    INCOME
    EXPENSE
  }

  type Category {
    id: ID!
    name: String!
    type: CategoryType!
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

  input CreateCategoryInput {
    name: String!
    type: CategoryType!
  }

  input UpdateCategoryInput {
    name: String
    type: CategoryType
  }

  type Mutation {
    ensureUser: User!
    createAccount(input: CreateAccountInput!): Account!
    updateAccount(id: ID!, input: UpdateAccountInput!): Account!
    archiveAccount(id: ID!): Account!
    createCategory(input: CreateCategoryInput!): Category!
    updateCategory(id: ID!, input: UpdateCategoryInput!): Category!
    archiveCategory(id: ID!): Category!
  }
`;
