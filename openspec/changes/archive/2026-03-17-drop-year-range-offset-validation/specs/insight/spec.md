## REMOVED Requirements

### Requirement: Insight date range years are bounded to current year ± 100

The system SHALL reject insight requests where the start date or end date year falls
outside the range `[currentYear - 100, currentYear + 100]`.

**Reason**: Date values come exclusively from date pickers and preset calculations,
which cannot produce out-of-range year values. The existing start ≤ end and 365-day
cap checks are the meaningful business constraints; the ±100 year bounds check is
redundant.

**Migration**: No client-side action required. The existing 365-day range cap and
start ≤ end validation remain in force.
