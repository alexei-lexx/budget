import { gql } from "@apollo/client/core";
import {
  ACCOUNT_FRAGMENT,
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
  query GetTransactionsPaginated($pagination: PaginationInput) {
    transactions(pagination: $pagination) {
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
