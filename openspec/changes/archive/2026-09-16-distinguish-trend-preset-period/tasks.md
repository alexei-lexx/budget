## Code Style

Follow [docs/code-style.md](../../../docs/code-style.md) during implementation.

## 1. Color computation

- [x] 1.1 (use `testing` skill) Write failing tests for the period-phrase pill's color computation in `TrendPresetsList.vue`: hue is teal for `WEEK` and rose for `MONTH`; within a hue, the entry with the smallest `lookback` in that hue's currently-rendered group gets the faintest tint and the entry with the largest gets the strongest; a hue group with a single visible entry renders the strongest tint; a hue group where every visible entry shares the same `lookback` (min equals max) also renders the strongest tint; the faintest and strongest computed lightness values both stay within the clamped, legible range (design.md - "Lightness scales with lookback").
- [x] 1.2 Implement a computed per-entry background-color (hue by `periodUnit`, lightness relative and clamped per hue) in `TrendPresetsList.vue`, deriving each hue's min/max `lookback` from `sortedTrendPresets` filtered by `periodUnit`.
- [x] 1.3 Run `npm test -- TrendPresetsList` in `frontend/` and confirm the new tests pass.

## 2. Label restructuring and rendering

- [x] 2.1 (use `testing` skill) Write failing tests asserting the period-phrase substring (e.g. "6 weeks", "3 months") renders inside its own element carrying the computed background-color style, while the rest of the label text, the chip's outlined shell, and the amber star icon are unchanged.
- [x] 2.2 Split `formatEntry()` into prefix / period-phrase / suffix pieces and update the template to wrap the period-phrase in a `<span>` bound to the computed background-color style from task 1.2.
- [x] 2.3 Run `npm test -- TrendPresetsList` in `frontend/` and confirm all tests pass with no regressions.

## 3. Manual verification

- [x] 3.1 On the Trends page, star multiple Week presets with different lookbacks (e.g. 3, 6, 12) and confirm their period-phrase pills render teal with visibly increasing tint from faintest (lookback 3) to strongest (lookback 12).
- [x] 3.2 Star multiple Month presets with different lookbacks and confirm their period-phrase pills render rose with the same faintest-to-strongest progression.
- [x] 3.3 Star a single Week preset with no other Week presets starred and confirm its pill renders the strongest teal tint.
- [x] 3.4 Confirm the chip's outlined shell, amber star icon, label wording, list ordering, and click-to-apply behavior are all unchanged from before this change.
- [x] 3.5 Confirm the period-phrase pill stays legible at both ends of the range - the faintest tint still reads as a visible pill against the chip's white background, and the strongest tint still leaves the label text readable - at both desktop and mobile widths.

## 4. Validation

- [x] 4.1 Run `npm run typecheck` and `npm run format` in `frontend/`; fix any issues.

## Constitution Compliance

- **Test Strategy**: frontend tests are optional per the constitution; this task list adds targeted tests for the pill's color computation (section 1) because it has real edge-case logic - relative min/max scaling, clamping, and singleton/degenerate groups - that's cheap to test and easy to get subtly wrong. Everything else (label restructuring, visual result) is verified manually per section 3.
- **Frontend Code Discipline**: satisfied with the narrow, already-scoped exception from proposal.md/design.md - one small bound inline `style` on the period-phrase span for the computed hue/lightness, since Vuetify's `color` prop can't express it. No new CSS files or classes.
- **Code Quality Validation**: tasks 1.3, 2.3, and 4.1 follow the mandated test → typecheck/lint pipeline before completion.

No other constitution principles apply - this is a frontend-only visual change with no schema, backend, or data-layer impact.
