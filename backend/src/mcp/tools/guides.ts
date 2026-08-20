import { createHash } from "node:crypto";
import { z } from "zod";
import { CategoryType } from "../../models/category";
import { TransactionType } from "../../models/transaction";
import { Failure, Result, Success } from "../../types/result";

const HOUR_MS = 60 * 60 * 1000;

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

const CREATE_TRANSACTION_SUMMARY =
  "Rules for inferring fields needed to create a transaction: type, amount, account, etc";

const CREATE_TRANSACTION_INSTRUCTION = `
IMPORTANT: you MUST follow this guide's rules whenever they apply.

Use these rules whenever the user wants to log a transaction — a purchase, a paycheck, a refund, or anything else that moves money.

## Type

- Mandatory field
- Supported values:
  - income — money received (e.g., salary, earned, received)
  - expense — money spent (e.g., bought, paid, spent)
  - refund — money returned for a previous expense (e.g., refund, returned)
- Default to expense when intent is unclear

## Amount

- Mandatory field
- Numeric or written value representing a money quantity (e.g., 25, 20.5, "twenty five euros")
- If multiple amounts are present, MUST stop and report an error — only one transaction at a time

## Account

- Mandatory field
- Account MUST be active
- Select by priority:
  1. Currency match — account MUST match the mentioned currency
  2. Name match — prefer the account named or implied in user input
  3. Category history — prefer the account most used with the inferred category
  4. Overall history — prefer the account most used overall
- MUST look up past transactions for history-based criteria — do not guess

## Category

- Optional field
- Category MUST be active
- Infer by priority:
  1. Name match — category name mentioned in user input
  2. Signal match — synonyms, store names, product names imply a category
  3. History — most used category for similar transactions
- May look up past transactions for history-based criteria — do not guess

## Date

- Mandatory field
- Default to today's date unless an explicit date is provided

## Description

- Optional field
- Keep the original language of the user's text
- MUST be grammatically correct, without typos
- MUST describe the item or service — not the reason or context
- MUST provide meaningful details that supplement the transaction
- MUST NOT build description from the category name, its variations, or its translations
- Default to blank if no meaningful description can be formed

### Description from a photo of a receipt or check

When recording from a photo of a receipt or check:
- Base the description on what's actually legible
- Might include important details: store name and items, quantity and unit of measure for each item
- If an item name is legible, but unclear (e.g. coded or abbreviated), search to identify it
- Double-check item-quantity pairing when item and quantity are on separate lines
- MUST NOT make up a store name, item, quantity, or unit of measure
`.trim();

export class Guide {
  readonly name: GuideName;
  readonly summary: string;
  readonly instruction: string;

  constructor({
    name,
    summary,
    instruction,
  }: {
    name: GuideName;
    summary: string;
    instruction: string;
  }) {
    this.name = name;
    this.summary = summary;
    this.instruction = instruction;
  }

  get token(): string {
    return buildGuideToken(this.name, this.instruction, Date.now());
  }
}

export const GUIDES: Record<"basics" | "create-transaction", Guide> = {
  basics: new Guide({
    name: "basics",
    summary: BASICS_SUMMARY,
    instruction: BASICS_INSTRUCTION,
  }),
  "create-transaction": new Guide({
    name: "create-transaction",
    summary: CREATE_TRANSACTION_SUMMARY,
    instruction: CREATE_TRANSACTION_INSTRUCTION,
  }),
};

export const GUIDE_NAMES = Object.keys(GUIDES) as GuideName[];
export type GuideName = keyof typeof GUIDES;

export function verifyGuideTokens({
  guideTokens,
  requiredGuides,
}: {
  guideTokens: readonly string[];
  requiredGuides: readonly GuideName[];
}): Result<true> {
  const missingGuides = requiredGuides.filter((name) => {
    const guide = GUIDES[name];
    const currentToken = buildGuideToken(name, guide.instruction, Date.now());

    if (guideTokens.includes(currentToken)) {
      return false;
    }

    const previousToken = buildGuideToken(
      name,
      guide.instruction,
      Date.now() - HOUR_MS,
    );

    return !guideTokens.includes(previousToken);
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

function buildGuideToken(
  name: GuideName,
  instruction: string,
  timestamp: number,
): string {
  const bucket = Math.floor(timestamp / HOUR_MS);
  const hash = createHash("sha256")
    .update(`${instruction}${bucket}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();

  return `${name}.${hash}`;
}
