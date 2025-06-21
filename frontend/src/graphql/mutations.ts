import { gql } from "@apollo/client/core";
import { ACCOUNT_FRAGMENT } from "./fragments";

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
  mutation UpdateAccount($id: ID!, $input: UpdateAccountInput!) {
    updateAccount(id: $id, input: $input) {
      ...AccountFields
    }
  }
  ${ACCOUNT_FRAGMENT}
`;

export const ARCHIVE_ACCOUNT = gql`
  mutation ArchiveAccount($id: ID!) {
    archiveAccount(id: $id) {
      ...AccountFields
    }
  }
  ${ACCOUNT_FRAGMENT}
`;
