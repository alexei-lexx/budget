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
  name: Scalars['String']['output'];
};

export type AgentTraceMessage = AgentTraceText | AgentTraceToolCall | AgentTraceToolResult;

export type AgentTraceText = {
  __typename?: 'AgentTraceText';
  content: Scalars['String']['output'];
};

export type AgentTraceToolCall = {
  __typename?: 'AgentTraceToolCall';
  input: Scalars['String']['output'];
  toolName: Scalars['String']['output'];
};

export type AgentTraceToolResult = {
  __typename?: 'AgentTraceToolResult';
  output: Scalars['String']['output'];
  toolName: Scalars['String']['output'];
};

export type ByCategoryReport = {
  __typename?: 'ByCategoryReport';
  categories: Array<ByCategoryReportCategory>;
  currencyTotals: Array<ByCategoryReportCurrencyTotal>;
  month?: Maybe<Scalars['Int']['output']>;
  type: ReportType;
  year: Scalars['Int']['output'];
};

export type ByCategoryReportCategory = {
  __typename?: 'ByCategoryReportCategory';
  categoryId?: Maybe<Scalars['ID']['output']>;
  categoryName: Scalars['String']['output'];
  currencyBreakdowns: Array<ByCategoryReportCurrencyBreakdown>;
  topTransactions: Array<Transaction>;
  totalTransactionCount: Scalars['Int']['output'];
};

export type ByCategoryReportCurrencyBreakdown = {
  __typename?: 'ByCategoryReportCurrencyBreakdown';
  currency: Scalars['String']['output'];
  percentage: Scalars['Int']['output'];
  totalAmount: Scalars['Float']['output'];
};

export type ByCategoryReportCurrencyTotal = {
  __typename?: 'ByCategoryReportCurrencyTotal';
  currency: Scalars['String']['output'];
  totalAmount: Scalars['Float']['output'];
};

export type Category = {
  __typename?: 'Category';
  excludeFromReports: Scalars['Boolean']['output'];
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
  excludeFromReports: Scalars['Boolean']['input'];
  name: Scalars['String']['input'];
  type: CategoryType;
};

export type CreateTransactionFromTextFailure = {
  __typename?: 'CreateTransactionFromTextFailure';
  agentTrace: Array<AgentTraceMessage>;
  message: Scalars['String']['output'];
};

/** Input for creating a transaction from a natural-language text description. */
export type CreateTransactionFromTextInput = {
  /**
   * Free-text description of the transaction.
   * Examples: "spent 45 euro at rewe yesterday", "received salary 4500 USD", "got a refund from zalando 29.99"
   */
  text: Scalars['String']['input'];
};

export type CreateTransactionFromTextOutput = CreateTransactionFromTextFailure | CreateTransactionFromTextSuccess;

export type CreateTransactionFromTextSuccess = {
  __typename?: 'CreateTransactionFromTextSuccess';
  agentTrace: Array<AgentTraceMessage>;
  transaction: Transaction;
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

export type DateRangeInput = {
  endDate: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
};

export type InsightFailure = {
  __typename?: 'InsightFailure';
  agentTrace: Array<AgentTraceMessage>;
  message: Scalars['String']['output'];
};

export type InsightInput = {
  dateRange: DateRangeInput;
  question: Scalars['String']['input'];
};

export type InsightOutput = InsightFailure | InsightSuccess;

export type InsightSuccess = {
  __typename?: 'InsightSuccess';
  agentTrace: Array<AgentTraceMessage>;
  answer: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createAccount: Account;
  createCategory: Category;
  createTransaction: Transaction;
  createTransactionFromText: CreateTransactionFromTextOutput;
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
  updateUserSettings: UserSettings;
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


export type MutationCreateTransactionFromTextArgs = {
  input: CreateTransactionFromTextInput;
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


export type MutationUpdateUserSettingsArgs = {
  input: UpdateUserSettingsInput;
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
  byCategoryReport: ByCategoryReport;
  categories: Array<Category>;
  insight: InsightOutput;
  supportedCurrencies: Array<Scalars['String']['output']>;
  transactionDescriptionSuggestions: Array<Scalars['String']['output']>;
  transactionPatterns: Array<TransactionPattern>;
  transactions: TransactionConnection;
  transfer?: Maybe<Transfer>;
  userSettings: UserSettings;
};


export type QueryByCategoryReportArgs = {
  month?: InputMaybe<Scalars['Int']['input']>;
  type: ReportType;
  year: Scalars['Int']['input'];
};


export type QueryCategoriesArgs = {
  type?: InputMaybe<CategoryType>;
};


export type QueryInsightArgs = {
  input: InsightInput;
};


export type QueryTransactionDescriptionSuggestionsArgs = {
  searchText: Scalars['String']['input'];
};


export type QueryTransactionPatternsArgs = {
  type: TransactionPatternType;
};


export type QueryTransactionsArgs = {
  filters?: InputMaybe<TransactionFilterInput>;
  pagination?: InputMaybe<PaginationInput>;
};


export type QueryTransferArgs = {
  id: Scalars['ID']['input'];
};

export type ReportType =
  | 'EXPENSE'
  | 'INCOME';

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
  | 'INCOME'
  | 'REFUND';

export type TransactionType =
  | 'EXPENSE'
  | 'INCOME'
  | 'REFUND'
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
  excludeFromReports?: InputMaybe<Scalars['Boolean']['input']>;
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

export type UpdateUserSettingsInput = {
  transactionPatternsLimit?: InputMaybe<Scalars['Int']['input']>;
  voiceInputLanguage?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  email: Scalars['String']['output'];
};

export type UserSettings = {
  __typename?: 'UserSettings';
  transactionPatternsLimit: Scalars['Int']['output'];
  voiceInputLanguage?: Maybe<Scalars['String']['output']>;
};

export type AccountFieldsFragment = { __typename?: 'Account', id: string, name: string, currency: string, initialBalance: number, balance: number };

export type CategoryFieldsFragment = { __typename?: 'Category', id: string, name: string, type: CategoryType, excludeFromReports: boolean };

export type TransactionFieldsFragment = { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined };

type AgentTraceFields_AgentTraceText_Fragment = { __typename?: 'AgentTraceText', content: string };

type AgentTraceFields_AgentTraceToolCall_Fragment = { __typename?: 'AgentTraceToolCall', toolName: string, input: string };

type AgentTraceFields_AgentTraceToolResult_Fragment = { __typename?: 'AgentTraceToolResult', toolName: string, output: string };

export type AgentTraceFieldsFragment =
  | AgentTraceFields_AgentTraceText_Fragment
  | AgentTraceFields_AgentTraceToolCall_Fragment
  | AgentTraceFields_AgentTraceToolResult_Fragment
;

export type TransferFieldsFragment = { __typename?: 'Transfer', id: string, outboundTransaction: { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined }, inboundTransaction: { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined } };

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


export type CreateCategoryMutation = { __typename?: 'Mutation', createCategory: { __typename?: 'Category', id: string, name: string, type: CategoryType, excludeFromReports: boolean } };

export type UpdateCategoryMutationVariables = Exact<{
  input: UpdateCategoryInput;
}>;


export type UpdateCategoryMutation = { __typename?: 'Mutation', updateCategory: { __typename?: 'Category', id: string, name: string, type: CategoryType, excludeFromReports: boolean } };

export type DeleteCategoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteCategoryMutation = { __typename?: 'Mutation', deleteCategory: { __typename?: 'Category', id: string, name: string, type: CategoryType, excludeFromReports: boolean } };

export type CreateTransactionMutationVariables = Exact<{
  input: CreateTransactionInput;
}>;


export type CreateTransactionMutation = { __typename?: 'Mutation', createTransaction: { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined } };

export type CreateTransactionFromTextMutationVariables = Exact<{
  input: CreateTransactionFromTextInput;
}>;


export type CreateTransactionFromTextMutation = { __typename?: 'Mutation', createTransactionFromText:
    | { __typename?: 'CreateTransactionFromTextFailure', message: string, agentTrace: Array<
        | { __typename?: 'AgentTraceText', content: string }
        | { __typename?: 'AgentTraceToolCall', toolName: string, input: string }
        | { __typename?: 'AgentTraceToolResult', toolName: string, output: string }
      > }
    | { __typename?: 'CreateTransactionFromTextSuccess', transaction: { __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined }, agentTrace: Array<
        | { __typename?: 'AgentTraceText', content: string }
        | { __typename?: 'AgentTraceToolCall', toolName: string, input: string }
        | { __typename?: 'AgentTraceToolResult', toolName: string, output: string }
      > }
   };

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

export type UpdateUserSettingsMutationVariables = Exact<{
  input: UpdateUserSettingsInput;
}>;


export type UpdateUserSettingsMutation = { __typename?: 'Mutation', updateUserSettings: { __typename?: 'UserSettings', transactionPatternsLimit: number, voiceInputLanguage?: string | null | undefined } };

export type GetAccountsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAccountsQuery = { __typename?: 'Query', accounts: Array<{ __typename?: 'Account', id: string, name: string, currency: string, initialBalance: number, balance: number }> };

export type GetSupportedCurrenciesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSupportedCurrenciesQuery = { __typename?: 'Query', supportedCurrencies: Array<string> };

export type GetCategoriesQueryVariables = Exact<{
  type?: InputMaybe<CategoryType>;
}>;


export type GetCategoriesQuery = { __typename?: 'Query', categories: Array<{ __typename?: 'Category', id: string, name: string, type: CategoryType, excludeFromReports: boolean }> };

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


export type GetTransactionPatternsQuery = { __typename?: 'Query', transactionPatterns: Array<{ __typename?: 'TransactionPattern', accountId: string, accountName: string, categoryId: string, categoryName: string }> };

export type GetByCategoryReportQueryVariables = Exact<{
  year: Scalars['Int']['input'];
  month?: InputMaybe<Scalars['Int']['input']>;
  type: ReportType;
}>;


export type GetByCategoryReportQuery = { __typename?: 'Query', byCategoryReport: { __typename?: 'ByCategoryReport', year: number, month?: number | null | undefined, type: ReportType, categories: Array<{ __typename?: 'ByCategoryReportCategory', categoryId?: string | null | undefined, categoryName: string, totalTransactionCount: number, currencyBreakdowns: Array<{ __typename?: 'ByCategoryReportCurrencyBreakdown', currency: string, totalAmount: number, percentage: number }>, topTransactions: Array<{ __typename?: 'Transaction', id: string, type: TransactionType, amount: number, currency: string, date: string, description?: string | null | undefined, transferId?: string | null | undefined, account: { __typename?: 'TransactionEmbeddedAccount', id: string, name: string, isArchived: boolean }, category?: { __typename?: 'TransactionEmbeddedCategory', id: string, name: string, isArchived: boolean } | null | undefined }> }>, currencyTotals: Array<{ __typename?: 'ByCategoryReportCurrencyTotal', currency: string, totalAmount: number }> } };

export type GetTransactionDescriptionSuggestionsQueryVariables = Exact<{
  searchText: Scalars['String']['input'];
}>;


export type GetTransactionDescriptionSuggestionsQuery = { __typename?: 'Query', transactionDescriptionSuggestions: Array<string> };

export type GetInsightQueryVariables = Exact<{
  input: InsightInput;
}>;


export type GetInsightQuery = { __typename?: 'Query', insight:
    | { __typename?: 'InsightFailure', message: string, agentTrace: Array<
        | { __typename?: 'AgentTraceText', content: string }
        | { __typename?: 'AgentTraceToolCall', toolName: string, input: string }
        | { __typename?: 'AgentTraceToolResult', toolName: string, output: string }
      > }
    | { __typename?: 'InsightSuccess', answer: string, agentTrace: Array<
        | { __typename?: 'AgentTraceText', content: string }
        | { __typename?: 'AgentTraceToolCall', toolName: string, input: string }
        | { __typename?: 'AgentTraceToolResult', toolName: string, output: string }
      > }
   };

export type GetUserSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserSettingsQuery = { __typename?: 'Query', userSettings: { __typename?: 'UserSettings', transactionPatternsLimit: number, voiceInputLanguage?: string | null | undefined } };
