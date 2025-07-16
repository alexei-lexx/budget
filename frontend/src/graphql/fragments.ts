import { gql } from "@apollo/client/core";

export const ACCOUNT_FRAGMENT = gql`
  fragment AccountFields on Account {
    id
    name
    currency
    initialBalance
    balance
  }
`;

export const CATEGORY_FRAGMENT = gql`
  fragment CategoryFields on Category {
    id
    name
    type
  }
`;

export const TRANSACTION_FRAGMENT = gql`
  fragment TransactionFields on Transaction {
    id
    accountId
    categoryId
    type
    amount
    currency
    date
    description
    transferId
  }
`;

export const TRANSFER_FRAGMENT = gql`
  fragment TransferFields on Transfer {
    id
    outboundTransaction {
      ...TransactionFields
    }
    inboundTransaction {
      ...TransactionFields
    }
  }
  ${TRANSACTION_FRAGMENT}
`;
