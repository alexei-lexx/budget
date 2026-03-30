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
   * Whether the text was captured via voice recognition.
   * When true, the agent checks whether integer amounts may represent spoken prices collapsed by speech-to-text.
   */
  isVoiceInput?: InputMaybe<Scalars['Boolean']['input']>;
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

export type InsightFailure = {
  __typename?: 'InsightFailure';
  agentTrace: Array<AgentTraceMessage>;
  message: Scalars['String']['output'];
};

export type InsightInput = {
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
  connectTelegramBot: TelegramBot;
  createAccount: Account;
  createCategory: Category;
  createTransaction: Transaction;
  createTransactionFromText: CreateTransactionFromTextOutput;
  createTransfer: Transfer;
  deleteAccount?: Maybe<Scalars['Boolean']['output']>;
  deleteCategory: Category;
  deleteTransaction: Transaction;
  deleteTransfer?: Maybe<Scalars['Boolean']['output']>;
  disconnectTelegramBot?: Maybe<Scalars['Boolean']['output']>;
  ensureUser: User;
  updateAccount: Account;
  updateCategory: Category;
  updateTransaction: Transaction;
  updateTransfer: Transfer;
  updateUserSettings: UserSettings;
};


export type MutationConnectTelegramBotArgs = {
  token: Scalars['String']['input'];
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
  telegramBot?: Maybe<TelegramBot>;
  testTelegramBot?: Maybe<Scalars['Boolean']['output']>;
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

export type TelegramBot = {
  __typename?: 'TelegramBot';
  id: Scalars['ID']['output'];
  maskedToken: Scalars['String']['output'];
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

export type ConnectTelegramBotMutationVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type ConnectTelegramBotMutation = { __typename?: 'Mutation', connectTelegramBot: { __typename?: 'TelegramBot', id: string, maskedToken: string } };

export type DisconnectTelegramBotMutationVariables = Exact<{ [key: string]: never; }>;


export type DisconnectTelegramBotMutation = { __typename?: 'Mutation', disconnectTelegramBot?: boolean | null | undefined };

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

export type GetTelegramBotQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTelegramBotQuery = { __typename?: 'Query', telegramBot?: { __typename?: 'TelegramBot', id: string, maskedToken: string } | null | undefined };

export type TestTelegramBotQueryVariables = Exact<{ [key: string]: never; }>;


export type TestTelegramBotQuery = { __typename?: 'Query', testTelegramBot?: boolean | null | undefined };

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
  excludeFromReports
}
    `;
export const AgentTraceFieldsFragmentDoc = gql`
    fragment AgentTraceFields on AgentTraceMessage {
  ... on AgentTraceText {
    content
  }
  ... on AgentTraceToolCall {
    toolName
    input
  }
  ... on AgentTraceToolResult {
    toolName
    output
  }
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
export const CreateTransactionFromTextDocument = gql`
    mutation CreateTransactionFromText($input: CreateTransactionFromTextInput!) {
  createTransactionFromText(input: $input) {
    ... on CreateTransactionFromTextSuccess {
      transaction {
        ...TransactionFields
      }
      agentTrace {
        ...AgentTraceFields
      }
    }
    ... on CreateTransactionFromTextFailure {
      message
      agentTrace {
        ...AgentTraceFields
      }
    }
  }
}
    ${TransactionFieldsFragmentDoc}
${AgentTraceFieldsFragmentDoc}`;

/**
 * __useCreateTransactionFromTextMutation__
 *
 * To run a mutation, you first call `useCreateTransactionFromTextMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCreateTransactionFromTextMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCreateTransactionFromTextMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useCreateTransactionFromTextMutation(options: VueApolloComposable.UseMutationOptions<CreateTransactionFromTextMutation, CreateTransactionFromTextMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CreateTransactionFromTextMutation, CreateTransactionFromTextMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CreateTransactionFromTextMutation, CreateTransactionFromTextMutationVariables>(CreateTransactionFromTextDocument, options);
}
export type CreateTransactionFromTextMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CreateTransactionFromTextMutation, CreateTransactionFromTextMutationVariables>;
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
export const UpdateUserSettingsDocument = gql`
    mutation UpdateUserSettings($input: UpdateUserSettingsInput!) {
  updateUserSettings(input: $input) {
    transactionPatternsLimit
    voiceInputLanguage
  }
}
    `;

/**
 * __useUpdateUserSettingsMutation__
 *
 * To run a mutation, you first call `useUpdateUserSettingsMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserSettingsMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useUpdateUserSettingsMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useUpdateUserSettingsMutation(options: VueApolloComposable.UseMutationOptions<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>(UpdateUserSettingsDocument, options);
}
export type UpdateUserSettingsMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>;
export const ConnectTelegramBotDocument = gql`
    mutation ConnectTelegramBot($token: String!) {
  connectTelegramBot(token: $token) {
    id
    maskedToken
  }
}
    `;

/**
 * __useConnectTelegramBotMutation__
 *
 * To run a mutation, you first call `useConnectTelegramBotMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useConnectTelegramBotMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useConnectTelegramBotMutation({
 *   variables: {
 *     token: // value for 'token'
 *   },
 * });
 */
export function useConnectTelegramBotMutation(options: VueApolloComposable.UseMutationOptions<ConnectTelegramBotMutation, ConnectTelegramBotMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<ConnectTelegramBotMutation, ConnectTelegramBotMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<ConnectTelegramBotMutation, ConnectTelegramBotMutationVariables>(ConnectTelegramBotDocument, options);
}
export type ConnectTelegramBotMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<ConnectTelegramBotMutation, ConnectTelegramBotMutationVariables>;
export const DisconnectTelegramBotDocument = gql`
    mutation DisconnectTelegramBot {
  disconnectTelegramBot
}
    `;

/**
 * __useDisconnectTelegramBotMutation__
 *
 * To run a mutation, you first call `useDisconnectTelegramBotMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDisconnectTelegramBotMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDisconnectTelegramBotMutation();
 */
export function useDisconnectTelegramBotMutation(options: VueApolloComposable.UseMutationOptions<DisconnectTelegramBotMutation, DisconnectTelegramBotMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DisconnectTelegramBotMutation, DisconnectTelegramBotMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DisconnectTelegramBotMutation, DisconnectTelegramBotMutationVariables>(DisconnectTelegramBotDocument, options);
}
export type DisconnectTelegramBotMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DisconnectTelegramBotMutation, DisconnectTelegramBotMutationVariables>;
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
  transactionPatterns(type: $type) {
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
export const GetByCategoryReportDocument = gql`
    query GetByCategoryReport($year: Int!, $month: Int, $type: ReportType!) {
  byCategoryReport(year: $year, month: $month, type: $type) {
    year
    month
    type
    categories {
      categoryId
      categoryName
      currencyBreakdowns {
        currency
        totalAmount
        percentage
      }
      topTransactions {
        ...TransactionFields
      }
      totalTransactionCount
    }
    currencyTotals {
      currency
      totalAmount
    }
  }
}
    ${TransactionFieldsFragmentDoc}`;

/**
 * __useGetByCategoryReportQuery__
 *
 * To run a query within a Vue component, call `useGetByCategoryReportQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetByCategoryReportQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetByCategoryReportQuery({
 *   year: // value for 'year'
 *   month: // value for 'month'
 *   type: // value for 'type'
 * });
 */
export function useGetByCategoryReportQuery(variables: GetByCategoryReportQueryVariables | VueCompositionApi.Ref<GetByCategoryReportQueryVariables> | ReactiveFunction<GetByCategoryReportQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetByCategoryReportQuery, GetByCategoryReportQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetByCategoryReportQuery, GetByCategoryReportQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetByCategoryReportQuery, GetByCategoryReportQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetByCategoryReportQuery, GetByCategoryReportQueryVariables>(GetByCategoryReportDocument, variables, options);
}
export function useGetByCategoryReportLazyQuery(variables?: GetByCategoryReportQueryVariables | VueCompositionApi.Ref<GetByCategoryReportQueryVariables> | ReactiveFunction<GetByCategoryReportQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetByCategoryReportQuery, GetByCategoryReportQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetByCategoryReportQuery, GetByCategoryReportQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetByCategoryReportQuery, GetByCategoryReportQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetByCategoryReportQuery, GetByCategoryReportQueryVariables>(GetByCategoryReportDocument, variables, options);
}
export type GetByCategoryReportQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetByCategoryReportQuery, GetByCategoryReportQueryVariables>;
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
export const GetInsightDocument = gql`
    query GetInsight($input: InsightInput!) {
  insight(input: $input) {
    ... on InsightSuccess {
      answer
      agentTrace {
        ...AgentTraceFields
      }
    }
    ... on InsightFailure {
      message
      agentTrace {
        ...AgentTraceFields
      }
    }
  }
}
    ${AgentTraceFieldsFragmentDoc}`;

/**
 * __useGetInsightQuery__
 *
 * To run a query within a Vue component, call `useGetInsightQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetInsightQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetInsightQuery({
 *   input: // value for 'input'
 * });
 */
export function useGetInsightQuery(variables: GetInsightQueryVariables | VueCompositionApi.Ref<GetInsightQueryVariables> | ReactiveFunction<GetInsightQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetInsightQuery, GetInsightQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetInsightQuery, GetInsightQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetInsightQuery, GetInsightQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetInsightQuery, GetInsightQueryVariables>(GetInsightDocument, variables, options);
}
export function useGetInsightLazyQuery(variables?: GetInsightQueryVariables | VueCompositionApi.Ref<GetInsightQueryVariables> | ReactiveFunction<GetInsightQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetInsightQuery, GetInsightQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetInsightQuery, GetInsightQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetInsightQuery, GetInsightQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetInsightQuery, GetInsightQueryVariables>(GetInsightDocument, variables, options);
}
export type GetInsightQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetInsightQuery, GetInsightQueryVariables>;
export const GetUserSettingsDocument = gql`
    query GetUserSettings {
  userSettings {
    transactionPatternsLimit
    voiceInputLanguage
  }
}
    `;

/**
 * __useGetUserSettingsQuery__
 *
 * To run a query within a Vue component, call `useGetUserSettingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserSettingsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetUserSettingsQuery();
 */
export function useGetUserSettingsQuery(options: VueApolloComposable.UseQueryOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetUserSettingsQuery, GetUserSettingsQueryVariables>(GetUserSettingsDocument, {}, options);
}
export function useGetUserSettingsLazyQuery(options: VueApolloComposable.UseQueryOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetUserSettingsQuery, GetUserSettingsQueryVariables>(GetUserSettingsDocument, {}, options);
}
export type GetUserSettingsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetUserSettingsQuery, GetUserSettingsQueryVariables>;
export const GetTelegramBotDocument = gql`
    query GetTelegramBot {
  telegramBot {
    id
    maskedToken
  }
}
    `;

/**
 * __useGetTelegramBotQuery__
 *
 * To run a query within a Vue component, call `useGetTelegramBotQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTelegramBotQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetTelegramBotQuery();
 */
export function useGetTelegramBotQuery(options: VueApolloComposable.UseQueryOptions<GetTelegramBotQuery, GetTelegramBotQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTelegramBotQuery, GetTelegramBotQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTelegramBotQuery, GetTelegramBotQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetTelegramBotQuery, GetTelegramBotQueryVariables>(GetTelegramBotDocument, {}, options);
}
export function useGetTelegramBotLazyQuery(options: VueApolloComposable.UseQueryOptions<GetTelegramBotQuery, GetTelegramBotQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTelegramBotQuery, GetTelegramBotQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTelegramBotQuery, GetTelegramBotQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetTelegramBotQuery, GetTelegramBotQueryVariables>(GetTelegramBotDocument, {}, options);
}
export type GetTelegramBotQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetTelegramBotQuery, GetTelegramBotQueryVariables>;
export const TestTelegramBotDocument = gql`
    query TestTelegramBot {
  testTelegramBot
}
    `;

/**
 * __useTestTelegramBotQuery__
 *
 * To run a query within a Vue component, call `useTestTelegramBotQuery` and pass it any options that fit your needs.
 * When your component renders, `useTestTelegramBotQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useTestTelegramBotQuery();
 */
export function useTestTelegramBotQuery(options: VueApolloComposable.UseQueryOptions<TestTelegramBotQuery, TestTelegramBotQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<TestTelegramBotQuery, TestTelegramBotQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<TestTelegramBotQuery, TestTelegramBotQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<TestTelegramBotQuery, TestTelegramBotQueryVariables>(TestTelegramBotDocument, {}, options);
}
export function useTestTelegramBotLazyQuery(options: VueApolloComposable.UseQueryOptions<TestTelegramBotQuery, TestTelegramBotQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<TestTelegramBotQuery, TestTelegramBotQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<TestTelegramBotQuery, TestTelegramBotQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<TestTelegramBotQuery, TestTelegramBotQueryVariables>(TestTelegramBotDocument, {}, options);
}
export type TestTelegramBotQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<TestTelegramBotQuery, TestTelegramBotQueryVariables>;