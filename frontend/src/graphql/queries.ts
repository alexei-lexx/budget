import { gql } from "@apollo/client/core";
import {
  ACCOUNT_FRAGMENT,
  CATEGORY_FRAGMENT,
  TRANSACTION_FRAGMENT,
  TRANSFER_FRAGMENT,
  MONTHLY_REPORT_FRAGMENT,
} from "./fragments";

export const GET_ACCOUNTS = gql`
  query GetAccounts($includeArchived: Boolean = false) {
    accounts(includeArchived: $includeArchived) {
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
  query GetCategories($type: CategoryType, $includeArchived: Boolean = false) {
    categories(type: $type, includeArchived: $includeArchived) {
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
    getTransactionPatterns(type: $type) {
      accountId
      accountName
      categoryId
      categoryName
    }
  }
`;

export const GET_MONTHLY_REPORT = gql`
  query GetMonthlyReport($year: Int!, $month: Int!, $type: TransactionType!) {
    monthlyReport(year: $year, month: $month, type: $type) {
      ...MonthlyReportFields
    }
  }
  ${MONTHLY_REPORT_FRAGMENT}
`;

export const GET_TRANSACTION_DESCRIPTION_SUGGESTIONS = gql`
  query GetTransactionDescriptionSuggestions($searchText: String!) {
    transactionDescriptionSuggestions(searchText: $searchText)
  }
`;
