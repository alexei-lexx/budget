import { CategoryType } from '../models/category';
import { ReportType } from '../models/report';
import { TransactionPatternType } from '../models/transaction';
import { TransactionType } from '../models/transaction';
import { GraphQLResolveInfo } from 'graphql';
import { GraphQLContext } from '../graphql/context';
export type Maybe<T> = T | undefined;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type EnumResolverSignature<T, AllowedValues = any> = { [key in keyof T]?: AllowedValues };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
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

export { CategoryType };

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

export { ReportType };

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

export { TransactionPatternType };

export { TransactionType };

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



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping of union types */
export type ResolversUnionTypes<_RefType extends Record<string, unknown>> = {
  AgentTraceMessage:
    | ( AgentTraceText )
    | ( AgentTraceToolCall )
    | ( AgentTraceToolResult )
  ;
  CreateTransactionFromTextOutput:
    | ( Omit<CreateTransactionFromTextFailure, 'agentTrace'> & { agentTrace: Array<_RefType['AgentTraceMessage']> } )
    | ( Omit<CreateTransactionFromTextSuccess, 'agentTrace' | 'transaction'> & { agentTrace: Array<_RefType['AgentTraceMessage']>, transaction: _RefType['Transaction'] } )
  ;
  InsightOutput:
    | ( Omit<InsightFailure, 'agentTrace'> & { agentTrace: Array<_RefType['AgentTraceMessage']> } )
    | ( Omit<InsightSuccess, 'agentTrace'> & { agentTrace: Array<_RefType['AgentTraceMessage']> } )
  ;
};


/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Account: ResolverTypeWrapper<Omit<Account, 'balance'>>;
  AgentTraceMessage: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['AgentTraceMessage']>;
  AgentTraceText: ResolverTypeWrapper<AgentTraceText>;
  AgentTraceToolCall: ResolverTypeWrapper<AgentTraceToolCall>;
  AgentTraceToolResult: ResolverTypeWrapper<AgentTraceToolResult>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  ByCategoryReport: ResolverTypeWrapper<Omit<ByCategoryReport, 'categories'> & { categories: Array<ResolversTypes['ByCategoryReportCategory']> }>;
  ByCategoryReportCategory: ResolverTypeWrapper<Omit<ByCategoryReportCategory, 'topTransactions'> & { topTransactions: Array<ResolversTypes['Transaction']> }>;
  ByCategoryReportCurrencyBreakdown: ResolverTypeWrapper<ByCategoryReportCurrencyBreakdown>;
  ByCategoryReportCurrencyTotal: ResolverTypeWrapper<ByCategoryReportCurrencyTotal>;
  Category: ResolverTypeWrapper<Category>;
  CategoryType: CategoryType;
  CreateAccountInput: CreateAccountInput;
  CreateCategoryInput: CreateCategoryInput;
  CreateTransactionFromTextFailure: ResolverTypeWrapper<Omit<CreateTransactionFromTextFailure, 'agentTrace'> & { agentTrace: Array<ResolversTypes['AgentTraceMessage']> }>;
  CreateTransactionFromTextInput: CreateTransactionFromTextInput;
  CreateTransactionFromTextOutput: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['CreateTransactionFromTextOutput']>;
  CreateTransactionFromTextSuccess: ResolverTypeWrapper<Omit<CreateTransactionFromTextSuccess, 'agentTrace' | 'transaction'> & { agentTrace: Array<ResolversTypes['AgentTraceMessage']>, transaction: ResolversTypes['Transaction'] }>;
  CreateTransactionInput: CreateTransactionInput;
  CreateTransferInput: CreateTransferInput;
  DateRangeInput: DateRangeInput;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  InsightFailure: ResolverTypeWrapper<Omit<InsightFailure, 'agentTrace'> & { agentTrace: Array<ResolversTypes['AgentTraceMessage']> }>;
  InsightInput: InsightInput;
  InsightOutput: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['InsightOutput']>;
  InsightSuccess: ResolverTypeWrapper<Omit<InsightSuccess, 'agentTrace'> & { agentTrace: Array<ResolversTypes['AgentTraceMessage']> }>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PaginationInput: PaginationInput;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  ReportType: ReportType;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Transaction: ResolverTypeWrapper<Omit<Transaction, 'account' | 'category'>>;
  TransactionConnection: ResolverTypeWrapper<Omit<TransactionConnection, 'edges'> & { edges: Array<ResolversTypes['TransactionEdge']> }>;
  TransactionEdge: ResolverTypeWrapper<Omit<TransactionEdge, 'node'> & { node: ResolversTypes['Transaction'] }>;
  TransactionEmbeddedAccount: ResolverTypeWrapper<TransactionEmbeddedAccount>;
  TransactionEmbeddedCategory: ResolverTypeWrapper<TransactionEmbeddedCategory>;
  TransactionFilterInput: TransactionFilterInput;
  TransactionPattern: ResolverTypeWrapper<TransactionPattern>;
  TransactionPatternType: TransactionPatternType;
  TransactionType: TransactionType;
  Transfer: ResolverTypeWrapper<Omit<Transfer, 'inboundTransaction' | 'outboundTransaction'> & { inboundTransaction: ResolversTypes['Transaction'], outboundTransaction: ResolversTypes['Transaction'] }>;
  UpdateAccountInput: UpdateAccountInput;
  UpdateCategoryInput: UpdateCategoryInput;
  UpdateTransactionInput: UpdateTransactionInput;
  UpdateTransferInput: UpdateTransferInput;
  UpdateUserSettingsInput: UpdateUserSettingsInput;
  User: ResolverTypeWrapper<User>;
  UserSettings: ResolverTypeWrapper<UserSettings>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Account: Omit<Account, 'balance'>;
  AgentTraceMessage: ResolversUnionTypes<ResolversParentTypes>['AgentTraceMessage'];
  AgentTraceText: AgentTraceText;
  AgentTraceToolCall: AgentTraceToolCall;
  AgentTraceToolResult: AgentTraceToolResult;
  Boolean: Scalars['Boolean']['output'];
  ByCategoryReport: Omit<ByCategoryReport, 'categories'> & { categories: Array<ResolversParentTypes['ByCategoryReportCategory']> };
  ByCategoryReportCategory: Omit<ByCategoryReportCategory, 'topTransactions'> & { topTransactions: Array<ResolversParentTypes['Transaction']> };
  ByCategoryReportCurrencyBreakdown: ByCategoryReportCurrencyBreakdown;
  ByCategoryReportCurrencyTotal: ByCategoryReportCurrencyTotal;
  Category: Category;
  CreateAccountInput: CreateAccountInput;
  CreateCategoryInput: CreateCategoryInput;
  CreateTransactionFromTextFailure: Omit<CreateTransactionFromTextFailure, 'agentTrace'> & { agentTrace: Array<ResolversParentTypes['AgentTraceMessage']> };
  CreateTransactionFromTextInput: CreateTransactionFromTextInput;
  CreateTransactionFromTextOutput: ResolversUnionTypes<ResolversParentTypes>['CreateTransactionFromTextOutput'];
  CreateTransactionFromTextSuccess: Omit<CreateTransactionFromTextSuccess, 'agentTrace' | 'transaction'> & { agentTrace: Array<ResolversParentTypes['AgentTraceMessage']>, transaction: ResolversParentTypes['Transaction'] };
  CreateTransactionInput: CreateTransactionInput;
  CreateTransferInput: CreateTransferInput;
  DateRangeInput: DateRangeInput;
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  InsightFailure: Omit<InsightFailure, 'agentTrace'> & { agentTrace: Array<ResolversParentTypes['AgentTraceMessage']> };
  InsightInput: InsightInput;
  InsightOutput: ResolversUnionTypes<ResolversParentTypes>['InsightOutput'];
  InsightSuccess: Omit<InsightSuccess, 'agentTrace'> & { agentTrace: Array<ResolversParentTypes['AgentTraceMessage']> };
  Int: Scalars['Int']['output'];
  Mutation: Record<PropertyKey, never>;
  PageInfo: PageInfo;
  PaginationInput: PaginationInput;
  Query: Record<PropertyKey, never>;
  String: Scalars['String']['output'];
  Transaction: Omit<Transaction, 'account' | 'category'>;
  TransactionConnection: Omit<TransactionConnection, 'edges'> & { edges: Array<ResolversParentTypes['TransactionEdge']> };
  TransactionEdge: Omit<TransactionEdge, 'node'> & { node: ResolversParentTypes['Transaction'] };
  TransactionEmbeddedAccount: TransactionEmbeddedAccount;
  TransactionEmbeddedCategory: TransactionEmbeddedCategory;
  TransactionFilterInput: TransactionFilterInput;
  TransactionPattern: TransactionPattern;
  Transfer: Omit<Transfer, 'inboundTransaction' | 'outboundTransaction'> & { inboundTransaction: ResolversParentTypes['Transaction'], outboundTransaction: ResolversParentTypes['Transaction'] };
  UpdateAccountInput: UpdateAccountInput;
  UpdateCategoryInput: UpdateCategoryInput;
  UpdateTransactionInput: UpdateTransactionInput;
  UpdateTransferInput: UpdateTransferInput;
  UpdateUserSettingsInput: UpdateUserSettingsInput;
  User: User;
  UserSettings: UserSettings;
};

export type AccountResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Account'] = ResolversParentTypes['Account']> = {
  balance?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  initialBalance?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type AgentTraceMessageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AgentTraceMessage'] = ResolversParentTypes['AgentTraceMessage']> = {
  __resolveType: TypeResolveFn<'AgentTraceText' | 'AgentTraceToolCall' | 'AgentTraceToolResult', ParentType, ContextType>;
};

export type AgentTraceTextResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AgentTraceText'] = ResolversParentTypes['AgentTraceText']> = {
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AgentTraceToolCallResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AgentTraceToolCall'] = ResolversParentTypes['AgentTraceToolCall']> = {
  input?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  toolName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AgentTraceToolResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AgentTraceToolResult'] = ResolversParentTypes['AgentTraceToolResult']> = {
  output?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  toolName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ByCategoryReportResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ByCategoryReport'] = ResolversParentTypes['ByCategoryReport']> = {
  categories?: Resolver<Array<ResolversTypes['ByCategoryReportCategory']>, ParentType, ContextType>;
  currencyTotals?: Resolver<Array<ResolversTypes['ByCategoryReportCurrencyTotal']>, ParentType, ContextType>;
  month?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ReportType'], ParentType, ContextType>;
  year?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type ByCategoryReportCategoryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ByCategoryReportCategory'] = ResolversParentTypes['ByCategoryReportCategory']> = {
  categoryId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  categoryName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  currencyBreakdowns?: Resolver<Array<ResolversTypes['ByCategoryReportCurrencyBreakdown']>, ParentType, ContextType>;
  topTransactions?: Resolver<Array<ResolversTypes['Transaction']>, ParentType, ContextType>;
  totalTransactionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type ByCategoryReportCurrencyBreakdownResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ByCategoryReportCurrencyBreakdown'] = ResolversParentTypes['ByCategoryReportCurrencyBreakdown']> = {
  currency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  percentage?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type ByCategoryReportCurrencyTotalResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ByCategoryReportCurrencyTotal'] = ResolversParentTypes['ByCategoryReportCurrencyTotal']> = {
  currency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  totalAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type CategoryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Category'] = ResolversParentTypes['Category']> = {
  excludeFromReports?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['CategoryType'], ParentType, ContextType>;
};

export type CategoryTypeResolvers = EnumResolverSignature<{ EXPENSE?: any, INCOME?: any }, ResolversTypes['CategoryType']>;

export type CreateTransactionFromTextFailureResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CreateTransactionFromTextFailure'] = ResolversParentTypes['CreateTransactionFromTextFailure']> = {
  agentTrace?: Resolver<Array<ResolversTypes['AgentTraceMessage']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateTransactionFromTextOutputResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CreateTransactionFromTextOutput'] = ResolversParentTypes['CreateTransactionFromTextOutput']> = {
  __resolveType: TypeResolveFn<'CreateTransactionFromTextFailure' | 'CreateTransactionFromTextSuccess', ParentType, ContextType>;
};

export type CreateTransactionFromTextSuccessResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CreateTransactionFromTextSuccess'] = ResolversParentTypes['CreateTransactionFromTextSuccess']> = {
  agentTrace?: Resolver<Array<ResolversTypes['AgentTraceMessage']>, ParentType, ContextType>;
  transaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InsightFailureResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['InsightFailure'] = ResolversParentTypes['InsightFailure']> = {
  agentTrace?: Resolver<Array<ResolversTypes['AgentTraceMessage']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InsightOutputResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['InsightOutput'] = ResolversParentTypes['InsightOutput']> = {
  __resolveType: TypeResolveFn<'InsightFailure' | 'InsightSuccess', ParentType, ContextType>;
};

export type InsightSuccessResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['InsightSuccess'] = ResolversParentTypes['InsightSuccess']> = {
  agentTrace?: Resolver<Array<ResolversTypes['AgentTraceMessage']>, ParentType, ContextType>;
  answer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createAccount?: Resolver<ResolversTypes['Account'], ParentType, ContextType, RequireFields<MutationCreateAccountArgs, 'input'>>;
  createCategory?: Resolver<ResolversTypes['Category'], ParentType, ContextType, RequireFields<MutationCreateCategoryArgs, 'input'>>;
  createTransaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType, RequireFields<MutationCreateTransactionArgs, 'input'>>;
  createTransactionFromText?: Resolver<ResolversTypes['CreateTransactionFromTextOutput'], ParentType, ContextType, RequireFields<MutationCreateTransactionFromTextArgs, 'input'>>;
  createTransfer?: Resolver<ResolversTypes['Transfer'], ParentType, ContextType, RequireFields<MutationCreateTransferArgs, 'input'>>;
  deleteAccount?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationDeleteAccountArgs, 'id'>>;
  deleteCategory?: Resolver<ResolversTypes['Category'], ParentType, ContextType, RequireFields<MutationDeleteCategoryArgs, 'id'>>;
  deleteTransaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType, RequireFields<MutationDeleteTransactionArgs, 'id'>>;
  deleteTransfer?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationDeleteTransferArgs, 'id'>>;
  ensureUser?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  updateAccount?: Resolver<ResolversTypes['Account'], ParentType, ContextType, RequireFields<MutationUpdateAccountArgs, 'input'>>;
  updateCategory?: Resolver<ResolversTypes['Category'], ParentType, ContextType, RequireFields<MutationUpdateCategoryArgs, 'input'>>;
  updateTransaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType, RequireFields<MutationUpdateTransactionArgs, 'input'>>;
  updateTransfer?: Resolver<ResolversTypes['Transfer'], ParentType, ContextType, RequireFields<MutationUpdateTransferArgs, 'input'>>;
  updateUserSettings?: Resolver<ResolversTypes['UserSettings'], ParentType, ContextType, RequireFields<MutationUpdateUserSettingsArgs, 'input'>>;
};

export type PageInfoResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = {
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  accounts?: Resolver<Array<ResolversTypes['Account']>, ParentType, ContextType>;
  byCategoryReport?: Resolver<ResolversTypes['ByCategoryReport'], ParentType, ContextType, RequireFields<QueryByCategoryReportArgs, 'type' | 'year'>>;
  categories?: Resolver<Array<ResolversTypes['Category']>, ParentType, ContextType, Partial<QueryCategoriesArgs>>;
  insight?: Resolver<ResolversTypes['InsightOutput'], ParentType, ContextType, RequireFields<QueryInsightArgs, 'input'>>;
  supportedCurrencies?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  transactionDescriptionSuggestions?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType, RequireFields<QueryTransactionDescriptionSuggestionsArgs, 'searchText'>>;
  transactionPatterns?: Resolver<Array<ResolversTypes['TransactionPattern']>, ParentType, ContextType, RequireFields<QueryTransactionPatternsArgs, 'type'>>;
  transactions?: Resolver<ResolversTypes['TransactionConnection'], ParentType, ContextType, Partial<QueryTransactionsArgs>>;
  transfer?: Resolver<Maybe<ResolversTypes['Transfer']>, ParentType, ContextType, RequireFields<QueryTransferArgs, 'id'>>;
  userSettings?: Resolver<ResolversTypes['UserSettings'], ParentType, ContextType>;
};

export type ReportTypeResolvers = EnumResolverSignature<{ EXPENSE?: any, INCOME?: any }, ResolversTypes['ReportType']>;

export type TransactionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Transaction'] = ResolversParentTypes['Transaction']> = {
  account?: Resolver<ResolversTypes['TransactionEmbeddedAccount'], ParentType, ContextType>;
  amount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  category?: Resolver<Maybe<ResolversTypes['TransactionEmbeddedCategory']>, ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  date?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  transferId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['TransactionType'], ParentType, ContextType>;
};

export type TransactionConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TransactionConnection'] = ResolversParentTypes['TransactionConnection']> = {
  edges?: Resolver<Array<ResolversTypes['TransactionEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type TransactionEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TransactionEdge'] = ResolversParentTypes['TransactionEdge']> = {
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType>;
};

export type TransactionEmbeddedAccountResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TransactionEmbeddedAccount'] = ResolversParentTypes['TransactionEmbeddedAccount']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isArchived?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type TransactionEmbeddedCategoryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TransactionEmbeddedCategory'] = ResolversParentTypes['TransactionEmbeddedCategory']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isArchived?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type TransactionPatternResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TransactionPattern'] = ResolversParentTypes['TransactionPattern']> = {
  accountId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  accountName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  categoryId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  categoryName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type TransactionPatternTypeResolvers = EnumResolverSignature<{ EXPENSE?: any, INCOME?: any, REFUND?: any }, ResolversTypes['TransactionPatternType']>;

export type TransactionTypeResolvers = EnumResolverSignature<{ EXPENSE?: any, INCOME?: any, REFUND?: any, TRANSFER_IN?: any, TRANSFER_OUT?: any }, ResolversTypes['TransactionType']>;

export type TransferResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Transfer'] = ResolversParentTypes['Transfer']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  inboundTransaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType>;
  outboundTransaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType>;
};

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type UserSettingsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UserSettings'] = ResolversParentTypes['UserSettings']> = {
  transactionPatternsLimit?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  voiceInputLanguage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  Account?: AccountResolvers<ContextType>;
  AgentTraceMessage?: AgentTraceMessageResolvers<ContextType>;
  AgentTraceText?: AgentTraceTextResolvers<ContextType>;
  AgentTraceToolCall?: AgentTraceToolCallResolvers<ContextType>;
  AgentTraceToolResult?: AgentTraceToolResultResolvers<ContextType>;
  ByCategoryReport?: ByCategoryReportResolvers<ContextType>;
  ByCategoryReportCategory?: ByCategoryReportCategoryResolvers<ContextType>;
  ByCategoryReportCurrencyBreakdown?: ByCategoryReportCurrencyBreakdownResolvers<ContextType>;
  ByCategoryReportCurrencyTotal?: ByCategoryReportCurrencyTotalResolvers<ContextType>;
  Category?: CategoryResolvers<ContextType>;
  CategoryType?: CategoryTypeResolvers;
  CreateTransactionFromTextFailure?: CreateTransactionFromTextFailureResolvers<ContextType>;
  CreateTransactionFromTextOutput?: CreateTransactionFromTextOutputResolvers<ContextType>;
  CreateTransactionFromTextSuccess?: CreateTransactionFromTextSuccessResolvers<ContextType>;
  InsightFailure?: InsightFailureResolvers<ContextType>;
  InsightOutput?: InsightOutputResolvers<ContextType>;
  InsightSuccess?: InsightSuccessResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  ReportType?: ReportTypeResolvers;
  Transaction?: TransactionResolvers<ContextType>;
  TransactionConnection?: TransactionConnectionResolvers<ContextType>;
  TransactionEdge?: TransactionEdgeResolvers<ContextType>;
  TransactionEmbeddedAccount?: TransactionEmbeddedAccountResolvers<ContextType>;
  TransactionEmbeddedCategory?: TransactionEmbeddedCategoryResolvers<ContextType>;
  TransactionPattern?: TransactionPatternResolvers<ContextType>;
  TransactionPatternType?: TransactionPatternTypeResolvers;
  TransactionType?: TransactionTypeResolvers;
  Transfer?: TransferResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserSettings?: UserSettingsResolvers<ContextType>;
};

