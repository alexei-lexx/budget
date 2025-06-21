import { gql } from "@apollo/client/core";
import { ACCOUNT_FRAGMENT } from "./fragments";

export const GET_ACTIVE_ACCOUNTS = gql`
  query GetActiveAccounts {
    activeAccounts {
      ...AccountFields
    }
  }
  ${ACCOUNT_FRAGMENT}
`;
