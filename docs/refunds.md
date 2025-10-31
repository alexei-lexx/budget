# Refund Implementation Specification

## Overview

Refunds represent the return of money from a previous expense transaction. This document outlines the business concept and data model for supporting refunds in the Personal Finance Tracker.

## Terminology

Throughout this specification, the following terms have specific meanings:

- **Refund**: A transaction with type `REFUND` that is linked to an existing expense transaction
- **Original Transaction**: An expense transaction to which one or more refunds are linked

## Business Concept

### What is a Refund?

A refund is a transaction of type `REFUND` that is linked to exactly one expense transaction (the original transaction). Refunds model real-world scenarios where money is returned after a purchase, such as:
- Returning a defective product to a store
- Canceling a service subscription
- Getting money back for an overcharge

### Key Business Rules

**Linking and Transaction Types:**
- A refund is linked to exactly one expense transaction
- A refund cannot be linked to any transaction type other than expense
- Multiple refunds can be linked to the same original transaction
- The original transaction can be edited (amount, account, category, etc.) even after refunds have been created

**Flexibility and User Control:**
- The total amount of refunds linked to a single original transaction can exceed the original transaction amount. This intentional permissiveness gives users full control and flexibility. A UI warning indicator is recommended but optional.
- Refunds can be directed to any account, including accounts with different currencies than the original transaction. This intentional permissiveness gives users full control. A UI warning indicator is recommended but optional.

## Data Model

### Refund as Transaction

Refunds are implemented as first-class transactions with type `REFUND` that maintain a link to the original expense transaction. Unlike transfers (which create paired transactions), each refund is an independent transaction.

**Example:**

Original Expense:
- Type: EXPENSE
- Amount: $100
- Account: Account A
- Category: Technology (expense type)

First Refund (partial):
- Type: REFUND
- Amount: $70 (user selected partial refund amount)
- Account: Account A (defaults to original account)
- Linked to: Original expense transaction
- Category: Optional (must be income type if provided)

Second Refund (remaining amount):
- Type: REFUND
- Amount: $30 (remaining refundable amount: $100 - $70)
- Account: Account B (user-selected)
- Linked to: Same original expense transaction
- Category: Optional (must be income type if provided)

### Transaction Linking

- Each refund maintains an explicit reference to its original transaction
- The system can calculate total refunded amount by summing all non-deleted refunds linked to an original transaction
- Multiple refunds can be linked to the same original transaction
- A refund cannot be re-linked to a different original transaction

### Field Specifications

**Amount:**
- Refunds have a positive amount
- On creation, the default amount equals either:
  - The original transaction amount (if this is the first refund), OR
  - The remaining refundable amount (original amount minus sum of all existing non-deleted refunds)
- Users can override this default to any positive amount, including amounts that exceed the remaining refundable amount
- No validation enforces that refund amounts stay within the original transaction amount

**Account:**
- Refunds must be directed to an account (required field)
- On creation, the default account is the original transaction's account
- Users can change the refund's account to any other account, regardless of currency match
- Different currency accounts are permitted with a UI warning (recommended but optional)

**Category:**
- Refunds can optionally have a category assigned
- Categories must be manually selected by the user; categories are never inherited from the original transaction
- If a category is assigned, it must be of income type (not expense type)
- Refunds without an assigned category are valid

**Deletion/Archival:**
- Refunds follow the exact same deletion process as any other transaction: they are soft-deleted by marking the `isArchived` attribute to `true`
- Deleted (archived) refunds are not displayed to users and are excluded from all balance and calculation operations
- Deleted refunds remain linked to their original transaction for audit and historical purposes
- The original transaction is not affected by refund deletion—it remains editable and can have additional refunds created for it

## User Experience

### Creating Refunds

**UI Flow:**

1. User expands an expense transaction in the transaction list
2. User clicks the "Refund" button (only available for expense transactions)
3. A refund form appears, structured similarly to the regular transaction form

**Refund Form:**

The form displays the following sections:

- **Linked Transaction (Read-Only Display):** Shows the original expense transaction details for reference:
  - Date
  - Account
  - Category
  - Amount
  - Description

- **Refund Fields (Editable):**
  - **Amount:** Defaults to original amount (for first refund) or remaining refundable amount (for subsequent refunds); user can override to any positive value
  - **Account:** Defaults to original transaction's account; user can select any available account (with optional warning for currency mismatches)
  - **Category:** Optional dropdown showing only income-type categories; never inherited from original transaction
  - **Description:** Optional text field for refund details
  - **Transaction Type Selector:** Not present—refund type is fixed and not switchable (unlike regular transaction creation which allows switching between income)

- **Action Buttons:**
  - Save: Creates the refund with current values
  - Cancel: Closes the form without creating a refund

**Default Values:**

- Refund amount: Original amount (if first refund) or remaining refundable amount (if subsequent refund)
- Destination account: Original transaction's account
- Category: None (optional)
- All defaults can be overridden by the user

**Example Form UI:**

The refund form follows the same layout and structure as the regular transaction form, with the following key differences:

```
┌────────────────────────────────────────────────────────────────┐
│  + Create Refund                                          [×]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  LINKED TRANSACTION (Read-Only Reference)                      │
│  ──────────────────────────────────────────────────────────────│
│  Original: Laptop purchase | $100.00 | Checking Account        │
│  2024-10-15 | Category: Electronics (Expense)                  │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Account                 │  Category                           │
│  [Checking Account   ▼]  │  [None              ▼]              │
│                          │  (income only)                      │
│                          │                                     │
│  Amount                  │  Date                               │
│  [70.00             ]    │  [2024-10-20           ]            │
│  remaining: $30.00       │                                     │
│                                                                │
│  Description                                                   │
│  [Partial refund - item was defective                    ]     │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [Cancel]                                               [Save] │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Form Layout Details (matching Transaction Form structure):**

- **Linked Transaction Section:** Read-only display of original expense details (compact summary)
- **Account & Category:** Side-by-side on desktop, stacked on mobile
  - Account defaults to original transaction's account
  - Category dropdown shows only income-type categories (mandatory user selection)
- **Amount & Date:** Side-by-side on desktop, stacked on mobile
  - Amount field shows remaining refundable amount as help text
  - Date defaults to current date
- **Description:** Full width optional text field
- **Actions:** Cancel and Save buttons

**Differences from Transaction Form:**

1. **No Type Toggle:** Refund type is fixed (no income/expense toggle like regular transactions)
2. **Linked Transaction Reference:** Shows original expense details for context (read-only section)
3. **Amount Field:** Includes remaining refundable amount indicator
4. **Category Filtering:** Dropdown shows only income-type categories

### Viewing Refunds

**Transaction Card Display (Collapsed View):**

When an EXPENSE transaction has active refunds (non-deleted refunds), the transaction card displays two amounts:

- **Original amount:** Displayed with strikethrough to show it's partially/fully refunded
- **Remaining amount:** Displayed with normal styling (same prominence as the original amount normally has)
- If remaining amount is €0, it is displayed as "€0" (not hidden)

**Refunds on Original Expense Transactions (Expanded View):**

When an original EXPENSE transaction is expanded, it displays a refunds section (if refunds exist):

- **Visibility:** Refunds section only appears when the transaction is expanded
- **Position:** Refunds section is displayed below the optional transaction description
- **Refund List:** Each refund is displayed as a single line with minimal information:
  - Date
  - Account
  - Category
  - Amount
- **Summary Information:**
  - Total refunded amount (sum of all non-deleted refunds)
  - Remaining refundable amount (original amount - total refunded)

**Example of expanded expense transaction with refunds:**
```
Expense: Laptop purchase | $100.00 | Checking Account | Electronics
Date: 2024-10-15
Description: Item was defective

Refunds:
  2024-10-20 | Cash | None | $70.00
  2024-10-22 | Savings | None | $30.00

Total refunded: $100.00
Remaining: $0.00
```

**Refund Transactions in Lists:**

- Refund transactions are displayed in transaction lists with type `REFUND` to distinguish them from regular income
- Account balances include refunds as positive transactions that increase the balance
- Deleted (archived) refunds are not displayed to users
- Transaction history shows complete audit trail linking refunds to original transactions

## Financial Impact

### Account Balances

Refunds are treated as positive transactions that increase account balances, similar to income:

**Balance Calculation:**
- Account balance includes all refunds with `isArchived = false`
- Deleted (archived) refunds are excluded from balance calculations
- Account balance = Initial Balance + INCOME + REFUND + TRANSFER_IN - EXPENSE - TRANSFER_OUT

Note: Refunds can be directed to accounts with different currencies, which may result in unusual balance effects. Users bear responsibility for ensuring their refunds are financially sensible.

**Design Philosophy:**

This approach treats refunds as what they are—money returned from previous purchases—while maintaining complete audit trails and user control. The system intentionally permits flexibility (cross-currency refunds, refunds exceeding original amounts) to give users full control and responsibility for their financial records.

## Outstanding Items

**Monthly Expense Reports & Refunds**
- How refunds should affect monthly expense reports is intentionally excluded from this specification
- This will be clarified and documented in a future update
- Current implementation focuses on transaction-level refund display and account balance accuracy
