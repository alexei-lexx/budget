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

export const BY_CATEGORY_REPORT_CURRENCY_BREAKDOWN_FRAGMENT = gql`
  fragment ByCategoryReportCurrencyBreakdownFields on ByCategoryReportCurrencyBreakdown {
    currency
    totalAmount
    percentage
  }
`;

export const BY_CATEGORY_REPORT_CATEGORY_FRAGMENT = gql`
  fragment ByCategoryReportCategoryFields on ByCategoryReportCategory {
    categoryId
    categoryName
    currencyBreakdowns {
      ...ByCategoryReportCurrencyBreakdownFields
    }
    topTransactions {
      ...TransactionFields
    }
    totalTransactionCount
  }
  ${BY_CATEGORY_REPORT_CURRENCY_BREAKDOWN_FRAGMENT}
  ${TRANSACTION_FRAGMENT}
`;

export const BY_CATEGORY_REPORT_CURRENCY_TOTAL_FRAGMENT = gql`
  fragment ByCategoryReportCurrencyTotalFields on ByCategoryReportCurrencyTotal {
    currency
    totalAmount
  }
`;

export const BY_CATEGORY_REPORT_FRAGMENT = gql`
  fragment ByCategoryReportFields on ByCategoryReport {
    year
    month
    type
    categories {
      ...ByCategoryReportCategoryFields
    }
    currencyTotals {
      ...ByCategoryReportCurrencyTotalFields
    }
  }
  ${BY_CATEGORY_REPORT_CATEGORY_FRAGMENT}
  ${BY_CATEGORY_REPORT_CURRENCY_TOTAL_FRAGMENT}
`;
