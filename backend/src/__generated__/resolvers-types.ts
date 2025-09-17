import { CategoryType } from '../models/Category';
import { TransactionType } from '../models/Transaction';
import { GraphQLResolveInfo } from 'graphql';
import { GraphQLContext } from '../server';
export type Maybe<T> = T | undefined;
export type InputMaybe<T> = T | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
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

export type Category = {
  __typename?: 'Category';
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


export type QueryTransactionDescriptionSuggestionsArgs = {
  searchText: Scalars['String']['input'];
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

export type TransactionPattern = {
  __typename?: 'TransactionPattern';
  accountId: Scalars['ID']['output'];
  accountName: Scalars['String']['output'];
  categoryId: Scalars['ID']['output'];
  categoryName: Scalars['String']['output'];
};

export enum TransactionPatternType {
  Expense = 'EXPENSE',
  Income = 'INCOME'
}

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



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

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

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Account: ResolverTypeWrapper<Omit<Account, 'balance'>>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Category: ResolverTypeWrapper<Category>;
  CategoryType: CategoryType;
  CreateAccountInput: CreateAccountInput;
  CreateCategoryInput: CreateCategoryInput;
  CreateTransactionInput: CreateTransactionInput;
  CreateTransferInput: CreateTransferInput;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  MonthlyReport: ResolverTypeWrapper<MonthlyReport>;
  MonthlyReportCategory: ResolverTypeWrapper<MonthlyReportCategory>;
  MonthlyReportCurrencyBreakdown: ResolverTypeWrapper<MonthlyReportCurrencyBreakdown>;
  MonthlyReportCurrencyTotal: ResolverTypeWrapper<MonthlyReportCurrencyTotal>;
  Mutation: ResolverTypeWrapper<{}>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PaginationInput: PaginationInput;
  Query: ResolverTypeWrapper<{}>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Transaction: ResolverTypeWrapper<Transaction>;
  TransactionConnection: ResolverTypeWrapper<TransactionConnection>;
  TransactionEdge: ResolverTypeWrapper<TransactionEdge>;
  TransactionPattern: ResolverTypeWrapper<TransactionPattern>;
  TransactionPatternType: TransactionPatternType;
  TransactionType: TransactionType;
  Transfer: ResolverTypeWrapper<Transfer>;
  UpdateAccountInput: UpdateAccountInput;
  UpdateCategoryInput: UpdateCategoryInput;
  UpdateTransactionInput: UpdateTransactionInput;
  UpdateTransferInput: UpdateTransferInput;
  User: ResolverTypeWrapper<User>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Account: Omit<Account, 'balance'>;
  Boolean: Scalars['Boolean']['output'];
  Category: Category;
  CreateAccountInput: CreateAccountInput;
  CreateCategoryInput: CreateCategoryInput;
  CreateTransactionInput: CreateTransactionInput;
  CreateTransferInput: CreateTransferInput;
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  MonthlyReport: MonthlyReport;
  MonthlyReportCategory: MonthlyReportCategory;
  MonthlyReportCurrencyBreakdown: MonthlyReportCurrencyBreakdown;
  MonthlyReportCurrencyTotal: MonthlyReportCurrencyTotal;
  Mutation: {};
  PageInfo: PageInfo;
  PaginationInput: PaginationInput;
  Query: {};
  String: Scalars['String']['output'];
  Transaction: Transaction;
  TransactionConnection: TransactionConnection;
  TransactionEdge: TransactionEdge;
  TransactionPattern: TransactionPattern;
  Transfer: Transfer;
  UpdateAccountInput: UpdateAccountInput;
  UpdateCategoryInput: UpdateCategoryInput;
  UpdateTransactionInput: UpdateTransactionInput;
  UpdateTransferInput: UpdateTransferInput;
  User: User;
};

export type AccountResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Account'] = ResolversParentTypes['Account']> = {
  balance?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  initialBalance?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CategoryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Category'] = ResolversParentTypes['Category']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['CategoryType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CategoryTypeResolvers = EnumResolverSignature<{ EXPENSE?: any, INCOME?: any }, ResolversTypes['CategoryType']>;

export type MonthlyReportResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MonthlyReport'] = ResolversParentTypes['MonthlyReport']> = {
  categories?: Resolver<Array<ResolversTypes['MonthlyReportCategory']>, ParentType, ContextType>;
  currencyTotals?: Resolver<Array<ResolversTypes['MonthlyReportCurrencyTotal']>, ParentType, ContextType>;
  month?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['TransactionType'], ParentType, ContextType>;
  year?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MonthlyReportCategoryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MonthlyReportCategory'] = ResolversParentTypes['MonthlyReportCategory']> = {
  categoryId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  categoryName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  currencyBreakdowns?: Resolver<Array<ResolversTypes['MonthlyReportCurrencyBreakdown']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MonthlyReportCurrencyBreakdownResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MonthlyReportCurrencyBreakdown'] = ResolversParentTypes['MonthlyReportCurrencyBreakdown']> = {
  currency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  percentage?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MonthlyReportCurrencyTotalResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MonthlyReportCurrencyTotal'] = ResolversParentTypes['MonthlyReportCurrencyTotal']> = {
  currency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  totalAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createAccount?: Resolver<ResolversTypes['Account'], ParentType, ContextType, RequireFields<MutationCreateAccountArgs, 'input'>>;
  createCategory?: Resolver<ResolversTypes['Category'], ParentType, ContextType, RequireFields<MutationCreateCategoryArgs, 'input'>>;
  createTransaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType, RequireFields<MutationCreateTransactionArgs, 'input'>>;
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
};

export type PageInfoResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = {
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  accounts?: Resolver<Array<ResolversTypes['Account']>, ParentType, ContextType>;
  categories?: Resolver<Array<ResolversTypes['Category']>, ParentType, ContextType, Partial<QueryCategoriesArgs>>;
  getTransactionPatterns?: Resolver<Array<ResolversTypes['TransactionPattern']>, ParentType, ContextType, RequireFields<QueryGetTransactionPatternsArgs, 'type'>>;
  monthlyReport?: Resolver<ResolversTypes['MonthlyReport'], ParentType, ContextType, RequireFields<QueryMonthlyReportArgs, 'month' | 'type' | 'year'>>;
  supportedCurrencies?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  transactionDescriptionSuggestions?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType, RequireFields<QueryTransactionDescriptionSuggestionsArgs, 'searchText'>>;
  transactions?: Resolver<ResolversTypes['TransactionConnection'], ParentType, ContextType, Partial<QueryTransactionsArgs>>;
  transfer?: Resolver<Maybe<ResolversTypes['Transfer']>, ParentType, ContextType, RequireFields<QueryTransferArgs, 'id'>>;
};

export type TransactionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Transaction'] = ResolversParentTypes['Transaction']> = {
  accountId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  amount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  categoryId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  date?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  transferId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['TransactionType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TransactionConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TransactionConnection'] = ResolversParentTypes['TransactionConnection']> = {
  edges?: Resolver<Array<ResolversTypes['TransactionEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TransactionEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TransactionEdge'] = ResolversParentTypes['TransactionEdge']> = {
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TransactionPatternResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TransactionPattern'] = ResolversParentTypes['TransactionPattern']> = {
  accountId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  accountName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  categoryId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  categoryName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TransactionTypeResolvers = EnumResolverSignature<{ EXPENSE?: any, INCOME?: any, TRANSFER_IN?: any, TRANSFER_OUT?: any }, ResolversTypes['TransactionType']>;

export type TransferResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Transfer'] = ResolversParentTypes['Transfer']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  inboundTransaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType>;
  outboundTransaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  Account?: AccountResolvers<ContextType>;
  Category?: CategoryResolvers<ContextType>;
  CategoryType?: CategoryTypeResolvers;
  MonthlyReport?: MonthlyReportResolvers<ContextType>;
  MonthlyReportCategory?: MonthlyReportCategoryResolvers<ContextType>;
  MonthlyReportCurrencyBreakdown?: MonthlyReportCurrencyBreakdownResolvers<ContextType>;
  MonthlyReportCurrencyTotal?: MonthlyReportCurrencyTotalResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Transaction?: TransactionResolvers<ContextType>;
  TransactionConnection?: TransactionConnectionResolvers<ContextType>;
  TransactionEdge?: TransactionEdgeResolvers<ContextType>;
  TransactionPattern?: TransactionPatternResolvers<ContextType>;
  TransactionType?: TransactionTypeResolvers;
  Transfer?: TransferResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
};

