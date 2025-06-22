import { gql } from "@apollo/client/core";

export const ACCOUNT_FRAGMENT = gql`
  fragment AccountFields on Account {
    id
    name
    currency
    initialBalance
  }
`;

export const CATEGORY_FRAGMENT = gql`
  fragment CategoryFields on Category {
    id
    name
    type
  }
`;
