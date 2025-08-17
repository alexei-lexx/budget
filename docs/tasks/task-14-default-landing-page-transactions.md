# Task 14: Default Landing Page - Transactions

## Objective

Change the default landing page from the current welcome page to `/transactions` to align with the most common daily use case of adding and viewing recent transactions.

## Use Cases

- **Unauthenticated users**: See sign-in message and authentication options when opening the app
- **Authenticated users**: Open the app and immediately see recent transactions
- User clicks "Add Transaction" to log new expenses/income
- Direct URL navigation to other pages continues to work normally

## Acceptance Criteria

- **Unauthenticated users**: Opening the app root URL (`/`) shows sign-in page
- **Authenticated users**: Opening the app root URL (`/`) automatically redirects to transactions page
- **Unauthenticated users**: Navigation menu shows only sign-in option
- **Authenticated users**: Navigation menu shows transactions as first item, followed by accounts and categories
- "Add Transaction" button is prominently displayed first and easily accessible as the primary action
- Navigation to other pages works seamlessly
- Browser back/forward navigation works correctly

## Implementation Plan

### 14.1 Frontend Routing Layer
- [x] 14.1.1 Rename Dashboard component to SignIn for clarity
- [x] 14.1.2 Add authentication check to root route `/` in router configuration
- [x] 14.1.3 Implement conditional routing: unauthenticated users see SignIn page, authenticated users redirect to `/transactions`

### 14.2 Frontend UI/UX Layer
- [x] 14.2.1 Reorder buttons to prioritize "Add Transaction" as the primary action
- [x] 14.2.2 Improve mobile layout for both action buttons

## Testing

**Manual Testing**
- [x] [M] Open browser and navigate to app root URL while unauthenticated
- [x] [M] Verify SignIn page shows for unauthenticated users
- [x] [M] Sign in and verify automatic redirect to `/transactions` occurs
- [x] [M] Test navigation to other pages works correctly
- [x] [M] Use browser back button to verify navigation flow
