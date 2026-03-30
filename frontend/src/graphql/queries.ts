import { gql } from "@apollo/client/core";
import {
  ACCOUNT_FRAGMENT,
  AGENT_TRACE_FRAGMENT,
  CATEGORY_FRAGMENT,
  TRANSACTION_FRAGMENT,
  TRANSFER_FRAGMENT,
} from "./fragments";

export const GET_ACCOUNTS = gql`
  query GetAccounts {
    accounts {
      ...AccountFields
    }
  }
  ${ACCOUNT_FRAGMENT}
`;

export const GET_SUPPORTED_CURRENCIES = gql`
  query GetSupportedCurrencies {
    supportedCurrencies
  }
`;

export const GET_CATEGORIES = gql`
  query GetCategories($type: CategoryType) {
    categories(type: $type) {
      ...CategoryFields
    }
  }
  ${CATEGORY_FRAGMENT}
`;

export const GET_TRANSACTIONS_PAGINATED = gql`
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
  ${TRANSACTION_FRAGMENT}
`;

export const GET_TRANSFER = gql`
  query GetTransfer($id: ID!) {
    transfer(id: $id) {
      ...TransferFields
    }
  }
  ${TRANSFER_FRAGMENT}
`;

export const GET_TRANSACTION_PATTERNS = gql`
  query GetTransactionPatterns($type: TransactionPatternType!) {
    transactionPatterns(type: $type) {
      accountId
      accountName
      categoryId
      categoryName
    }
  }
`;

export const GET_BY_CATEGORY_REPORT = gql`
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
  ${TRANSACTION_FRAGMENT}
`;

export const GET_TRANSACTION_DESCRIPTION_SUGGESTIONS = gql`
  query GetTransactionDescriptionSuggestions($searchText: String!) {
    transactionDescriptionSuggestions(searchText: $searchText)
  }
`;

export const GET_INSIGHT = gql`
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
  ${AGENT_TRACE_FRAGMENT}
`;

export const GET_USER_SETTINGS = gql`
  query GetUserSettings {
    userSettings {
      transactionPatternsLimit
      voiceInputLanguage
    }
  }
`;

export const GET_TELEGRAM_BOT = gql`
  query GetTelegramBot {
    telegramBot {
      id
      maskedToken
    }
  }
`;
