# Quickstart: REFUND Transaction Type

**Feature**: Minimal Refund Transaction Type
**Branch**: `012-minimal-refund`
**Date**: 2025-11-27

## What is a REFUND Transaction?

A REFUND transaction represents money you received back from a previous purchase. Common examples include:
- Returning a product to a store
- Getting a refund from an online order
- Receiving money back from a canceled service
- Insurance reimbursements
- Cashback from a purchase

**How it affects your balance**: REFUND transactions **increase** your account balance (like income), since you're receiving money back.

## Quick Start Guide

### 1. Creating a REFUND Transaction

**Step 1**: Open the Transactions page

**Step 2**: Click the "Add Transaction" button (+ icon)

**Step 3**: In the transaction form, click the **REFUND** button (third option)

**Step 4**: Fill in the transaction details:
- **Account**: Select the account that received the refund
- **Amount**: Enter the refund amount (must be positive)
- **Date**: Select when you received the refund
- **Category** (optional): Choose an expense category that relates to what was refunded
- **Description** (optional): Add notes like "Returned defective headphones"

**Step 5**: Click **Save**

**Result**: Your account balance immediately increases by the refund amount, and the transaction appears in your transaction list.

### 2. Viewing REFUND Transactions

**All Transactions List**:
- REFUND transactions appear alongside your other transactions
- Look for the "REFUND" type label to identify them
- They display the same information: date, account, category, amount, description

**Expandable Cards**:
- Click on any REFUND transaction to expand it
- Expanded view shows the description and Edit/Delete buttons
- Click again to collapse

### 3. Filtering REFUND Transactions

**Step 1**: Open the transaction filter (click filter icon)

**Step 2**: Find the "Transaction Type" section

**Step 3**: Select **Refund** from the options

**Step 4**: Click "Apply Filters"

**Result**: Only REFUND transactions are displayed in the list.

**Tip**: You can combine filters to narrow results further:
- Filter by account + REFUND type → "Show all refunds for my Checking Account"
- Filter by category + REFUND type → "Show all grocery-related refunds"
- Filter by date range + REFUND type → "Show refunds from last month"

### 4. Editing a REFUND Transaction

**Step 1**: Find the REFUND transaction in your transaction list

**Step 2**: Click to expand the transaction card

**Step 3**: Click the "Edit" button

**Step 4**: Make changes:
- Change the amount, date, account, category, or description
- Switch the transaction type to INCOME or EXPENSE if needed

**Step 5**: Click "Save"

**Result**: The transaction is updated, and your account balance recalculates automatically.

### 5. Deleting a REFUND Transaction

**Step 1**: Find the REFUND transaction in your transaction list

**Step 2**: Click to expand the transaction card

**Step 3**: Click the "Delete" button

**Step 4**: Confirm deletion

**Result**: The transaction is archived (soft-deleted) and your account balance **decreases** by the refund amount.

**Note**: Deleted transactions don't appear in your transaction list but can potentially be restored by support if needed.

## Common Use Cases

### Use Case 1: Product Return

**Scenario**: You bought a $50 shirt but returned it for a full refund.

**Steps**:
1. Create REFUND transaction
2. Amount: $50
3. Account: Credit Card
4. Category: Shopping (optional)
5. Description: "Returned shirt - wrong size"

**Result**: Your credit card balance increases by $50.

### Use Case 2: Uncategorized Refund

**Scenario**: You received a $15 refund from Amazon, but you don't remember what it was for.

**Steps**:
1. Create REFUND transaction
2. Amount: $15
3. Account: Checking Account
4. Category: Leave blank
5. Description: "Amazon refund"

**Result**: Transaction saved without a category (totally fine!).

### Use Case 3: Multiple Refunds for Same Category

**Scenario**: You returned multiple grocery items this month.

**Steps**:
1. Create separate REFUND transactions for each return
2. Use the same category "Groceries" for all
3. Use filters to view all grocery refunds together

**Result**: Easy tracking of all grocery-related refunds.

## Category Guidelines

### Can I use any category for a REFUND?

**Short answer**: Only expense categories (or no category).

**Why**: REFUND transactions represent money back from a purchase. Since purchases are expenses, refunds should use expense categories to maintain logical consistency.

**Valid Examples**:
- ✓ Shopping (expense category)
- ✓ Groceries (expense category)
- ✓ Entertainment (expense category)
- ✓ No category

**Invalid Examples**:
- ✗ Salary (income category) → Error
- ✗ Freelance Income (income category) → Error

**Tip**: If you receive money that's not related to a refund (like a bonus or gift), use INCOME instead of REFUND.

## Balance Impact Examples

### Example 1: Simple REFUND

**Starting Balance**: $1,000
**Action**: Create REFUND for $25
**New Balance**: $1,025

### Example 2: Multiple REFUNDs

**Starting Balance**: $500
**Action 1**: Create REFUND for $15
**Balance**: $515
**Action 2**: Create REFUND for $30
**Final Balance**: $545

### Example 3: Delete REFUND

**Starting Balance**: $1,000 (includes a $50 REFUND)
**Action**: Delete the $50 REFUND transaction
**New Balance**: $950

**Explanation**: Deleting the REFUND removes the $50 increase from your balance.

## Refunds and Reports

### Where do REFUND transactions appear?

**Transaction List**: ✓ Yes (with filters available)
**Account Balance**: ✓ Yes (increases balance)
**Monthly Expense Reports**: ✗ No (excluded)
**Weekday Expense Reports**: ✗ No (excluded)

### Why are refunds excluded from expense reports?

**Reason**: Expense reports show money you've spent. REFUND transactions represent money received back, so they don't belong in spending analysis.

**Example**: If you spent $200 on groceries but returned $20 worth of items, your expense report shows $200 (what you initially spent), not $180. The REFUND appears separately in your transaction list and increases your account balance.

## Frequently Asked Questions

### Q: What's the difference between REFUND and INCOME?

**REFUND**: Money received back from a previous purchase (e.g., product return)
**INCOME**: Money earned or received as new income (e.g., salary, gift)

**Both increase your balance**, but they represent different types of money flow.

### Q: Can I leave the category blank for a REFUND?

**Yes!** Categories are optional for all transaction types, including REFUND.

### Q: What happens if I change a REFUND to an EXPENSE?

Your account balance will recalculate:
- REFUND of $50 → balance +$50
- Change to EXPENSE of $50 → balance -$100 (removed +$50, added -$50)

### Q: Can I filter for both INCOME and REFUND at the same time?

**Yes!** The transaction filter supports selecting multiple types. This is useful for viewing all money received (both income and refunds).

### Q: Will REFUND transactions appear in my monthly budget?

This depends on how your budgeting feature is implemented. Per current spec, REFUND is excluded from expense reports, so it won't affect expense tracking. Future budget features may handle REFUND differently.

### Q: Can I create a TRANSFER and a REFUND in one transaction?

**No.** TRANSFER is a separate operation that creates two transactions (TRANSFER_OUT and TRANSFER_IN). REFUND is a standalone transaction type.

## Developer Notes

### GraphQL Mutations

**Create REFUND**:
```graphql
mutation {
  createTransaction(input: {
    accountId: "account-id"
    type: REFUND
    amount: 25.50
    date: "2025-11-27"
    categoryId: "category-id"  # optional, must be expense category
    description: "Product return"  # optional
  }) {
    id
    type
    amount
  }
}
```

**Update to REFUND**:
```graphql
mutation {
  updateTransaction(id: "transaction-id", input: {
    type: REFUND
  }) {
    id
    type
  }
}
```

**Filter by REFUND**:
```graphql
query {
  transactions(filters: {
    types: [REFUND]
  }) {
    edges {
      node {
        id
        type
        amount
      }
    }
  }
}
```

### Type Definitions

**TypeScript**:
```typescript
enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  REFUND = 'REFUND',
}
```

## Support

For issues or questions:
- Check the transaction list to verify REFUND appears
- Check account balance to confirm increase
- Verify category is an expense type (or blank)
- Contact support if you encounter errors

## Summary

REFUND transactions:
- ✓ Increase your account balance
- ✓ Can use expense categories (or no category)
- ✓ Appear in transaction lists and filters
- ✓ Support all standard operations (create, edit, delete)
- ✗ Don't appear in expense reports

Use REFUND whenever you receive money back from a previous purchase to accurately track your finances.
