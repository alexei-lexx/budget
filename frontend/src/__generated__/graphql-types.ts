export type Maybe<T> = T | undefined;
export type InputMaybe<T> = T | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Account = {
  __typename?: 'Account';
  balance: Scalars['Float']['output'];
  currency: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  initialBalance: Scalars['Float']['output'];
  name: Scalars['String']['output'];
};

export type Category = {
  __typename?: 'Category';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  type: CategoryType;
};

export type CategoryType =
  | 'EXPENSE'
  | 'INCOME';

export type CreateAccountInput = {
  currency: Scalars['String']['input'];
  initialBalance: Scalars['Float']['input'];
  name: Scalars['String']['input'];
};

export type CreateCategoryInput = {
  name: Scalars['String']['input'];
  type: CategoryType;
};

export type CreateTransactionInput = {
  accountId: Scalars['ID']['input'];
  amount: Scalars['Float']['input'];
  categoryId?: InputMaybe<Scalars['ID']['input']>;
  date: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  type: TransactionType;
};

export type CreateTransferInput = {
  amount: Scalars['Float']['input'];
  date: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  fromAccountId: Scalars['ID']['input'];
  toAccountId: Scalars['ID']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createAccount: Account;
  createCategory: Category;
  createTransaction: Transaction;
  createTransfer: Transfer;
  deleteAccount?: Maybe<Scalars['Boolean']['output']>;
  deleteCategory: Category;
  deleteTransaction: Transaction;
  deleteTransfer?: Maybe<Scalars['Boolean']['output']>;
  ensureUser: User;
  updateAccount: Account;
  updateCategory: Category;
  updateTransaction: Transaction;
  updateTransfer: Transfer;
};


export type MutationCreateAccountArgs = {
  input: CreateAccountInput;
};


export type MutationCreateCategoryArgs = {
  input: CreateCategoryInput;
};


export type MutationCreateTransactionArgs = {
  input: CreateTransactionInput;
};


export type MutationCreateTransferArgs = {
  input: CreateTransferInput;
};


export type MutationDeleteAccountArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCategoryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteTransactionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteTransferArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateAccountArgs = {
  input: UpdateAccountInput;
};


export type MutationUpdateCategoryArgs = {
  input: UpdateCategoryInput;
};


export type MutationUpdateTransactionArgs = {
  input: UpdateTransactionInput;
};


export type MutationUpdateTransferArgs = {
  input: UpdateTransferInput;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type PaginationInput = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};

export type Query = {
  __typename?: 'Query';
  accounts: Array<Account>;
  categories: Array<Category>;
  supportedCurrencies: Array<Scalars['String']['output']>;
  transactions: TransactionConnection;
  transfer?: Maybe<Transfer>;
};


export type QueryCategoriesArgs = {
  type?: InputMaybe<CategoryType>;
};


export type QueryTransactionsArgs = {
  pagination?: InputMaybe<PaginationInput>;
};


export type QueryTransferArgs = {
  id: Scalars['ID']['input'];
};

export type Transaction = {
  __typename?: 'Transaction';
  accountId: Scalars['ID']['output'];
  amount: Scalars['Float']['output'];
  categoryId?: Maybe<Scalars['ID']['output']>;
  currency: Scalars['String']['output'];
  date: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  transferId?: Maybe<Scalars['String']['output']>;
  type: TransactionType;
};

export type TransactionConnection = {
  __typename?: 'TransactionConnection';
  edges: Array<TransactionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type TransactionEdge = {
  __typename?: 'TransactionEdge';
  cursor: Scalars['String']['output'];
  node: Transaction;
};

export type TransactionType =
  | 'EXPENSE'
  | 'INCOME'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT';

export type Transfer = {
  __typename?: 'Transfer';
  id: Scalars['ID']['output'];
  inboundTransaction: Transaction;
  outboundTransaction: Transaction;
};

export type UpdateAccountInput = {
  currency?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  initialBalance?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCategoryInput = {
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<CategoryType>;
};

export type UpdateTransactionInput = {
  accountId?: InputMaybe<Scalars['ID']['input']>;
  amount?: InputMaybe<Scalars['Float']['input']>;
  categoryId?: InputMaybe<Scalars['ID']['input']>;
  date?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  type?: InputMaybe<TransactionType>;
};

export type UpdateTransferInput = {
  amount?: InputMaybe<Scalars['Float']['input']>;
  date?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  fromAccountId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
  toAccountId?: InputMaybe<Scalars['ID']['input']>;
};

export type User = {
  __typename?: 'User';
  email: Scalars['String']['output'];
};

export type AccountFieldsFragment = { __typename?: 'Account', id: string, name: string, currency: string, initialBalance: number, balance: number };

export type CategoryFieldsFragment = { __typename?: 'Category', id: string, name: string, type: CategoryType };

export type TransactionFieldsFragment = { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | undefined, transferId?: string | undefined };

export type TransferFieldsFragment = { __typename?: 'Transfer', id: string, outboundTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | undefined, transferId?: string | undefined }, inboundTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | undefined, transferId?: string | undefined } };

export type EnsureUserMutationVariables = Exact<{ [key: string]: never; }>;


export type EnsureUserMutation = { __typename?: 'Mutation', ensureUser: { __typename?: 'User', email: string } };

export type CreateAccountMutationVariables = Exact<{
  input: CreateAccountInput;
}>;


export type CreateAccountMutation = { __typename?: 'Mutation', createAccount: { __typename?: 'Account', id: string, name: string, currency: string, initialBalance: number, balance: number } };

export type UpdateAccountMutationVariables = Exact<{
  input: UpdateAccountInput;
}>;


export type UpdateAccountMutation = { __typename?: 'Mutation', updateAccount: { __typename?: 'Account', id: string, name: string, currency: string, initialBalance: number, balance: number } };

export type DeleteAccountMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteAccountMutation = { __typename?: 'Mutation', deleteAccount?: boolean | undefined };

export type CreateCategoryMutationVariables = Exact<{
  input: CreateCategoryInput;
}>;


export type CreateCategoryMutation = { __typename?: 'Mutation', createCategory: { __typename?: 'Category', id: string, name: string, type: CategoryType } };

export type UpdateCategoryMutationVariables = Exact<{
  input: UpdateCategoryInput;
}>;


export type UpdateCategoryMutation = { __typename?: 'Mutation', updateCategory: { __typename?: 'Category', id: string, name: string, type: CategoryType } };

export type DeleteCategoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteCategoryMutation = { __typename?: 'Mutation', deleteCategory: { __typename?: 'Category', id: string, name: string, type: CategoryType } };

export type CreateTransactionMutationVariables = Exact<{
  input: CreateTransactionInput;
}>;


export type CreateTransactionMutation = { __typename?: 'Mutation', createTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | undefined, transferId?: string | undefined } };

export type UpdateTransactionMutationVariables = Exact<{
  input: UpdateTransactionInput;
}>;


export type UpdateTransactionMutation = { __typename?: 'Mutation', updateTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | undefined, transferId?: string | undefined } };

export type DeleteTransactionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteTransactionMutation = { __typename?: 'Mutation', deleteTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | undefined, transferId?: string | undefined } };

export type CreateTransferMutationVariables = Exact<{
  input: CreateTransferInput;
}>;


export type CreateTransferMutation = { __typename?: 'Mutation', createTransfer: { __typename?: 'Transfer', id: string, outboundTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | undefined, transferId?: string | undefined }, inboundTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | undefined, transferId?: string | undefined } } };

export type UpdateTransferMutationVariables = Exact<{
  input: UpdateTransferInput;
}>;


export type UpdateTransferMutation = { __typename?: 'Mutation', updateTransfer: { __typename?: 'Transfer', id: string, outboundTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | undefined, transferId?: string | undefined }, inboundTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | undefined, transferId?: string | undefined } } };

export type DeleteTransferMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteTransferMutation = { __typename?: 'Mutation', deleteTransfer?: boolean | undefined };

export type GetAccountsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAccountsQuery = { __typename?: 'Query', accounts: Array<{ __typename?: 'Account', id: string, name: string, currency: string, initialBalance: number, balance: number }> };

export type GetSupportedCurrenciesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSupportedCurrenciesQuery = { __typename?: 'Query', supportedCurrencies: Array<string> };

export type GetCategoriesQueryVariables = Exact<{
  type?: InputMaybe<CategoryType>;
}>;


export type GetCategoriesQuery = { __typename?: 'Query', categories: Array<{ __typename?: 'Category', id: string, name: string, type: CategoryType }> };

export type GetTransactionsPaginatedQueryVariables = Exact<{
  pagination?: InputMaybe<PaginationInput>;
}>;


export type GetTransactionsPaginatedQuery = { __typename?: 'Query', transactions: { __typename?: 'TransactionConnection', totalCount: number, edges: Array<{ __typename?: 'TransactionEdge', cursor: string, node: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | undefined, transferId?: string | undefined } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, hasPreviousPage: boolean, startCursor?: string | undefined, endCursor?: string | undefined } } };

export type GetTransferQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetTransferQuery = { __typename?: 'Query', transfer?: { __typename?: 'Transfer', id: string, outboundTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | undefined, transferId?: string | undefined }, inboundTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | undefined, transferId?: string | undefined } } | undefined };
