# General Specification Document

**Project Name:** Personal Finance Tracker (working title)
**Version:** 2.0 (Updated to reflect current implementation)
**Date:** 10 June 2025

---

## 1. Current Status

**Implementation Status:** Initial scaffolding phase
- Infrastructure foundation is complete with working deployment pipeline
- Basic Vue 3 frontend with default template components
- Basic Apollo GraphQL backend with health check endpoint
- AWS CDK infrastructure for both frontend (S3/CloudFront) and backend (Lambda/API Gateway)

**Next Phase:** Core application features need to be implemented

## 2. Purpose

The application will help individuals track their personal finances by recording income, expenses, and account transfers. It will support multiple accounts and categories, and provide clear monthly summaries showing totals and breakdowns without any analytics or forecasting.

---

## 3. Core Features (To Be Implemented)

### 3.1 Account Management

- Users can create and manage multiple personal accounts, such as:
  - _Cash_
  - _Bank Account_
  - _Credit Card_
- Each account shows its own balance based on related transactions.
- Users can rename or delete accounts as needed.
- Users can set an initial balance for each account when created.

### 3.2 Transaction Tracking

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

### 3.3 Transfers Between Accounts

- Users can transfer money between their own accounts **only if both accounts use the same currency**.
  - Example: Transfer from _Bank Account (USD)_ to _Cash (USD)_ is allowed.
  - Transfer from _Bank Account (USD)_ to _Credit Card (EUR)_ is **not allowed**.
- These transfers adjust balances in both accounts but do not affect income or expense totals.

### 3.4 Category Management

- Users can manage custom categories for both income and expenses.
- Categories help group similar transactions for reporting.
  - Example categories:
    - Income: _Salary_, _Freelance_
    - Expense: _Rent_, _Food_, _Utilities_

### 3.5 Multi-Currency Support

- Each account can be assigned a specific currency.
- Transactions are stored in the account’s currency.
- Reports show amounts grouped by account currency; no currency conversion is performed.

### 3.6 Monthly Reports

- A simple monthly overview is generated per calendar month, showing:
  - Total income and total expenses
  - Breakdown per category (e.g., how much was spent on “Food”)
  - Proportions shown as percentages to indicate category shares
  - Balances grouped by currency to avoid currency conversion issues
- Reports are presented in **tables only** for clarity and detail.

---

## 4. Accessibility & Platform

### 4.1 Browser-Based Access

- The application is used directly from a web browser.
- No installation via app stores is required.

### 4.2 Mobile Friendly

- Fully responsive design optimized for Android browsers.
- Option to install as a shortcut on the home screen (PWA-style behavior).

### 4.3 Cross-Device Sync & User Data Isolation

- Multiple users can sign in, each with their own Google account.
- Each user has access **only** to their own data.
- User data is stored centrally and synced across all devices.
- No manual backup or device-specific storage.

### 4.4 Always Online

- The app requires an active internet connection to function.
- No offline mode or local caching is supported.

---

## 5. User Experience

### 5.1 Simple Sign-In

- Users log in using their Google account (OAuth).
- No password or account creation required.

### 5.2 Clean, Minimal Interface

- Focus on usability, with fast access to:
  - Add a transaction
  - View account balances
  - See monthly report

### 5.3 Personal Use Only

- Each user’s data is private and accessible only to them.
- No shared accounts, collaboration, or multi-user data features.

---

## 6. Cost & Maintenance

- Infrastructure should be low-cost and scalable.
- Ideal backend services:
  - Serverless (pay-per-use model)
  - Minimal or free-tier database hosting
- The application is intended to be lightweight and require minimal maintenance.
