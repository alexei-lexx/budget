import { gql } from "@apollo/client/core";
import { ACCOUNT_FRAGMENT, CATEGORY_FRAGMENT, TRANSACTION_FRAGMENT } from "./fragments";

export const ENSURE_USER = gql`
  mutation EnsureUser {
    ensureUser {
      email
    }
  }
`;

export const CREATE_ACCOUNT = gql`
  mutation CreateAccount($input: CreateAccountInput!) {
    createAccount(input: $input) {
      ...AccountFields
    }
  }
  ${ACCOUNT_FRAGMENT}
`;

export const UPDATE_ACCOUNT = gql`
  mutation UpdateAccount($input: UpdateAccountInput!) {
    updateAccount(input: $input) {
      ...AccountFields
    }
  }
  ${ACCOUNT_FRAGMENT}
`;

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount($id: ID!) {
    deleteAccount(id: $id)
  }
`;

export const CREATE_CATEGORY = gql`
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      ...CategoryFields
    }
  }
  ${CATEGORY_FRAGMENT}
`;

export const UPDATE_CATEGORY = gql`
  mutation UpdateCategory($input: UpdateCategoryInput!) {
    updateCategory(input: $input) {
      ...CategoryFields
    }
  }
  ${CATEGORY_FRAGMENT}
`;

export const DELETE_CATEGORY = gql`
  mutation DeleteCategory($id: ID!) {
    deleteCategory(id: $id) {
      ...CategoryFields
    }
  }
  ${CATEGORY_FRAGMENT}
`;

export const CREATE_TRANSACTION = gql`
  mutation CreateTransaction($input: CreateTransactionInput!) {
    createTransaction(input: $input) {
      ...TransactionFields
    }
  }
  ${TRANSACTION_FRAGMENT}
`;

export const UPDATE_TRANSACTION = gql`
  mutation UpdateTransaction($input: UpdateTransactionInput!) {
    updateTransaction(input: $input) {
      ...TransactionFields
    }
  }
  ${TRANSACTION_FRAGMENT}
`;

export const DELETE_TRANSACTION = gql`
  mutation DeleteTransaction($id: ID!) {
    deleteTransaction(id: $id) {
      ...TransactionFields
    }
  }
  ${TRANSACTION_FRAGMENT}
`;
