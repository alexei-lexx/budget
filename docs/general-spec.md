# General Specification Document

- **Project Name:** Personal Finance Tracker (working title)
- **Version:** 1.0
- **Date:** 12 June 2025

---

## 1. Purpose

The application will help individuals track their personal finances by recording income, expenses, and account transfers. It will support multiple accounts and categories, and provide clear monthly summaries showing totals and breakdowns without any analytics or forecasting.

---

## 2. Core Features

### 2.1 Account Management

- Users can create and manage multiple personal accounts (e.g., _Cash_, _Bank Account_, _Credit Card_).

**Account Creation Requirements:**
- Name must be specified
- Currency must be selected (required)
- Initial balance can be set (optional, defaults to 0)

**Account Updates:**
- Name can be changed
- Currency can be changed (with warning that this affects transfer compatibility)
- Initial balance can be updated at any time

**Account Deletion:**
- Accounts are archived (soft delete) rather than permanently deleted
- Archived accounts are hidden from the main UI but preserved in historical data
- Users can restore archived accounts if needed
- This preserves transaction history and maintains report integrity

**Data Privacy & User Experience:**
- Users see only essential account information: name, currency, and balance
- All destructive actions (account deletion) require explicit user confirmation
- Confirmation dialogs show the specific account name and warn that the action cannot be undone
- Delete button is clearly labeled as "Delete" rather than technical terms like "Archive"

**Balance Calculation:**
- Account balance = Initial balance + Sum of all transactions
- Balance is displayed in the account's specified currency

### 2.2 Transaction Tracking

- Users can manually log financial transactions with the following details:
  - Type: _Income_ or _Expense_
  - Account used
  - Amount
  - Currency
  - Date
  - Category
  - Optional description
- Example entries:
  - Income: _Salary payment into Bank Account_
  - Expense: _Groceries paid in Cash_

### 2.3 Transfers Between Accounts

- Users can transfer money between their own accounts **only if both accounts use the same currency**.
  - Example: Transfer from _Bank Account (USD)_ to _Cash (USD)_ is allowed.
  - Transfer from _Bank Account (USD)_ to _Credit Card (EUR)_ is **not allowed**.
- These transfers adjust balances in both accounts but do not affect income or expense totals.

### 2.4 Category Management

- Users can manage custom categories for both income and expenses.
- Categories help group similar transactions for reporting.
  - Example categories:
    - Income: _Salary_, _Freelance_
    - Expense: _Rent_, _Food_, _Utilities_

### 2.5 Multi-Currency Support

- Each account can be assigned a specific currency.
- Transactions are stored in the account’s currency.
- Reports show amounts grouped by account currency; no currency conversion is performed.

### 2.6 Monthly Reports

- A simple monthly overview is generated per calendar month, showing:
  - Total income and total expenses
  - Breakdown per category (e.g., how much was spent on “Food”)
  - Proportions shown as percentages to indicate category shares
  - Balances grouped by currency to avoid currency conversion issues
- Reports are presented in **tables only** for clarity and detail.

---

## 3. Accessibility & Platform

### 3.1 Browser-Based Access

- The application is used directly from a web browser.
- No installation via app stores is required.

### 3.2 Mobile Friendly

- Fully responsive design optimized for Android browsers.
- Option to install as a shortcut on the home screen (PWA-style behavior).

### 3.3 Cross-Device Sync & User Data Isolation

- Multiple users can sign in, each with their own Google account.
- Each user has access **only** to their own data.
- User data is stored centrally and synced across all devices.
- No manual backup or device-specific storage.

### 3.4 Always Online

- The app requires an active internet connection to function.
- No offline mode or local caching is supported.

---

## 4. User Experience

### 4.1 Flexible Authentication

- Powered by AWS Cognito for secure, scalable authentication.
- Initial phase: Email/password login for manually created users.
- Users are created manually in AWS Cognito dashboard (no self-registration).
- Passkey support: Users can optionally register and authenticate using WebAuthn/FIDO2 passkeys (biometrics, security keys).
- Future expansion: Social logins (Google, GitHub, etc.) and other identity providers.

### 4.2 Clean, Minimal Interface

- Focus on usability, with fast access to:
  - Add a transaction
  - View account balances
  - See monthly report

### 4.3 Personal Use Only

- Each user’s data is private and accessible only to them.
- No shared accounts, collaboration, or multi-user data features.

---

## 5. Cost & Maintenance

- Infrastructure should be low-cost and scalable.
- Ideal backend services:
  - Serverless (pay-per-use model)
  - Minimal or free-tier database hosting
- The application is intended to be lightweight and require minimal maintenance.
