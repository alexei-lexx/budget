# Quickstart: Expandable Transaction Cards Testing Guide

**Feature**: Expandable Transaction Cards UI/UX Improvement
**Date**: 2025-10-15
**Purpose**: Manual testing checklist to verify all functional requirements

## Prerequisites

### Environment Setup
1. Start the backend development server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to transactions page: `http://localhost:5173/transactions` (or wherever Vite serves the app)

### Test Data Requirements
- At least 5-10 transactions in the database
- Mix of transaction types (INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT)
- At least 2 transactions with descriptions
- At least 1 transaction without a description
- At least 1 transaction with a very long description (100+ characters)

## Test Scenarios

### ✅ Scenario 1: Default Collapsed State (FR-001, FR-002)
**Objective**: Verify cards show only essential information by default

**Steps**:
1. Load the transactions page
2. Observe the transaction cards

**Expected Result**:
- ✅ Each card shows: icon, date, account name, category name (if exists), amount
- ✅ Description is NOT visible on any card
- ✅ Edit and Delete buttons are NOT visible on any card
- ✅ All content fits on a single line per card
- ✅ No expanded content is visible

**Verification**: All cards are compact, scannable list without clutter

---

### ✅ Scenario 2: Single Card Expansion (FR-003, FR-004)
**Objective**: Verify clicking a card expands it to show hidden content

**Steps**:
1. Click anywhere on the first transaction card (but not on any visible buttons)
2. Observe the card

**Expected Result**:
- ✅ Card expands to show a second row below the main content
- ✅ Second row displays:
  - Left side: Description text (if transaction has description)
  - Right side: Edit and Delete buttons
- ✅ Main transaction info (date, account, category, amount) remains visible on first row
- ✅ Card visually differentiates from collapsed cards (border color, etc.)
- ✅ Expansion happens smoothly (animation if implemented)

**Verification**: Expanded card shows all information including previously hidden description and action buttons

---

### ✅ Scenario 3: Card Collapse (FR-005)
**Objective**: Verify clicking an expanded card collapses it

**Steps**:
1. Start with an expanded card (from Scenario 2)
2. Click on the card again (on the first row, not on the buttons)
3. Observe the card

**Expected Result**:
- ✅ Card collapses back to default state
- ✅ Description is hidden again
- ✅ Edit and Delete buttons are hidden again
- ✅ Card returns to single-line compact view
- ✅ Collapse happens smoothly (animation if implemented)

**Verification**: Card returns to same appearance as initial load

---

### ✅ Scenario 4: Multiple Independent Expansions (FR-006)
**Objective**: Verify multiple cards can be expanded simultaneously and independently

**Steps**:
1. Expand the 1st transaction card
2. Expand the 3rd transaction card
3. Expand the 5th transaction card
4. Observe all cards
5. Collapse the 3rd card
6. Observe all cards again

**Expected Result**:
- ✅ After steps 1-3: Cards 1, 3, and 5 are expanded, all others collapsed
- ✅ After step 5: Cards 1 and 5 remain expanded, card 3 is collapsed
- ✅ Each card expansion/collapse is independent
- ✅ No card is affected by actions on other cards

**Verification**: Each card maintains its own state independently

---

### ✅ Scenario 5: Empty Description Handling (FR-004)
**Objective**: Verify expanded card handles missing descriptions gracefully

**Steps**:
1. Find a transaction card without a description (or delete description from one)
2. Click to expand the card
3. Observe the expanded content

**Expected Result**:
- ✅ Card expands normally
- ✅ Second row appears
- ✅ Edit and Delete buttons are visible on the right
- ✅ Description area is empty or shows "No description" placeholder (implementation choice)
- ✅ Layout is not broken, buttons are properly positioned

**Verification**: Missing description doesn't break the UI, buttons remain accessible

---

### ✅ Scenario 6: Button Click Doesn't Collapse (FR-010)
**Objective**: Verify clicking edit or delete buttons doesn't trigger card collapse

**Steps**:
1. Expand a transaction card
2. Click on the "Edit" button
3. Observe the card state and edit dialog
4. Close the edit dialog without making changes
5. Observe the card state
6. Click on the "Delete" button
7. Observe the card state and delete confirmation dialog

**Expected Result**:
- ✅ After step 2: Edit dialog opens, card stays expanded
- ✅ After step 4: Edit dialog closes, card stays expanded
- ✅ After step 6: Delete confirmation opens, card stays expanded
- ✅ Card never collapses when clicking Edit or Delete buttons

**Verification**: Button clicks are isolated from card expand/collapse behavior

---

### ✅ Scenario 7: State Persists After Edit (FR-011)
**Objective**: Verify card remains expanded after editing a transaction

**Steps**:
1. Expand a transaction card
2. Click "Edit" button
3. Make changes to the transaction (e.g., change amount or description)
4. Save the changes
5. Observe the card state

**Expected Result**:
- ✅ Edit dialog closes
- ✅ Card remains in expanded state
- ✅ Updated transaction data is displayed
- ✅ Description and buttons are still visible

**Verification**: Expansion state survives edit operation

---

### ✅ Scenario 8: Long Description Wrapping (FR-012)
**Objective**: Verify long descriptions wrap without scrolling or truncation

**Steps**:
1. Find or create a transaction with a very long description (100+ characters)
2. Expand the card
3. Observe the description display

**Expected Result**:
- ✅ Full description text is visible
- ✅ Text wraps to multiple lines naturally
- ✅ No horizontal scrollbar appears
- ✅ No "..." truncation is applied
- ✅ Card height increases to accommodate all text
- ✅ Description remains readable

**Verification**: Long text wraps properly without usability issues

---

### ✅ Scenario 9: Session Persistence (FR-007)
**Objective**: Verify expansion state persists during session but not across page reloads

**Steps**:
1. Expand 3 transaction cards
2. Scroll down the page
3. Scroll back up
4. Observe the cards
5. Reload the page (F5 or Cmd+R)
6. Observe the cards again

**Expected Result**:
- ✅ After step 4: All 3 cards remain expanded after scrolling
- ✅ After step 6: All cards are collapsed after page reload
- ✅ No expansion state is saved to localStorage or backend

**Verification**: State is session-only, clears on reload

---

### ✅ Scenario 10: Visual Feedback (FR-008, FR-009)
**Objective**: Verify clickable indicators work on both desktop and mobile

**Desktop Steps**:
1. Hover mouse over a collapsed card (without clicking)
2. Observe visual changes
3. Click to expand
4. Observe visual changes on expanded card

**Desktop Expected Result**:
- ✅ Hovering shows visual feedback (shadow, transform, etc.)
- ✅ Cursor changes to pointer on hover
- ✅ Expanded card has different visual state (border color, background tint, etc.)
- ✅ Chevron icon (if present) changes direction (down → up)

**Mobile Steps** (use Chrome DevTools mobile emulation or actual device):
1. View transaction list on mobile device
2. Observe collapsed cards
3. Tap a card to expand
4. Observe expanded card

**Mobile Expected Result**:
- ✅ Chevron icon (or similar indicator) is visible without needing to hover
- ✅ Tapping card expands it smoothly
- ✅ Expanded card visually differentiates from collapsed
- ✅ No reliance on hover effects for clickability indication

**Verification**: Visual feedback works on both interaction paradigms

---

### ✅ Scenario 11: Mobile Responsive Layout (FR-013)
**Objective**: Verify layout adapts to mobile screens

**Steps** (use Chrome DevTools mobile emulation, set viewport to 375x667 iPhone SE):
1. Expand a transaction card
2. Observe the expanded content layout

**Expected Result**:
- ✅ Description appears above the buttons (vertical stack)
- ✅ Description is full-width or near full-width
- ✅ Edit and Delete buttons appear below description
- ✅ Both buttons are easily tappable (not too small)
- ✅ No horizontal scrolling required
- ✅ Layout doesn't break or overlap

**Desktop Comparison** (widen viewport to > 600px):
- ✅ Description appears on left side
- ✅ Edit and Delete buttons appear on right side
- ✅ All elements are on the same horizontal line

**Verification**: Responsive breakpoint switches between vertical and horizontal layouts

---

## Quick Smoke Test (30 seconds)

For rapid verification after code changes:

1. ✅ Load page → All cards collapsed
2. ✅ Click card → Expands
3. ✅ Click again → Collapses
4. ✅ Click Edit button → Dialog opens, card stays expanded
5. ✅ Close dialog → Card stays expanded
6. ✅ Reload page → All cards collapsed

**Pass if**: All 6 steps work as described

---

## Regression Testing

After implementing this feature, verify existing functionality still works:

### ✅ Transaction Creation
1. Click "Add Transaction" button
2. Fill out form and submit
3. Verify new transaction appears in list (collapsed state)

### ✅ Transaction Editing
1. Expand a card
2. Click Edit button
3. Modify transaction
4. Save changes
5. Verify changes appear correctly
6. Verify card remains expanded

### ✅ Transaction Deletion
1. Expand a card
2. Click Delete button
3. Confirm deletion
4. Verify transaction is removed from list
5. Verify no errors occur

### ✅ Transfer Operations
1. Create a transfer between two accounts
2. Verify both TRANSFER_OUT and TRANSFER_IN transactions appear
3. Expand/collapse both transfer cards
4. Verify edit/delete operations work on transfers

### ✅ Pagination
1. If more than page size (default 20) transactions exist
2. Scroll to bottom and click "Load More"
3. Expand some cards from first page
4. Load more transactions
5. Verify previously expanded cards remain expanded
6. Verify newly loaded cards are collapsed

---

## Performance Testing

### ✅ Large List Performance
1. Create 50+ transactions (if not already present)
2. Expand 10-15 cards simultaneously
3. Observe UI responsiveness

**Expected**:
- ✅ Expand/collapse operations feel instant (< 100ms perceived latency)
- ✅ Scrolling remains smooth with multiple expanded cards
- ✅ No lag when clicking rapidly between cards

### ✅ Rapid Toggle Testing
1. Click same card 10 times rapidly
2. Observe behavior

**Expected**:
- ✅ Card toggles correctly each time
- ✅ No visual glitches or stuck states
- ✅ Final state is deterministic (odd clicks = expanded, even clicks = collapsed)

---

## Browser Compatibility

Test in the following browsers (if available):

- ✅ Chrome/Chromium (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

**Expected**: Feature works identically across all browsers

---

## Accessibility Testing (Optional)

While not explicitly required, consider:

### ✅ Keyboard Navigation
1. Tab through transaction cards
2. Press Enter/Space on focused card
3. Verify card expands/collapses

### ✅ Screen Reader
1. Use screen reader (VoiceOver, NVDA, etc.)
2. Verify cards are announced as interactive
3. Verify state changes are announced

---

## Known Limitations

**By Design** (per requirements):
- Expansion state does NOT persist across page reloads (FR-007)
- No localStorage or backend persistence
- No "expand all" / "collapse all" functionality
- No keyboard shortcuts for expand/collapse

**Not Tested** (out of scope):
- Automated UI tests (user specified no frontend tests needed)
- Unit tests for state management
- E2E tests with Cypress/Playwright

---

## Troubleshooting

### Issue: Card doesn't expand on click
**Check**: Is the click handler attached correctly? Is event propagation working?
**Debug**: Open browser console, check for JavaScript errors

### Issue: Edit button click collapses card
**Check**: Is `@click.stop` present on button wrapper? Is event propagation blocked?
**Debug**: Add console.log to click handlers to trace event flow

### Issue: Mobile layout doesn't stack vertically
**Check**: Are Vuetify breakpoint classes correct? Is viewport meta tag present?
**Debug**: Use Chrome DevTools responsive mode, inspect element classes

### Issue: State doesn't persist during session
**Check**: Is state stored in parent component? Is it a ref?
**Debug**: Use Vue DevTools to inspect component state

---

## Success Criteria

Feature is ready for production when:

- ✅ All 11 test scenarios pass
- ✅ Smoke test passes consistently
- ✅ Regression tests pass (existing features still work)
- ✅ Performance is acceptable (< 100ms perceived latency)
- ✅ Works on both desktop and mobile viewports
- ✅ No console errors during normal usage

---

**Testing Status**: Ready to begin after implementation complete
