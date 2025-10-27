export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
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
  isArchived: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
};

export type Category = {
  __typename?: 'Category';
  id: Scalars['ID']['output'];
  isArchived: Scalars['Boolean']['output'];
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

export type MonthlyReport = {
  __typename?: 'MonthlyReport';
  categories: Array<MonthlyReportCategory>;
  currencyTotals: Array<MonthlyReportCurrencyTotal>;
  month: Scalars['Int']['output'];
  type: TransactionType;
  year: Scalars['Int']['output'];
};

export type MonthlyReportCategory = {
  __typename?: 'MonthlyReportCategory';
  categoryId?: Maybe<Scalars['ID']['output']>;
  categoryName: Scalars['String']['output'];
  currencyBreakdowns: Array<MonthlyReportCurrencyBreakdown>;
};

export type MonthlyReportCurrencyBreakdown = {
  __typename?: 'MonthlyReportCurrencyBreakdown';
  currency: Scalars['String']['output'];
  percentage: Scalars['Int']['output'];
  totalAmount: Scalars['Float']['output'];
};

export type MonthlyReportCurrencyTotal = {
  __typename?: 'MonthlyReportCurrencyTotal';
  currency: Scalars['String']['output'];
  totalAmount: Scalars['Float']['output'];
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
  getTransactionPatterns: Array<TransactionPattern>;
  monthlyReport: MonthlyReport;
  supportedCurrencies: Array<Scalars['String']['output']>;
  transactionDescriptionSuggestions: Array<Scalars['String']['output']>;
  transactions: TransactionConnection;
  transfer?: Maybe<Transfer>;
};


export type QueryAccountsArgs = {
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryCategoriesArgs = {
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<CategoryType>;
};


export type QueryGetTransactionPatternsArgs = {
  type: TransactionPatternType;
};


export type QueryMonthlyReportArgs = {
  month: Scalars['Int']['input'];
  type: TransactionType;
  year: Scalars['Int']['input'];
};


export type QueryTransactionDescriptionSuggestionsArgs = {
  searchText: Scalars['String']['input'];
};


export type QueryTransactionsArgs = {
  filters?: InputMaybe<TransactionFilterInput>;
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

export type TransactionFilterInput = {
  accountIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  categoryIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  dateAfter?: InputMaybe<Scalars['String']['input']>;
  dateBefore?: InputMaybe<Scalars['String']['input']>;
  includeUncategorized?: InputMaybe<Scalars['Boolean']['input']>;
  types?: InputMaybe<Array<TransactionType>>;
};

export type TransactionPattern = {
  __typename?: 'TransactionPattern';
  accountId: Scalars['ID']['output'];
  accountName: Scalars['String']['output'];
  categoryId: Scalars['ID']['output'];
  categoryName: Scalars['String']['output'];
};

export type TransactionPatternType =
  | 'EXPENSE'
  | 'INCOME';

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

export type AccountFieldsFragment = { __typename?: 'Account', id: string, name: string, currency: string, initialBalance: number, balance: number, isArchived: boolean };

export type CategoryFieldsFragment = { __typename?: 'Category', id: string, name: string, type: CategoryType, isArchived: boolean };

export type TransactionFieldsFragment = { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | null | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined };

export type TransferFieldsFragment = { __typename?: 'Transfer', id: string, outboundTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | null | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined }, inboundTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | null | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined } };

export type MonthlyReportCurrencyBreakdownFieldsFragment = { __typename?: 'MonthlyReportCurrencyBreakdown', currency: string, totalAmount: number, percentage: number };

export type MonthlyReportCategoryFieldsFragment = { __typename?: 'MonthlyReportCategory', categoryId?: string | null | undefined, categoryName: string, currencyBreakdowns: Array<{ __typename?: 'MonthlyReportCurrencyBreakdown', currency: string, totalAmount: number, percentage: number }> };

export type MonthlyReportCurrencyTotalFieldsFragment = { __typename?: 'MonthlyReportCurrencyTotal', currency: string, totalAmount: number };

export type MonthlyReportFieldsFragment = { __typename?: 'MonthlyReport', year: number, month: number, type: TransactionType, categories: Array<{ __typename?: 'MonthlyReportCategory', categoryId?: string | null | undefined, categoryName: string, currencyBreakdowns: Array<{ __typename?: 'MonthlyReportCurrencyBreakdown', currency: string, totalAmount: number, percentage: number }> }>, currencyTotals: Array<{ __typename?: 'MonthlyReportCurrencyTotal', currency: string, totalAmount: number }> };

export type EnsureUserMutationVariables = Exact<{ [key: string]: never; }>;


export type EnsureUserMutation = { __typename?: 'Mutation', ensureUser: { __typename?: 'User', email: string } };

export type CreateAccountMutationVariables = Exact<{
  input: CreateAccountInput;
}>;


export type CreateAccountMutation = { __typename?: 'Mutation', createAccount: { __typename?: 'Account', id: string, name: string, currency: string, initialBalance: number, balance: number, isArchived: boolean } };

export type UpdateAccountMutationVariables = Exact<{
  input: UpdateAccountInput;
}>;


export type UpdateAccountMutation = { __typename?: 'Mutation', updateAccount: { __typename?: 'Account', id: string, name: string, currency: string, initialBalance: number, balance: number, isArchived: boolean } };

export type DeleteAccountMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteAccountMutation = { __typename?: 'Mutation', deleteAccount?: boolean | null | undefined };

export type CreateCategoryMutationVariables = Exact<{
  input: CreateCategoryInput;
}>;


export type CreateCategoryMutation = { __typename?: 'Mutation', createCategory: { __typename?: 'Category', id: string, name: string, type: CategoryType, isArchived: boolean } };

export type UpdateCategoryMutationVariables = Exact<{
  input: UpdateCategoryInput;
}>;


export type UpdateCategoryMutation = { __typename?: 'Mutation', updateCategory: { __typename?: 'Category', id: string, name: string, type: CategoryType, isArchived: boolean } };

export type DeleteCategoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteCategoryMutation = { __typename?: 'Mutation', deleteCategory: { __typename?: 'Category', id: string, name: string, type: CategoryType, isArchived: boolean } };

export type CreateTransactionMutationVariables = Exact<{
  input: CreateTransactionInput;
}>;


export type CreateTransactionMutation = { __typename?: 'Mutation', createTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | null | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined } };

export type UpdateTransactionMutationVariables = Exact<{
  input: UpdateTransactionInput;
}>;


export type UpdateTransactionMutation = { __typename?: 'Mutation', updateTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | null | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined } };

export type DeleteTransactionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteTransactionMutation = { __typename?: 'Mutation', deleteTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | null | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined } };

export type CreateTransferMutationVariables = Exact<{
  input: CreateTransferInput;
}>;


export type CreateTransferMutation = { __typename?: 'Mutation', createTransfer: { __typename?: 'Transfer', id: string, outboundTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | null | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined }, inboundTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | null | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined } } };

export type UpdateTransferMutationVariables = Exact<{
  input: UpdateTransferInput;
}>;


export type UpdateTransferMutation = { __typename?: 'Mutation', updateTransfer: { __typename?: 'Transfer', id: string, outboundTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | null | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined }, inboundTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | null | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined } } };

export type DeleteTransferMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteTransferMutation = { __typename?: 'Mutation', deleteTransfer?: boolean | null | undefined };

export type GetAccountsQueryVariables = Exact<{
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type GetAccountsQuery = { __typename?: 'Query', accounts: Array<{ __typename?: 'Account', id: string, name: string, currency: string, initialBalance: number, balance: number, isArchived: boolean }> };

export type GetSupportedCurrenciesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSupportedCurrenciesQuery = { __typename?: 'Query', supportedCurrencies: Array<string> };

export type GetCategoriesQueryVariables = Exact<{
  type?: InputMaybe<CategoryType>;
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type GetCategoriesQuery = { __typename?: 'Query', categories: Array<{ __typename?: 'Category', id: string, name: string, type: CategoryType, isArchived: boolean }> };

export type GetTransactionsPaginatedQueryVariables = Exact<{
  pagination?: InputMaybe<PaginationInput>;
  filters?: InputMaybe<TransactionFilterInput>;
}>;


export type GetTransactionsPaginatedQuery = { __typename?: 'Query', transactions: { __typename?: 'TransactionConnection', totalCount: number, edges: Array<{ __typename?: 'TransactionEdge', cursor: string, node: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | null | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, hasPreviousPage: boolean, startCursor?: string | null | undefined, endCursor?: string | null | undefined } } };

export type GetTransferQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetTransferQuery = { __typename?: 'Query', transfer?: { __typename?: 'Transfer', id: string, outboundTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | null | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined }, inboundTransaction: { __typename?: 'Transaction', id: string, accountId: string, categoryId?: string | null | undefined, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined } } | null | undefined };

export type GetTransactionPatternsQueryVariables = Exact<{
  type: TransactionPatternType;
}>;


export type GetTransactionPatternsQuery = { __typename?: 'Query', getTransactionPatterns: Array<{ __typename?: 'TransactionPattern', accountId: string, accountName: string, categoryId: string, categoryName: string }> };

export type GetMonthlyReportQueryVariables = Exact<{
  year: Scalars['Int']['input'];
  month: Scalars['Int']['input'];
  type: TransactionType;
}>;


export type GetMonthlyReportQuery = { __typename?: 'Query', monthlyReport: { __typename?: 'MonthlyReport', year: number, month: number, type: TransactionType, categories: Array<{ __typename?: 'MonthlyReportCategory', categoryId?: string | null | undefined, categoryName: string, currencyBreakdowns: Array<{ __typename?: 'MonthlyReportCurrencyBreakdown', currency: string, totalAmount: number, percentage: number }> }>, currencyTotals: Array<{ __typename?: 'MonthlyReportCurrencyTotal', currency: string, totalAmount: number }> } };

export type GetTransactionDescriptionSuggestionsQueryVariables = Exact<{
  searchText: Scalars['String']['input'];
}>;


export type GetTransactionDescriptionSuggestionsQuery = { __typename?: 'Query', transactionDescriptionSuggestions: Array<string> };
