# Task 14: Default Landing Page - Transactions

## Objective

Change the default landing page from the current welcome page to `/transactions` to align with the most common daily use case of adding and viewing recent transactions.

## Use Cases

- **Unauthenticated users**: See sign-in message and authentication options when opening the app
- **Authenticated users**: Open the app and immediately see recent transactions
- User clicks "Add Transaction" to log new expenses/income
- Direct URL navigation to other pages continues to work normally

## Acceptance Criteria

- **Unauthenticated users**: Opening the app root URL (`/`) shows sign-in page (Dashboard/SignIn component)
- **Authenticated users**: Opening the app root URL (`/`) automatically redirects to `/transactions` page
- "Add Transaction" button is prominently displayed and easily accessible as the primary action
- Navigation to other pages works seamlessly
- Browser back/forward navigation works correctly

## Implementation Plan

### 14.1 Frontend Routing Layer
- [ ] 14.1.1 Rename Dashboard component to SignIn for clarity
- [ ] 14.1.2 Add authentication check to root route `/` in router configuration
- [ ] 14.1.3 Implement conditional routing: unauthenticated users see SignIn page, authenticated users redirect to `/transactions`

### 14.2 Frontend UI/UX Layer
- [ ] 14.2.1 Reorder buttons to prioritize "Add Transaction" as the primary action
- [ ] 14.2.2 Improve mobile layout for both action buttons

## Testing

**Manual Testing**
- [ ] [M] Open browser and navigate to app root URL while unauthenticated
- [ ] [M] Verify SignIn page shows for unauthenticated users
- [ ] [M] Sign in and verify automatic redirect to `/transactions` occurs
- [ ] [M] Test navigation to other pages works correctly
- [ ] [M] Use browser back button to verify navigation flow
