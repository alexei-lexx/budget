import * as migrations from "../index";
import { Migration, MigrationModule } from "../types";

/**
 * Load all migrations from index.ts
 *
 * Reads migrations/index.ts exports and extracts migration metadata.
 * Sorts migrations by timestamp (chronological order).
 *
 * @returns Array of migrations sorted by timestamp
 * @throws Error if any migration has invalid structure
 */
export function loadMigrations(): Migration[] {
  const migrationList: Migration[] = [];

  for (const [key, module] of Object.entries(migrations)) {
    if (!key.startsWith("migration_")) {
      continue;
    }

    const timestamp = key.replace("migration_", "");
    const description = extractDescription(timestamp);

    if (!isValidMigrationModule(module)) {
      throw new Error(
        `Invalid migration module for timestamp ${timestamp}: missing required 'up' function.`,
      );
    }

    migrationList.push({
      timestamp,
      description,
      up: module.up,
    });
  }

  migrationList.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return migrationList;
}

/**
 * Validate migration module structure
 *
 * Ensures migration exports required `up` function.
 *
 * @param module - Migration module to validate
 * @param timestamp - Migration timestamp (for error messages)
 * @returns True if module is a valid MigrationModule, false otherwise
 */
export function isValidMigrationModule(
  module: unknown,
): module is MigrationModule {
  return (
    !!module &&
    typeof module === "object" &&
    "up" in module &&
    typeof module.up === "function"
  );
}

/**
 * Extract description from timestamp
 * This is a placeholder - in real implementation, description comes from filename
 *
 * @param timestamp - Migration timestamp
 * @returns Migration description
 */
function extractDescription(timestamp: string): string {
  return `migration-${timestamp}`;
}
