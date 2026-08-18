## Why

Expanded transaction cards break at intermediate viewport widths: the description column narrows below what the text needs, wrapping it into a tall, cramped block beside the action buttons. Independently of width, any description long enough to wrap onto multiple lines leaves the vertically-centered action buttons floating mid-paragraph next to line two or three of the text. Both are consequences of laying description and actions side by side in a row that must share width and vertical alignment with a variable-height wrapped paragraph.

## What Changes

- Expanded transaction card layout changes from side-by-side (description left, actions right) to stacked (description on top, actions in their own row below), at every screen size — no responsive row/column switch.
- Action buttons are right-aligned below the description.
- Removes the `sm`-breakpoint-driven row layout in `TransactionCard.vue` in favor of a single always-stacked layout, eliminating both the narrow-viewport squeeze and the long-description misalignment.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `transactions`: the "Expandable Transaction Cards" requirement's scenario describing the expanded layout changes from "description on the left and edit/delete buttons on the right" to description above and action buttons below.

## Impact

- `frontend/src/components/transactions/TransactionCard.vue` — expanded-state layout markup/classes.
- No API, schema, or backend changes.

## Constitution Compliance

- **UI Guidelines** (mobile-first, responsive across all screen sizes): a single always-stacked layout is inherently consistent across sizes rather than relying on a breakpoint switch — compliant.
- **Frontend Code Discipline** (prefer framework components/styles, minimize custom CSS): change removes responsive utility classes rather than adding custom CSS — compliant.
- **Schema-Driven Development**, **Backend Layer Structure**, **Result Pattern**, etc.: not applicable — no backend or schema changes.
- No other constitution principles apply to this frontend-only layout change.
