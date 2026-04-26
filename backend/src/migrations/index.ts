/**
 * Migration Registry
 *
 * This file explicitly exports all migration modules.
 * Add new migrations here manually using the pattern:
 *   export * as migration_YYYYMMDDHHMMSS from "./YYYYMMDDHHMMSS-description";
 *
 * The timestamp must match the filename for proper loading.
 */

export * as migration_20250101000000 from "./20250101000000-example-count-categories";
export * as migration_20250101000100 from "./20250101000100-example-update-categories";
export * as migration_20251207120000 from "./20251207120000-remove-null-descriptions";
export * as migration_20251207120100 from "./20251207120100-remove-null-category-ids";
export * as migration_20251210152507 from "./20251210152507-populate-created-at-sortable";
export * as migration_20251230120000 from "./20251230120000-remove-auth0-user-id";
export * as migration_20260119201355 from "./20260119201355-add-exclude-from-reports";
export * as migration_20260423093628 from "./20260423093628-add-transaction-version";
export * as migration_20260425213107 from "./20260425213107-add-account-version";
