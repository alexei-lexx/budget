export const typeDefs = `#graphql
  type Query {
    accounts: [Account!]!
    supportedCurrencies: [String!]!
    activeCategories(type: CategoryType): [Category!]!
    transactions(pagination: PaginationInput): TransactionConnection!
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

  enum TransactionType {
    INCOME
    EXPENSE
  }

  type Category {
    id: ID!
    name: String!
    type: CategoryType!
  }

  type Transaction {
    id: ID!
    accountId: ID!
    categoryId: ID
    type: TransactionType!
    amount: Float!
    currency: String!
    date: String!
    description: String
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

  input CreateTransactionInput {
    accountId: ID!
    categoryId: ID
    type: TransactionType!
    amount: Float!
    date: String!
    description: String
  }

  input UpdateTransactionInput {
    accountId: ID
    categoryId: ID
    type: TransactionType
    amount: Float
    date: String
    description: String
  }

  input PaginationInput {
    first: Int
    after: String
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type TransactionEdge {
    node: Transaction!
    cursor: String!
  }

  type TransactionConnection {
    edges: [TransactionEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type Mutation {
    ensureUser: User!
    createAccount(input: CreateAccountInput!): Account!
    updateAccount(id: ID!, input: UpdateAccountInput!): Account!
    archiveAccount(id: ID!): Account!
    createCategory(input: CreateCategoryInput!): Category!
    updateCategory(id: ID!, input: UpdateCategoryInput!): Category!
    archiveCategory(id: ID!): Category!
    createTransaction(input: CreateTransactionInput!): Transaction!
    updateTransaction(id: ID!, input: UpdateTransactionInput!): Transaction!
    archiveTransaction(id: ID!): Transaction!
  }
`;
