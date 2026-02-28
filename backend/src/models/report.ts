export const ReportType = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
} as const;

export type ReportType = (typeof ReportType)[keyof typeof ReportType];
