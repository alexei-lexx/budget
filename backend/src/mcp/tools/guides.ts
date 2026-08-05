import { createHash } from "node:crypto";
import { z } from "zod";
import { CategoryType } from "../../models/category";
import { TransactionType } from "../../models/transaction";
import { Failure, Result, Success } from "../../types/result";

const BASICS_SUMMARY =
  "Domain model for accounts, categories, and transactions, plus rules for computing reports and totals correctly";

const BASICS_INSTRUCTION = `
IMPORTANT: you MUST follow this guide's rules whenever they apply.

The user has financial data consisting of accounts, categories, and transactions.

## Accounts

Account is a place where money is stored.

- The user can have multiple accounts
- Each account has a name and a currency

## Categories

Category is a classification system for transactions.

- The user can have multiple categories
- Each category has a name and a type (${Object.keys(CategoryType).join(", ")})
- A category can be marked as report-excluded
- Report-excluded categories are ignored when calculating income and spending totals

## Transactions

Transaction is a record of a money movement.

- The user can spend, receive, refund, or transfer money
- Each transaction MUST have a type (${Object.keys(TransactionType).join(", ")})
- Each transaction MUST belong to exactly one account
- Each transaction MUST have an amount, a currency, and a date
- A transaction can optionally belong to a category and have a description

Transaction types:
- ${TransactionType.INCOME} increases account balance and counts toward the income total
- ${TransactionType.EXPENSE} reduces account balance and counts toward the spending total
- ${TransactionType.REFUND} increases account balance and reduces the spending total
- ${TransactionType.REFUND} typically offsets an ${TransactionType.EXPENSE} in the same category
- See the Transfers section for ${TransactionType.TRANSFER_IN} and ${TransactionType.TRANSFER_OUT}

## Transfers

Transfer is a money movement between two accounts.

- Consists of two transactions
- ${TransactionType.TRANSFER_OUT} reduces the balance of the source account
- ${TransactionType.TRANSFER_IN} increases the balance of the destination account

## Reports, Totals, Summaries

- Spending total = sum of ${TransactionType.EXPENSE} amounts minus sum of ${TransactionType.REFUND} amounts
- Mention when refunds were deducted
- Leave out transactions that are linked to report-excluded categories when calculating totals
- Mention when transactions were omitted for this reason
- Historical totals must include transactions linked to archived accounts and categories
- If a calculation is needed, you MUST perform it programmatically, not by hand
`.trim();

export const GUIDES: Record<"basics", Guide> = {
  basics: {
    name: "basics",
    summary: BASICS_SUMMARY,
    instruction: BASICS_INSTRUCTION,
    token: buildGuideToken("basics", BASICS_INSTRUCTION),
  },
};

export const GUIDE_NAMES = Object.keys(GUIDES) as GuideName[];
export type GuideName = keyof typeof GUIDES;

export interface Guide {
  name: GuideName;
  summary: string;
  instruction: string;
  token: string;
}

export function verifyGuideTokens({
  guideTokens,
  requiredGuides,
}: {
  guideTokens: readonly string[];
  requiredGuides: readonly GuideName[];
}): Result<true> {
  const missingGuides = requiredGuides.filter((name) => {
    const guide = GUIDES[name];
    return !guideTokens.includes(guide.token);
  });

  if (missingGuides.length === 0) {
    return Success(true);
  }

  return Failure(
    `Missing or invalid guide token for: ${missingGuides.join(", ")}. Reload the guide(s) and retry`,
  );
}

export function buildGuideTokensField(requiredGuides: readonly GuideName[]) {
  const deduplicatedGuides = Array.from(new Set(requiredGuides));

  return z
    .array(z.string().min(1))
    .min(1)
    .describe(
      `Guide tokens for the following guides: ${deduplicatedGuides.join(", ")}. IMPORTANT: you MUST follow loaded guides' rules when calling this tool.`,
    );
}

function buildGuideToken(name: GuideName, instruction: string): string {
  const hash = createHash("sha256")
    .update(instruction)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();

  return `${name}.${hash}`;
}
