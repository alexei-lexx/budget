# Refund Implementation Specification

## Overview

Refunds represent the return of money from a previous expense transaction. This document outlines the business concept and data model for supporting refunds in the Personal Finance Tracker.

## Business Concept

### What is a Refund?
A refund occurs when money is returned after a purchase, such as:
- Returning a defective product to a store
- Canceling a service subscription
- Getting money back for an overcharge

### Key Business Rules
- Refunds can only be created for expense transactions
- Total refunds cannot exceed the original transaction amount
- Refunds can go to any account with matching currency
- Original transactions cannot be deleted if they have refunds

## Data Model

### Refund as Transaction
Refunds are modeled as transactions with type REFUND that link back to the original expense:

**Original Expense:**
- $100 laptop purchase on Account A

**Refund Transaction:**  
- $30 refund to Account B (or same account)
- Links to original transaction
- Increases account balance

### Transaction Linking
- Each refund stores reference to original transaction
- System can calculate total refunded amount by summing linked refunds
- Remaining refundable amount = original amount - total refunds

## User Experience

### Creating Refunds
1. User selects expense transaction to refund
2. Chooses destination account (same currency only)
3. Enters refund amount (validated against remaining balance)
4. Adds description for the refund

### Viewing Refunds
- Original expenses show refund status
- Transaction lists distinguish refunds from regular income
- Account balances reflect refunds as positive transactions

## Financial Impact

### Account Balances
Refunds increase account balances like income, but are tracked separately for reporting.

### Reporting
- Refunds appear as separate REFUND transactions in reports
- Income reports distinguish earned income from refunds
- Transaction history shows complete audit trail

This approach treats refunds as what they are - money returned from previous purchases - while maintaining clear audit trails and accurate financial reporting.