# Manual Testing Guide: Description Suggestion Fix

**Feature**: Fix Transaction Description Suggestion Duplicate Selection
**Branch**: `021-fix-description-suggestions`
**Date**: 2025-12-20

## Prerequisites

### Environment Setup

1. **Local development environment running**:
   ```bash
   # Terminal 1: Start DynamoDB Local
   cd backend
   npm run dynamodb:start

   # Terminal 2: Start backend
   cd backend
   npm run dev

   # Terminal 3: Start frontend
   cd frontend
   npm run dev
   ```

2. **Test data prepared**:
   - At least one user account created and authenticated
   - Multiple transactions with similar descriptions for suggestion matching:
     - "groceries"
     - "grocery shopping"
     - "grocery store visit"
     - "coffee"
     - "coffee with friends"
     - "coffee shop"

3. **Browser DevTools open**:
   - Open Network tab to observe GraphQL requests
   - Open Console to check for errors
   - Consider using Vue DevTools extension for reactive state inspection

## Test Scenarios

### Scenario 1: Create Transaction - Single Selection Flow

**Objective**: Verify that selecting a suggestion once completes the action without requiring a second selection.

**Steps**:

1. Navigate to Transactions page
2. Click "Add Transaction" or equivalent button to open transaction creation form
3. In the Description field, type partial text that matches existing descriptions (e.g., "groc")
4. **Observe**: After ~300ms debounce, suggestions dropdown appears with matching options:
   - "groceries"
   - "grocery shopping"
   - "grocery store visit"
5. Click on one suggestion (e.g., "groceries")

**Expected Results**:
- ✅ Description field immediately populates with "groceries"
- ✅ Dropdown closes immediately
- ✅ Dropdown DOES NOT re-open after ~300ms
- ✅ Save button is enabled immediately
- ✅ Form can be submitted successfully without any additional interaction

**Failure Indicators**:
- ❌ Dropdown re-opens after ~300ms
- ❌ Save button remains disabled
- ❌ User must click suggestion a second time

**Duration**: ~1 minute per test

---

### Scenario 2: Edit Transaction - Consistent Behavior

**Objective**: Verify fix works identically in edit mode as in create mode.

**Steps**:

1. Navigate to Transactions page with existing transactions
2. Click "Edit" on any transaction to open edit form
3. Clear the Description field completely
4. Type partial text that matches existing descriptions (e.g., "cof")
5. **Observe**: Suggestions dropdown appears with matching options:
   - "coffee"
   - "coffee with friends"
   - "coffee shop"
6. Click on one suggestion (e.g., "coffee with friends")

**Expected Results**:
- ✅ Same behavior as Scenario 1 (Create mode)
- ✅ Description populates, dropdown closes, no re-opening
- ✅ Save button enabled immediately
- ✅ Changes can be saved without additional selection

**Failure Indicators**:
- ❌ Different behavior from create mode
- ❌ Dropdown re-opens in edit mode but not create mode (or vice versa)

**Duration**: ~1 minute per test

---

### Scenario 3: Keyboard Navigation

**Objective**: Verify keyboard-based suggestion selection has identical behavior to mouse clicks.

**Steps**:

1. Open transaction creation or edit form
2. Focus on Description field
3. Type partial text (e.g., "groc")
4. **Observe**: Suggestions dropdown appears
5. Press **Arrow Down** key to highlight first suggestion
6. Press **Arrow Down** again to highlight second suggestion
7. Press **Enter** key to select highlighted suggestion

**Expected Results**:
- ✅ Suggestion selected via Enter key populates field
- ✅ Dropdown closes immediately
- ✅ Dropdown DOES NOT re-open after ~300ms
- ✅ Save button enabled immediately

**Additional Keyboard Tests**:

**Escape Key**:
1. Type partial text → suggestions appear
2. Press **Escape** key
3. **Expected**: Dropdown closes, field keeps current text, no re-opening

**Tab Key**:
1. Type partial text → suggestions appear
2. Press **Tab** key to move to next field
3. **Expected**: Dropdown closes, no re-opening, focus moves to next field

**Failure Indicators**:
- ❌ Keyboard selection causes dropdown to re-open (but mouse doesn't)
- ❌ Escape or Tab doesn't close dropdown
- ❌ Save button not enabled after keyboard selection

**Duration**: ~2 minutes per test

---

### Scenario 4: Manual Edit After Selection

**Objective**: Verify user can manually edit description after selecting a suggestion without breaking suggestion functionality.

**Steps**:

1. Open transaction form
2. Type partial text (e.g., "groc")
3. Click suggestion "groceries"
4. **Observe**: Field populates with "groceries", dropdown closes
5. Click back into Description field to focus it
6. Add additional text: " at Whole Foods"
7. **Observe**: Description now reads "groceries at Whole Foods"

**Expected Results**:
- ✅ Manual editing works normally
- ✅ Dropdown does not re-appear when adding text (no matches for "groceries at Whole Foods")
- ✅ If user deletes back to partial match (e.g., "groc"), suggestions re-appear normally
- ✅ Save button remains enabled throughout manual editing

**Additional Test - Partial Re-Match**:
1. Select "coffee"
2. Edit to "coffee w"
3. **Expected**: After debounce, suggestions appear with "coffee with friends" (partial match)
4. Select that suggestion
5. **Expected**: Field populates, dropdown closes, no re-opening

**Failure Indicators**:
- ❌ Cannot edit field after selection
- ❌ Suggestions don't re-appear for legitimate new partial matches
- ❌ Editing breaks form validation

**Duration**: ~2 minutes per test

---

### Scenario 5: Edge Cases

**Objective**: Test boundary conditions and unusual interaction patterns.

#### Edge Case 5a: No Matching Suggestions

**Steps**:
1. Open transaction form
2. Type text with no matches in database (e.g., "zzzzz")
3. **Observe**: No dropdown appears (or empty dropdown with "No suggestions")

**Expected**:
- ✅ No dropdown appears or shows "No suggestions"
- ✅ No errors in console
- ✅ User can continue typing and save form

#### Edge Case 5b: Only One Matching Suggestion

**Steps**:
1. Create test data with a unique description (e.g., "unique description test")
2. In new transaction form, type "unique"
3. **Observe**: Dropdown appears with single suggestion
4. Click that suggestion

**Expected**:
- ✅ Same behavior as multiple suggestions
- ✅ Dropdown closes, no re-opening

#### Edge Case 5c: Rapid Field Switching

**Steps**:
1. Type partial text → suggestions appear
2. Click suggestion
3. **Immediately** click into Amount field or another field

**Expected**:
- ✅ No visual glitches
- ✅ Dropdown closes cleanly
- ✅ Focus moves to next field successfully
- ✅ No console errors

#### Edge Case 5d: Network Delay Simulation

**Steps**:
1. Open Browser DevTools → Network tab
2. Set throttling to "Slow 3G" or equivalent
3. Type partial text → suggestions query starts
4. Click suggestion before query completes
5. **Observe**: Query completes after selection

**Expected**:
- ✅ Dropdown doesn't pop open when slow query finally returns
- ✅ Field remains populated with selected value
- ✅ No visual disruption from late-arriving query results

#### Edge Case 5e: Empty String Selection

**Steps**:
1. Type partial text → suggestions appear
2. Select suggestion
3. Clear entire field (backspace to empty)
4. **Observe**: Field is empty

**Expected**:
- ✅ No suggestions appear for empty field
- ✅ No console errors
- ✅ Save button disabled (empty description is optional, but test form validation)

**Duration**: ~5 minutes for all edge cases

---

### Scenario 6: Cross-Form Consistency

**Objective**: Verify fix applies to all forms using DescriptionAutocomplete component.

**Forms to Test**:
1. **Transaction Form** (create and edit)
2. **Transfer Form** (if it uses description autocomplete)

**Steps** (for each form):
1. Open form
2. Perform Scenario 1 test (basic selection flow)
3. Verify identical behavior across all forms

**Expected**:
- ✅ All forms behave identically
- ✅ No form-specific quirks or regressions

**Duration**: ~3 minutes total

---

## Regression Testing

After fix implementation, verify these existing functionalities still work:

### Debounce Functionality
- ✅ Typing rapidly doesn't trigger API call on every keystroke
- ✅ API call only happens after user pauses typing for ~300ms
- ✅ Network tab shows appropriate request throttling

### Suggestion Matching
- ✅ Partial text matches existing descriptions (case-insensitive)
- ✅ Only unique descriptions appear in suggestions
- ✅ Suggestions update as user types more characters

### Form Validation
- ✅ Save button disabled when required fields are empty
- ✅ Save button enabled when all required fields are filled
- ✅ Form submits successfully after selecting suggestion

### Visual Polish
- ✅ No visual glitches or flashing
- ✅ Dropdown positioning is correct (below field, not overlapping)
- ✅ Hover states work on suggestions
- ✅ Loading spinner appears during query (if visible)

---

## Test Completion Checklist

**Before Merging**:
- [ ] Scenario 1 (Create - Single Selection) - PASS
- [ ] Scenario 2 (Edit - Consistent Behavior) - PASS
- [ ] Scenario 3 (Keyboard Navigation) - PASS
- [ ] Scenario 4 (Manual Edit After Selection) - PASS
- [ ] Scenario 5a-e (All Edge Cases) - PASS
- [ ] Scenario 6 (Cross-Form Consistency) - PASS
- [ ] All Regression Tests - PASS
- [ ] No console errors observed
- [ ] No visual glitches observed
- [ ] Form submission works end-to-end

**Recommended Test Environments**:
- [ ] Chrome/Chromium (primary)
- [ ] Firefox (secondary)
- [ ] Safari (if available)
- [ ] Mobile viewport (Chrome DevTools responsive mode)

---

## Troubleshooting

### Issue: Dropdown still re-opens after selection

**Check**:
1. Verify `justSelected` flag is set in `selectSuggestion` function
2. Verify `watch(showSuggestions)` checks the flag before re-opening
3. Verify flag is reset after preventing re-open
4. Check browser console for any errors

### Issue: Suggestions don't appear at all

**Check**:
1. Verify GraphQL query is running (Network tab)
2. Verify debounce timer is working (should wait 300ms)
3. Check that `showSuggestions` computed is evaluating correctly
4. Verify test data exists in database

### Issue: Keyboard navigation broken

**Check**:
1. Verify `handleKeyDown` function is still being called
2. Verify Enter key also sets `justSelected` flag
3. Check that `selectedIndex` is being updated correctly

---

## Performance Notes

**Expected Performance**:
- Debounce delay: 300ms after user stops typing
- GraphQL query response: <100ms (local development)
- Dropdown open/close: Immediate (<50ms)
- No noticeable lag or jank during any interaction

**If Performance Degrades**:
- Check Network tab for slow queries
- Verify DynamoDB Local is running
- Check for unnecessary re-renders in Vue DevTools
