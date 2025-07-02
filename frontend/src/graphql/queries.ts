import { gql } from "@apollo/client/core";
import { ACCOUNT_FRAGMENT, CATEGORY_FRAGMENT, TRANSACTION_FRAGMENT } from "./fragments";

export const GET_ACTIVE_ACCOUNTS = gql`
  query GetActiveAccounts {
    activeAccounts {
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

export const GET_ACTIVE_CATEGORIES = gql`
  query GetActiveCategories($type: CategoryType) {
    activeCategories(type: $type) {
      ...CategoryFields
    }
  }
  ${CATEGORY_FRAGMENT}
`;

export const GET_TRANSACTIONS = gql`
  query GetTransactions {
    transactions {
      ...TransactionFields
    }
  }
  ${TRANSACTION_FRAGMENT}
`;
