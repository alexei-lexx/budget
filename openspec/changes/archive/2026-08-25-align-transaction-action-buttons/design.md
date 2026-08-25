## Context

Transactions.vue currently switches its header buttons from icon-only to labeled text at 960px (Vuetify's `md` breakpoint), using `d-none d-md-flex` / `d-flex d-md-none` pairs. Every other page with a header action button (Accounts, Categories) switches at 600px (`sm`), using `d-none d-sm-flex` / `d-flex d-sm-none`. See proposal.md - Why.

The 960px threshold on Transactions was deliberately introduced (see `2acbcb33`, "fix button overflow on tablet viewports #189") because Transactions has three header buttons (Filter, Add Transaction, Add Transfer) versus one on Accounts/Categories, and three labeled buttons overflowed the header at 600px.

## Goals / Non-Goals

**Goals:**

- Make Transactions switch to labeled buttons at the same 600px threshold as the rest of the app.
- Keep all three buttons visible and functional at every width, without introducing a new interaction pattern (menu, dialog) not used elsewhere in the header.

**Non-Goals:**

- Redesigning the header action bar's visual style (colors, button variants) - out of scope.
- Changing behavior on Accounts, Categories, or any other page - they already use the target breakpoint.
- Solving overflow for a hypothetical fourth header button - only the current three are considered.

## Decisions

**Wrap the button row onto a second line at 600px, instead of an overflow menu or shrinking the buttons.**

Considered alternatives:

- **Overflow/kebab menu** - keep "Add Transaction" as the one always-visible button, move Filter and Add Transfer behind a menu below 960px. Rejected: hides two of three actions behind an extra tap on tablet, and introduces a menu pattern the rest of the app's headers don't use.
- **Compact/smaller buttons** - use a denser button size so three labeled buttons fit in one row at 600px. Rejected: the combined label width ("Filter", "Add Transaction", "Add Transfer" plus icons and padding) does not reliably fit a ~600px container even at reduced density; this was the exact failure mode `#189` fixed, so it is not confirmed safe.
- **Wrap to a second line (chosen)** - let the existing `d-flex` header row wrap via CSS `flex-wrap` when it runs out of horizontal space. Every button keeps its label, no new component or interaction pattern, and the fix is a small, local change to Transactions.vue.

This mirrors the existing `flex-column flex-sm-row` wrap already used for the header row on narrow (< 600px) screens, extended to the button group itself for the 600-959px range where three buttons may not fit one row.

## Risks / Trade-offs

- [The three buttons wrapped onto two lines increases header height by roughly one button row on some tablet widths] → Acceptable: the page previously carried the same or more height at narrower widths with icon-only buttons stacked via `flex-column`; wrapping is a modest, expected trade-off for label consistency, not a regression.
- [Exact wrap point depends on real rendered button widths, not a fixed pixel value] → Verify visually in the browser at 600-960px during implementation, per constitution's "Test manually (visual verification in dev)" frontend test strategy.

## Constitution Compliance

- **UI Guidelines** (mobile-first, responsive across screen sizes): Applies. The chosen approach keeps every button visible and usable at all widths. Compliant.
- **Frontend Code Discipline** (prefer framework components/styles, minimize custom CSS): Applies. `flex-wrap` is a standard Vuetify/Vuetify-grid utility class already used elsewhere in this file (`flex-column flex-sm-row`); no custom CSS needed. Compliant.
- **Test Strategy** (frontend: manual visual verification): Applies. No automated frontend test is required; verify the wrap visually across the 600-960px range. Compliant.
