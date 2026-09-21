import type { TransactionType } from "@/__generated__/vue-apollo";

export interface TransactionFilterSelection {
  accountIds: string[];
  categoryIds: string[];
  includeUncategorized: boolean;
  dateAfter: string | null;
  dateBefore: string | null;
  types: TransactionType[];
}

export function isEmptyTransactionFilterSelection(value: TransactionFilterSelection): boolean {
  return (
    value.accountIds.length === 0 &&
    value.categoryIds.length === 0 &&
    !value.includeUncategorized &&
    value.dateAfter === null &&
    value.dateBefore === null &&
    value.types.length === 0
  );
}
