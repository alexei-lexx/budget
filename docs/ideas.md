# Future Enhancements

This document contains enhancements and improvements that are intentionally skipped during current feature development but may be implemented later. When working on a feature's minimum viable implementation, additional nice-to-have improvements should be documented here rather than delaying the core functionality.

## Transaction Management

### Advanced Features
- Export transactions to CSV/Excel formats

### Transaction Entry UX Improvements

#### Mobile Optimization
- Replace modal with dedicated page (`/transactions/new`) on mobile
- Add floating action button (FAB) for quick access from any page
- Implement bottom sheet pattern for tablet/desktop quick entry
- Optimize for one-handed operation with bottom-aligned primary actions
- Responsive form layout (single column mobile, bottom sheet tablet, enhanced modal desktop)

#### Quick Entry Mode
- Express transaction flow: Amount → Account → Quick Save
- Optional expansion for category, date, description
- "Save & Add Another" functionality
- Batch entry mode for multiple transactions
- Quick templates for recurring transactions
- "Add Similar" button on transaction cards
- Custom shortcuts for user's most common transactions

#### Enhanced Input Methods
- Number pad for amount input on mobile
- Voice input for description field
- Smart autocomplete for descriptions
- ML-powered categorization based on description
- Spending pattern recognition for intelligent defaults
