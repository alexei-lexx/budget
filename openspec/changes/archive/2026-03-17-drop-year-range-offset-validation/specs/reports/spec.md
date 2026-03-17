## REMOVED Requirements

### Requirement: Year input is bounded to current year ± 100

The system SHALL reject report requests where the year parameter falls outside the
range `[currentYear - 100, currentYear + 100]`.

**Reason**: Year values come exclusively from date pickers, which cannot produce
out-of-range values. `Number.isInteger(year)` is sufficient and meaningful; the ±100
bounds check is redundant and unsupported by any business rule.

**Migration**: No client-side action required. The API now accepts any integer year.
