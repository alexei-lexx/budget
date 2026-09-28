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
