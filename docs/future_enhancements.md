# Future Enhancements

This document contains enhancements and improvements that are intentionally skipped during current feature development but may be implemented later. When working on a feature's minimum viable implementation, additional nice-to-have improvements should be documented here rather than delaying the core functionality.

## Transaction Management

### Advanced Filtering & Sorting
- Filter transactions by account, category, date range, transaction type, and description search
- Sort transactions by date or amount (ascending/descending)
- Multiple active filters working together

### Enhanced User Experience
- Pagination or infinite scroll for large transaction lists

### Account Balance Integration
- Calculate and display current account balances based on transactions
- Two main architectural approaches considered:
  1. **BalanceService Approach**: Dedicated service coordinates AccountRepository (for initialBalance) and TransactionRepository (for transaction sum). Clean separation but requires service layer.
  2. **Initial Balance as Transaction Approach**: Store initial account balance as special first transaction, then balance = SUM(all transactions). Simpler, single source of truth, complete audit trail.

### Advanced Features
- Quick-add transaction button with common categories
- Export transactions to CSV/Excel formats
