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

export const MONTHLY_REPORT_CURRENCY_BREAKDOWN_FRAGMENT = gql`
  fragment MonthlyReportCurrencyBreakdownFields on MonthlyReportCurrencyBreakdown {
    currency
    totalAmount
    percentage
  }
`;

export const MONTHLY_REPORT_CATEGORY_FRAGMENT = gql`
  fragment MonthlyReportCategoryFields on MonthlyReportCategory {
    categoryId
    categoryName
    currencyBreakdowns {
      ...MonthlyReportCurrencyBreakdownFields
    }
  }
  ${MONTHLY_REPORT_CURRENCY_BREAKDOWN_FRAGMENT}
`;

export const MONTHLY_REPORT_CURRENCY_TOTAL_FRAGMENT = gql`
  fragment MonthlyReportCurrencyTotalFields on MonthlyReportCurrencyTotal {
    currency
    totalAmount
  }
`;

export const MONTHLY_REPORT_FRAGMENT = gql`
  fragment MonthlyReportFields on MonthlyReport {
    year
    month
    type
    categories {
      ...MonthlyReportCategoryFields
    }
    currencyTotals {
      ...MonthlyReportCurrencyTotalFields
    }
  }
  ${MONTHLY_REPORT_CATEGORY_FRAGMENT}
  ${MONTHLY_REPORT_CURRENCY_TOTAL_FRAGMENT}
`;
