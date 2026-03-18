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
    excludeFromReports
  }
`;

export const TRANSACTION_FRAGMENT = gql`
  fragment TransactionFields on Transaction {
    id
    account {
      id
      name
      isArchived
    }
    category {
      id
      name
      isArchived
    }
    type
    amount
    currency
    date
    description
    transferId
  }
`;

export const AGENT_TRACE_FRAGMENT = gql`
  fragment AgentTraceFields on AgentTraceMessage {
    ... on AgentTraceText {
      content
    }
    ... on AgentTraceToolCall {
      toolName
      input
    }
    ... on AgentTraceToolResult {
      toolName
      output
    }
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
