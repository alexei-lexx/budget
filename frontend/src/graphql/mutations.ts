import { gql } from "@apollo/client/core";

export const ENSURE_USER = gql`
  mutation EnsureUser {
    ensureUser {
      email
    }
  }
`;
