import gql from 'graphql-tag';
import * as VueApolloComposable from '@vue/apollo-composable';
import * as VueCompositionApi from 'vue';
export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type ReactiveFunction<TParam> = () => TParam;
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

export type MonthlyWeekdayReport = {
  __typename?: 'MonthlyWeekdayReport';
  currencyTotals: Array<MonthlyWeekdayReportCurrencyTotal>;
  month: Scalars['Int']['output'];
  type: TransactionType;
  weekdays: Array<MonthlyWeekdayReportDay>;
  year: Scalars['Int']['output'];
};

export type MonthlyWeekdayReportCurrencyBreakdown = {
  __typename?: 'MonthlyWeekdayReportCurrencyBreakdown';
  averageAmount: Scalars['Float']['output'];
  currency: Scalars['String']['output'];
  percentage: Scalars['Int']['output'];
  totalAmount: Scalars['Float']['output'];
};

export type MonthlyWeekdayReportCurrencyTotal = {
  __typename?: 'MonthlyWeekdayReportCurrencyTotal';
  currency: Scalars['String']['output'];
  totalAmount: Scalars['Float']['output'];
};

export type MonthlyWeekdayReportDay = {
  __typename?: 'MonthlyWeekdayReportDay';
  currencyBreakdowns: Array<MonthlyWeekdayReportCurrencyBreakdown>;
  weekday: Weekday;
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
  monthlyWeekdayReport: MonthlyWeekdayReport;
  supportedCurrencies: Array<Scalars['String']['output']>;
  transactionDescriptionSuggestions: Array<Scalars['String']['output']>;
  transactions: TransactionConnection;
  transfer?: Maybe<Transfer>;
};


export type QueryCategoriesArgs = {
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


export type QueryMonthlyWeekdayReportArgs = {
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

/**
 * Transaction with embedded account and category data.
 * Eliminates N+1 queries by fetching account and category data directly without separate lookups.
 * Breaking change: accountId and categoryId fields removed (use account.id and category.id instead).
 */
export type Transaction = {
  __typename?: 'Transaction';
  account: TransactionEmbeddedAccount;
  amount: Scalars['Float']['output'];
  category?: Maybe<TransactionEmbeddedCategory>;
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

/**
 * Lightweight account representation embedded in Transaction responses.
 * Always reflects the current state of the account at query time.
 * If an account ID exists but the entity cannot be found (data integrity edge case),
 * stub data with name "Unknown" is returned instead of null.
 */
export type TransactionEmbeddedAccount = {
  __typename?: 'TransactionEmbeddedAccount';
  id: Scalars['ID']['output'];
  isArchived: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
};

/**
 * Lightweight category representation embedded in Transaction responses.
 * Always reflects the current state of the category at query time.
 * If a category ID exists but the entity cannot be found (data integrity edge case),
 * stub data with name "Unknown" is returned instead of null.
 * If category ID is null (uncategorized transaction), the category field returns null.
 */
export type TransactionEmbeddedCategory = {
  __typename?: 'TransactionEmbeddedCategory';
  id: Scalars['ID']['output'];
  isArchived: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
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

export type Weekday =
  | 'FRI'
  | 'MON'
  | 'SAT'
  | 'SUN'
  | 'THU'
  | 'TUE'
  | 'WED';

export type AccountFieldsFragment = { __typename?: 'Account', id: string, name: string, currency: string, initialBalance: number, balance: number };

export type CategoryFieldsFragment = { __typename?: 'Category', id: string, name: string, type: CategoryType };

export type TransactionFieldsFragment = { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined };

export type TransferFieldsFragment = { __typename?: 'Transfer', id: string, outboundTransaction: { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined }, inboundTransaction: { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined } };

export type MonthlyReportCurrencyBreakdownFieldsFragment = { __typename?: 'MonthlyReportCurrencyBreakdown', currency: string, totalAmount: number, percentage: number };

export type MonthlyReportCategoryFieldsFragment = { __typename?: 'MonthlyReportCategory', categoryId?: string | null | undefined, categoryName: string, currencyBreakdowns: Array<{ __typename?: 'MonthlyReportCurrencyBreakdown', currency: string, totalAmount: number, percentage: number }> };

export type MonthlyReportCurrencyTotalFieldsFragment = { __typename?: 'MonthlyReportCurrencyTotal', currency: string, totalAmount: number };

export type MonthlyReportFieldsFragment = { __typename?: 'MonthlyReport', year: number, month: number, type: TransactionType, categories: Array<{ __typename?: 'MonthlyReportCategory', categoryId?: string | null | undefined, categoryName: string, currencyBreakdowns: Array<{ __typename?: 'MonthlyReportCurrencyBreakdown', currency: string, totalAmount: number, percentage: number }> }>, currencyTotals: Array<{ __typename?: 'MonthlyReportCurrencyTotal', currency: string, totalAmount: number }> };

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


export type DeleteAccountMutation = { __typename?: 'Mutation', deleteAccount?: boolean | null | undefined };

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


export type CreateTransactionMutation = { __typename?: 'Mutation', createTransaction: { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined } };

export type UpdateTransactionMutationVariables = Exact<{
  input: UpdateTransactionInput;
}>;


export type UpdateTransactionMutation = { __typename?: 'Mutation', updateTransaction: { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined } };

export type DeleteTransactionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteTransactionMutation = { __typename?: 'Mutation', deleteTransaction: { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined } };

export type CreateTransferMutationVariables = Exact<{
  input: CreateTransferInput;
}>;


export type CreateTransferMutation = { __typename?: 'Mutation', createTransfer: { __typename?: 'Transfer', id: string, outboundTransaction: { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined }, inboundTransaction: { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined } } };

export type UpdateTransferMutationVariables = Exact<{
  input: UpdateTransferInput;
}>;


export type UpdateTransferMutation = { __typename?: 'Mutation', updateTransfer: { __typename?: 'Transfer', id: string, outboundTransaction: { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined }, inboundTransaction: { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined } } };

export type DeleteTransferMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteTransferMutation = { __typename?: 'Mutation', deleteTransfer?: boolean | null | undefined };

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
  filters?: InputMaybe<TransactionFilterInput>;
}>;


export type GetTransactionsPaginatedQuery = { __typename?: 'Query', transactions: { __typename?: 'TransactionConnection', totalCount: number, edges: Array<{ __typename?: 'TransactionEdge', cursor: string, node: { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, hasPreviousPage: boolean, startCursor?: string | null | undefined, endCursor?: string | null | undefined } } };

export type GetTransferQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetTransferQuery = { __typename?: 'Query', transfer?: { __typename?: 'Transfer', id: string, outboundTransaction: { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined }, inboundTransaction: { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined } } | null | undefined };

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

export type GetMonthlyWeekdayReportQueryVariables = Exact<{
  year: Scalars['Int']['input'];
  month: Scalars['Int']['input'];
  type: TransactionType;
}>;


export type GetMonthlyWeekdayReportQuery = { __typename?: 'Query', monthlyWeekdayReport: { __typename?: 'MonthlyWeekdayReport', year: number, month: number, type: TransactionType, weekdays: Array<{ __typename?: 'MonthlyWeekdayReportDay', weekday: Weekday, currencyBreakdowns: Array<{ __typename?: 'MonthlyWeekdayReportCurrencyBreakdown', currency: string, totalAmount: number, averageAmount: number, percentage: number }> }>, currencyTotals: Array<{ __typename?: 'MonthlyWeekdayReportCurrencyTotal', currency: string, totalAmount: number }> } };

export const AccountFieldsFragmentDoc = gql`
    fragment AccountFields on Account {
  id
  name
  currency
  initialBalance
  balance
}
    `;
export const CategoryFieldsFragmentDoc = gql`
    fragment CategoryFields on Category {
  id
  name
  type
}
    `;
export const TransactionFieldsFragmentDoc = gql`
    fragment TransactionFields on Transaction {
  id
  account {
    id
    name
    isArchived
  }
  category {
    id
    name
    isArchived
  }
  type
  amount
  currency
  date
  description
  transferId
}
    `;
export const TransferFieldsFragmentDoc = gql`
    fragment TransferFields on Transfer {
  id
  outboundTransaction {
    ...TransactionFields
  }
  inboundTransaction {
    ...TransactionFields
  }
}
    ${TransactionFieldsFragmentDoc}`;
export const MonthlyReportCurrencyBreakdownFieldsFragmentDoc = gql`
    fragment MonthlyReportCurrencyBreakdownFields on MonthlyReportCurrencyBreakdown {
  currency
  totalAmount
  percentage
}
    `;
export const MonthlyReportCategoryFieldsFragmentDoc = gql`
    fragment MonthlyReportCategoryFields on MonthlyReportCategory {
  categoryId
  categoryName
  currencyBreakdowns {
    ...MonthlyReportCurrencyBreakdownFields
  }
}
    ${MonthlyReportCurrencyBreakdownFieldsFragmentDoc}`;
export const MonthlyReportCurrencyTotalFieldsFragmentDoc = gql`
    fragment MonthlyReportCurrencyTotalFields on MonthlyReportCurrencyTotal {
  currency
  totalAmount
}
    `;
export const MonthlyReportFieldsFragmentDoc = gql`
    fragment MonthlyReportFields on MonthlyReport {
  year
  month
  type
  categories {
    ...MonthlyReportCategoryFields
  }
  currencyTotals {
    ...MonthlyReportCurrencyTotalFields
  }
}
    ${MonthlyReportCategoryFieldsFragmentDoc}
${MonthlyReportCurrencyTotalFieldsFragmentDoc}`;
export const EnsureUserDocument = gql`
    mutation EnsureUser {
  ensureUser {
    email
  }
}
    `;

/**
 * __useEnsureUserMutation__
 *
 * To run a mutation, you first call `useEnsureUserMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useEnsureUserMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useEnsureUserMutation();
 */
export function useEnsureUserMutation(options: VueApolloComposable.UseMutationOptions<EnsureUserMutation, EnsureUserMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<EnsureUserMutation, EnsureUserMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<EnsureUserMutation, EnsureUserMutationVariables>(EnsureUserDocument, options);
}
export type EnsureUserMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<EnsureUserMutation, EnsureUserMutationVariables>;
export const CreateAccountDocument = gql`
    mutation CreateAccount($input: CreateAccountInput!) {
  createAccount(input: $input) {
    ...AccountFields
  }
}
    ${AccountFieldsFragmentDoc}`;

/**
 * __useCreateAccountMutation__
 *
 * To run a mutation, you first call `useCreateAccountMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCreateAccountMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCreateAccountMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useCreateAccountMutation(options: VueApolloComposable.UseMutationOptions<CreateAccountMutation, CreateAccountMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CreateAccountMutation, CreateAccountMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CreateAccountMutation, CreateAccountMutationVariables>(CreateAccountDocument, options);
}
export type CreateAccountMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CreateAccountMutation, CreateAccountMutationVariables>;
export const UpdateAccountDocument = gql`
    mutation UpdateAccount($input: UpdateAccountInput!) {
  updateAccount(input: $input) {
    ...AccountFields
  }
}
    ${AccountFieldsFragmentDoc}`;

/**
 * __useUpdateAccountMutation__
 *
 * To run a mutation, you first call `useUpdateAccountMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useUpdateAccountMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useUpdateAccountMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useUpdateAccountMutation(options: VueApolloComposable.UseMutationOptions<UpdateAccountMutation, UpdateAccountMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<UpdateAccountMutation, UpdateAccountMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<UpdateAccountMutation, UpdateAccountMutationVariables>(UpdateAccountDocument, options);
}
export type UpdateAccountMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<UpdateAccountMutation, UpdateAccountMutationVariables>;
export const DeleteAccountDocument = gql`
    mutation DeleteAccount($id: ID!) {
  deleteAccount(id: $id)
}
    `;

/**
 * __useDeleteAccountMutation__
 *
 * To run a mutation, you first call `useDeleteAccountMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDeleteAccountMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDeleteAccountMutation({
 *   variables: {
 *     id: // value for 'id'
 *   },
 * });
 */
export function useDeleteAccountMutation(options: VueApolloComposable.UseMutationOptions<DeleteAccountMutation, DeleteAccountMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DeleteAccountMutation, DeleteAccountMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DeleteAccountMutation, DeleteAccountMutationVariables>(DeleteAccountDocument, options);
}
export type DeleteAccountMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DeleteAccountMutation, DeleteAccountMutationVariables>;
export const CreateCategoryDocument = gql`
    mutation CreateCategory($input: CreateCategoryInput!) {
  createCategory(input: $input) {
    ...CategoryFields
  }
}
    ${CategoryFieldsFragmentDoc}`;

/**
 * __useCreateCategoryMutation__
 *
 * To run a mutation, you first call `useCreateCategoryMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCreateCategoryMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCreateCategoryMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useCreateCategoryMutation(options: VueApolloComposable.UseMutationOptions<CreateCategoryMutation, CreateCategoryMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CreateCategoryMutation, CreateCategoryMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CreateCategoryMutation, CreateCategoryMutationVariables>(CreateCategoryDocument, options);
}
export type CreateCategoryMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CreateCategoryMutation, CreateCategoryMutationVariables>;
export const UpdateCategoryDocument = gql`
    mutation UpdateCategory($input: UpdateCategoryInput!) {
  updateCategory(input: $input) {
    ...CategoryFields
  }
}
    ${CategoryFieldsFragmentDoc}`;

/**
 * __useUpdateCategoryMutation__
 *
 * To run a mutation, you first call `useUpdateCategoryMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useUpdateCategoryMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useUpdateCategoryMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useUpdateCategoryMutation(options: VueApolloComposable.UseMutationOptions<UpdateCategoryMutation, UpdateCategoryMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<UpdateCategoryMutation, UpdateCategoryMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<UpdateCategoryMutation, UpdateCategoryMutationVariables>(UpdateCategoryDocument, options);
}
export type UpdateCategoryMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<UpdateCategoryMutation, UpdateCategoryMutationVariables>;
export const DeleteCategoryDocument = gql`
    mutation DeleteCategory($id: ID!) {
  deleteCategory(id: $id) {
    ...CategoryFields
  }
}
    ${CategoryFieldsFragmentDoc}`;

/**
 * __useDeleteCategoryMutation__
 *
 * To run a mutation, you first call `useDeleteCategoryMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDeleteCategoryMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDeleteCategoryMutation({
 *   variables: {
 *     id: // value for 'id'
 *   },
 * });
 */
export function useDeleteCategoryMutation(options: VueApolloComposable.UseMutationOptions<DeleteCategoryMutation, DeleteCategoryMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DeleteCategoryMutation, DeleteCategoryMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DeleteCategoryMutation, DeleteCategoryMutationVariables>(DeleteCategoryDocument, options);
}
export type DeleteCategoryMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DeleteCategoryMutation, DeleteCategoryMutationVariables>;
export const CreateTransactionDocument = gql`
    mutation CreateTransaction($input: CreateTransactionInput!) {
  createTransaction(input: $input) {
    ...TransactionFields
  }
}
    ${TransactionFieldsFragmentDoc}`;

/**
 * __useCreateTransactionMutation__
 *
 * To run a mutation, you first call `useCreateTransactionMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCreateTransactionMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCreateTransactionMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useCreateTransactionMutation(options: VueApolloComposable.UseMutationOptions<CreateTransactionMutation, CreateTransactionMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CreateTransactionMutation, CreateTransactionMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CreateTransactionMutation, CreateTransactionMutationVariables>(CreateTransactionDocument, options);
}
export type CreateTransactionMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CreateTransactionMutation, CreateTransactionMutationVariables>;
export const UpdateTransactionDocument = gql`
    mutation UpdateTransaction($input: UpdateTransactionInput!) {
  updateTransaction(input: $input) {
    ...TransactionFields
  }
}
    ${TransactionFieldsFragmentDoc}`;

/**
 * __useUpdateTransactionMutation__
 *
 * To run a mutation, you first call `useUpdateTransactionMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useUpdateTransactionMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useUpdateTransactionMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useUpdateTransactionMutation(options: VueApolloComposable.UseMutationOptions<UpdateTransactionMutation, UpdateTransactionMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<UpdateTransactionMutation, UpdateTransactionMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<UpdateTransactionMutation, UpdateTransactionMutationVariables>(UpdateTransactionDocument, options);
}
export type UpdateTransactionMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<UpdateTransactionMutation, UpdateTransactionMutationVariables>;
export const DeleteTransactionDocument = gql`
    mutation DeleteTransaction($id: ID!) {
  deleteTransaction(id: $id) {
    ...TransactionFields
  }
}
    ${TransactionFieldsFragmentDoc}`;

/**
 * __useDeleteTransactionMutation__
 *
 * To run a mutation, you first call `useDeleteTransactionMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDeleteTransactionMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDeleteTransactionMutation({
 *   variables: {
 *     id: // value for 'id'
 *   },
 * });
 */
export function useDeleteTransactionMutation(options: VueApolloComposable.UseMutationOptions<DeleteTransactionMutation, DeleteTransactionMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DeleteTransactionMutation, DeleteTransactionMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DeleteTransactionMutation, DeleteTransactionMutationVariables>(DeleteTransactionDocument, options);
}
export type DeleteTransactionMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DeleteTransactionMutation, DeleteTransactionMutationVariables>;
export const CreateTransferDocument = gql`
    mutation CreateTransfer($input: CreateTransferInput!) {
  createTransfer(input: $input) {
    ...TransferFields
  }
}
    ${TransferFieldsFragmentDoc}`;

/**
 * __useCreateTransferMutation__
 *
 * To run a mutation, you first call `useCreateTransferMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCreateTransferMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCreateTransferMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useCreateTransferMutation(options: VueApolloComposable.UseMutationOptions<CreateTransferMutation, CreateTransferMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CreateTransferMutation, CreateTransferMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CreateTransferMutation, CreateTransferMutationVariables>(CreateTransferDocument, options);
}
export type CreateTransferMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CreateTransferMutation, CreateTransferMutationVariables>;
export const UpdateTransferDocument = gql`
    mutation UpdateTransfer($input: UpdateTransferInput!) {
  updateTransfer(input: $input) {
    ...TransferFields
  }
}
    ${TransferFieldsFragmentDoc}`;

/**
 * __useUpdateTransferMutation__
 *
 * To run a mutation, you first call `useUpdateTransferMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useUpdateTransferMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useUpdateTransferMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useUpdateTransferMutation(options: VueApolloComposable.UseMutationOptions<UpdateTransferMutation, UpdateTransferMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<UpdateTransferMutation, UpdateTransferMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<UpdateTransferMutation, UpdateTransferMutationVariables>(UpdateTransferDocument, options);
}
export type UpdateTransferMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<UpdateTransferMutation, UpdateTransferMutationVariables>;
export const DeleteTransferDocument = gql`
    mutation DeleteTransfer($id: ID!) {
  deleteTransfer(id: $id)
}
    `;

/**
 * __useDeleteTransferMutation__
 *
 * To run a mutation, you first call `useDeleteTransferMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDeleteTransferMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDeleteTransferMutation({
 *   variables: {
 *     id: // value for 'id'
 *   },
 * });
 */
export function useDeleteTransferMutation(options: VueApolloComposable.UseMutationOptions<DeleteTransferMutation, DeleteTransferMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DeleteTransferMutation, DeleteTransferMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DeleteTransferMutation, DeleteTransferMutationVariables>(DeleteTransferDocument, options);
}
export type DeleteTransferMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DeleteTransferMutation, DeleteTransferMutationVariables>;
export const GetAccountsDocument = gql`
    query GetAccounts {
  accounts {
    ...AccountFields
  }
}
    ${AccountFieldsFragmentDoc}`;

/**
 * __useGetAccountsQuery__
 *
 * To run a query within a Vue component, call `useGetAccountsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAccountsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetAccountsQuery();
 */
export function useGetAccountsQuery(options: VueApolloComposable.UseQueryOptions<GetAccountsQuery, GetAccountsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAccountsQuery, GetAccountsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAccountsQuery, GetAccountsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetAccountsQuery, GetAccountsQueryVariables>(GetAccountsDocument, {}, options);
}
export function useGetAccountsLazyQuery(options: VueApolloComposable.UseQueryOptions<GetAccountsQuery, GetAccountsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAccountsQuery, GetAccountsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAccountsQuery, GetAccountsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetAccountsQuery, GetAccountsQueryVariables>(GetAccountsDocument, {}, options);
}
export type GetAccountsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetAccountsQuery, GetAccountsQueryVariables>;
export const GetSupportedCurrenciesDocument = gql`
    query GetSupportedCurrencies {
  supportedCurrencies
}
    `;

/**
 * __useGetSupportedCurrenciesQuery__
 *
 * To run a query within a Vue component, call `useGetSupportedCurrenciesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSupportedCurrenciesQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetSupportedCurrenciesQuery();
 */
export function useGetSupportedCurrenciesQuery(options: VueApolloComposable.UseQueryOptions<GetSupportedCurrenciesQuery, GetSupportedCurrenciesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSupportedCurrenciesQuery, GetSupportedCurrenciesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSupportedCurrenciesQuery, GetSupportedCurrenciesQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetSupportedCurrenciesQuery, GetSupportedCurrenciesQueryVariables>(GetSupportedCurrenciesDocument, {}, options);
}
export function useGetSupportedCurrenciesLazyQuery(options: VueApolloComposable.UseQueryOptions<GetSupportedCurrenciesQuery, GetSupportedCurrenciesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSupportedCurrenciesQuery, GetSupportedCurrenciesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSupportedCurrenciesQuery, GetSupportedCurrenciesQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetSupportedCurrenciesQuery, GetSupportedCurrenciesQueryVariables>(GetSupportedCurrenciesDocument, {}, options);
}
export type GetSupportedCurrenciesQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetSupportedCurrenciesQuery, GetSupportedCurrenciesQueryVariables>;
export const GetCategoriesDocument = gql`
    query GetCategories($type: CategoryType) {
  categories(type: $type) {
    ...CategoryFields
  }
}
    ${CategoryFieldsFragmentDoc}`;

/**
 * __useGetCategoriesQuery__
 *
 * To run a query within a Vue component, call `useGetCategoriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCategoriesQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetCategoriesQuery({
 *   type: // value for 'type'
 * });
 */
export function useGetCategoriesQuery(variables: GetCategoriesQueryVariables | VueCompositionApi.Ref<GetCategoriesQueryVariables> | ReactiveFunction<GetCategoriesQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<GetCategoriesQuery, GetCategoriesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetCategoriesQuery, GetCategoriesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetCategoriesQuery, GetCategoriesQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetCategoriesQuery, GetCategoriesQueryVariables>(GetCategoriesDocument, variables, options);
}
export function useGetCategoriesLazyQuery(variables: GetCategoriesQueryVariables | VueCompositionApi.Ref<GetCategoriesQueryVariables> | ReactiveFunction<GetCategoriesQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<GetCategoriesQuery, GetCategoriesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetCategoriesQuery, GetCategoriesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetCategoriesQuery, GetCategoriesQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetCategoriesQuery, GetCategoriesQueryVariables>(GetCategoriesDocument, variables, options);
}
export type GetCategoriesQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetCategoriesQuery, GetCategoriesQueryVariables>;
export const GetTransactionsPaginatedDocument = gql`
    query GetTransactionsPaginated($pagination: PaginationInput, $filters: TransactionFilterInput) {
  transactions(pagination: $pagination, filters: $filters) {
    edges {
      node {
        ...TransactionFields
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
    ${TransactionFieldsFragmentDoc}`;

/**
 * __useGetTransactionsPaginatedQuery__
 *
 * To run a query within a Vue component, call `useGetTransactionsPaginatedQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTransactionsPaginatedQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetTransactionsPaginatedQuery({
 *   pagination: // value for 'pagination'
 *   filters: // value for 'filters'
 * });
 */
export function useGetTransactionsPaginatedQuery(variables: GetTransactionsPaginatedQueryVariables | VueCompositionApi.Ref<GetTransactionsPaginatedQueryVariables> | ReactiveFunction<GetTransactionsPaginatedQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<GetTransactionsPaginatedQuery, GetTransactionsPaginatedQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTransactionsPaginatedQuery, GetTransactionsPaginatedQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTransactionsPaginatedQuery, GetTransactionsPaginatedQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetTransactionsPaginatedQuery, GetTransactionsPaginatedQueryVariables>(GetTransactionsPaginatedDocument, variables, options);
}
export function useGetTransactionsPaginatedLazyQuery(variables: GetTransactionsPaginatedQueryVariables | VueCompositionApi.Ref<GetTransactionsPaginatedQueryVariables> | ReactiveFunction<GetTransactionsPaginatedQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<GetTransactionsPaginatedQuery, GetTransactionsPaginatedQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTransactionsPaginatedQuery, GetTransactionsPaginatedQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTransactionsPaginatedQuery, GetTransactionsPaginatedQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetTransactionsPaginatedQuery, GetTransactionsPaginatedQueryVariables>(GetTransactionsPaginatedDocument, variables, options);
}
export type GetTransactionsPaginatedQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetTransactionsPaginatedQuery, GetTransactionsPaginatedQueryVariables>;
export const GetTransferDocument = gql`
    query GetTransfer($id: ID!) {
  transfer(id: $id) {
    ...TransferFields
  }
}
    ${TransferFieldsFragmentDoc}`;

/**
 * __useGetTransferQuery__
 *
 * To run a query within a Vue component, call `useGetTransferQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTransferQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetTransferQuery({
 *   id: // value for 'id'
 * });
 */
export function useGetTransferQuery(variables: GetTransferQueryVariables | VueCompositionApi.Ref<GetTransferQueryVariables> | ReactiveFunction<GetTransferQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTransferQuery, GetTransferQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTransferQuery, GetTransferQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTransferQuery, GetTransferQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetTransferQuery, GetTransferQueryVariables>(GetTransferDocument, variables, options);
}
export function useGetTransferLazyQuery(variables?: GetTransferQueryVariables | VueCompositionApi.Ref<GetTransferQueryVariables> | ReactiveFunction<GetTransferQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTransferQuery, GetTransferQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTransferQuery, GetTransferQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTransferQuery, GetTransferQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetTransferQuery, GetTransferQueryVariables>(GetTransferDocument, variables, options);
}
export type GetTransferQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetTransferQuery, GetTransferQueryVariables>;
export const GetTransactionPatternsDocument = gql`
    query GetTransactionPatterns($type: TransactionPatternType!) {
  getTransactionPatterns(type: $type) {
    accountId
    accountName
    categoryId
    categoryName
  }
}
    `;

/**
 * __useGetTransactionPatternsQuery__
 *
 * To run a query within a Vue component, call `useGetTransactionPatternsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTransactionPatternsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetTransactionPatternsQuery({
 *   type: // value for 'type'
 * });
 */
export function useGetTransactionPatternsQuery(variables: GetTransactionPatternsQueryVariables | VueCompositionApi.Ref<GetTransactionPatternsQueryVariables> | ReactiveFunction<GetTransactionPatternsQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTransactionPatternsQuery, GetTransactionPatternsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTransactionPatternsQuery, GetTransactionPatternsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTransactionPatternsQuery, GetTransactionPatternsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetTransactionPatternsQuery, GetTransactionPatternsQueryVariables>(GetTransactionPatternsDocument, variables, options);
}
export function useGetTransactionPatternsLazyQuery(variables?: GetTransactionPatternsQueryVariables | VueCompositionApi.Ref<GetTransactionPatternsQueryVariables> | ReactiveFunction<GetTransactionPatternsQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTransactionPatternsQuery, GetTransactionPatternsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTransactionPatternsQuery, GetTransactionPatternsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTransactionPatternsQuery, GetTransactionPatternsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetTransactionPatternsQuery, GetTransactionPatternsQueryVariables>(GetTransactionPatternsDocument, variables, options);
}
export type GetTransactionPatternsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetTransactionPatternsQuery, GetTransactionPatternsQueryVariables>;
export const GetMonthlyReportDocument = gql`
    query GetMonthlyReport($year: Int!, $month: Int!, $type: TransactionType!) {
  monthlyReport(year: $year, month: $month, type: $type) {
    ...MonthlyReportFields
  }
}
    ${MonthlyReportFieldsFragmentDoc}`;

/**
 * __useGetMonthlyReportQuery__
 *
 * To run a query within a Vue component, call `useGetMonthlyReportQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMonthlyReportQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetMonthlyReportQuery({
 *   year: // value for 'year'
 *   month: // value for 'month'
 *   type: // value for 'type'
 * });
 */
export function useGetMonthlyReportQuery(variables: GetMonthlyReportQueryVariables | VueCompositionApi.Ref<GetMonthlyReportQueryVariables> | ReactiveFunction<GetMonthlyReportQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetMonthlyReportQuery, GetMonthlyReportQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetMonthlyReportQuery, GetMonthlyReportQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetMonthlyReportQuery, GetMonthlyReportQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetMonthlyReportQuery, GetMonthlyReportQueryVariables>(GetMonthlyReportDocument, variables, options);
}
export function useGetMonthlyReportLazyQuery(variables?: GetMonthlyReportQueryVariables | VueCompositionApi.Ref<GetMonthlyReportQueryVariables> | ReactiveFunction<GetMonthlyReportQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetMonthlyReportQuery, GetMonthlyReportQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetMonthlyReportQuery, GetMonthlyReportQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetMonthlyReportQuery, GetMonthlyReportQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetMonthlyReportQuery, GetMonthlyReportQueryVariables>(GetMonthlyReportDocument, variables, options);
}
export type GetMonthlyReportQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetMonthlyReportQuery, GetMonthlyReportQueryVariables>;
export const GetTransactionDescriptionSuggestionsDocument = gql`
    query GetTransactionDescriptionSuggestions($searchText: String!) {
  transactionDescriptionSuggestions(searchText: $searchText)
}
    `;

/**
 * __useGetTransactionDescriptionSuggestionsQuery__
 *
 * To run a query within a Vue component, call `useGetTransactionDescriptionSuggestionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTransactionDescriptionSuggestionsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetTransactionDescriptionSuggestionsQuery({
 *   searchText: // value for 'searchText'
 * });
 */
export function useGetTransactionDescriptionSuggestionsQuery(variables: GetTransactionDescriptionSuggestionsQueryVariables | VueCompositionApi.Ref<GetTransactionDescriptionSuggestionsQueryVariables> | ReactiveFunction<GetTransactionDescriptionSuggestionsQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTransactionDescriptionSuggestionsQuery, GetTransactionDescriptionSuggestionsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTransactionDescriptionSuggestionsQuery, GetTransactionDescriptionSuggestionsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTransactionDescriptionSuggestionsQuery, GetTransactionDescriptionSuggestionsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetTransactionDescriptionSuggestionsQuery, GetTransactionDescriptionSuggestionsQueryVariables>(GetTransactionDescriptionSuggestionsDocument, variables, options);
}
export function useGetTransactionDescriptionSuggestionsLazyQuery(variables?: GetTransactionDescriptionSuggestionsQueryVariables | VueCompositionApi.Ref<GetTransactionDescriptionSuggestionsQueryVariables> | ReactiveFunction<GetTransactionDescriptionSuggestionsQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTransactionDescriptionSuggestionsQuery, GetTransactionDescriptionSuggestionsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTransactionDescriptionSuggestionsQuery, GetTransactionDescriptionSuggestionsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTransactionDescriptionSuggestionsQuery, GetTransactionDescriptionSuggestionsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetTransactionDescriptionSuggestionsQuery, GetTransactionDescriptionSuggestionsQueryVariables>(GetTransactionDescriptionSuggestionsDocument, variables, options);
}
export type GetTransactionDescriptionSuggestionsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetTransactionDescriptionSuggestionsQuery, GetTransactionDescriptionSuggestionsQueryVariables>;
export const GetMonthlyWeekdayReportDocument = gql`
    query GetMonthlyWeekdayReport($year: Int!, $month: Int!, $type: TransactionType!) {
  monthlyWeekdayReport(year: $year, month: $month, type: $type) {
    year
    month
    type
    weekdays {
      weekday
      currencyBreakdowns {
        currency
        totalAmount
        averageAmount
        percentage
      }
    }
    currencyTotals {
      currency
      totalAmount
    }
  }
}
    `;

/**
 * __useGetMonthlyWeekdayReportQuery__
 *
 * To run a query within a Vue component, call `useGetMonthlyWeekdayReportQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMonthlyWeekdayReportQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetMonthlyWeekdayReportQuery({
 *   year: // value for 'year'
 *   month: // value for 'month'
 *   type: // value for 'type'
 * });
 */
export function useGetMonthlyWeekdayReportQuery(variables: GetMonthlyWeekdayReportQueryVariables | VueCompositionApi.Ref<GetMonthlyWeekdayReportQueryVariables> | ReactiveFunction<GetMonthlyWeekdayReportQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetMonthlyWeekdayReportQuery, GetMonthlyWeekdayReportQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetMonthlyWeekdayReportQuery, GetMonthlyWeekdayReportQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetMonthlyWeekdayReportQuery, GetMonthlyWeekdayReportQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetMonthlyWeekdayReportQuery, GetMonthlyWeekdayReportQueryVariables>(GetMonthlyWeekdayReportDocument, variables, options);
}
export function useGetMonthlyWeekdayReportLazyQuery(variables?: GetMonthlyWeekdayReportQueryVariables | VueCompositionApi.Ref<GetMonthlyWeekdayReportQueryVariables> | ReactiveFunction<GetMonthlyWeekdayReportQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetMonthlyWeekdayReportQuery, GetMonthlyWeekdayReportQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetMonthlyWeekdayReportQuery, GetMonthlyWeekdayReportQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetMonthlyWeekdayReportQuery, GetMonthlyWeekdayReportQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetMonthlyWeekdayReportQuery, GetMonthlyWeekdayReportQueryVariables>(GetMonthlyWeekdayReportDocument, variables, options);
}
export type GetMonthlyWeekdayReportQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetMonthlyWeekdayReportQuery, GetMonthlyWeekdayReportQueryVariables>;