import { MigrationModule } from "../types";
import { isValidMigrationModule, loadMigrations } from "./loader";

describe("Migration Loader Operations", () => {
  describe("isValidMigrationModule", () => {
    it("should return true for valid migration module", () => {
      const validModule: MigrationModule = {
        up: async () => {
          return;
        },
      };

      expect(isValidMigrationModule(validModule)).toBe(true);
    });

    it("should return false when up function is missing", () => {
      const invalidModule = {};

      expect(isValidMigrationModule(invalidModule)).toBe(false);
    });

    it("should return false when up is not a function", () => {
      const invalidModule = { up: "not a function" };

      expect(isValidMigrationModule(invalidModule)).toBe(false);
    });

    it("should return false for null module", () => {
      expect(isValidMigrationModule(null)).toBe(false);
    });

    it("should return false for undefined module", () => {
      expect(isValidMigrationModule(undefined)).toBe(false);
    });
  });

  describe("loadMigrations", () => {
    it("should load and sort migrations by timestamp", () => {
      const migrations = loadMigrations();

      expect(migrations.length).toBeGreaterThanOrEqual(0);

      for (let i = 1; i < migrations.length; i++) {
        expect(
          migrations[i].timestamp.localeCompare(migrations[i - 1].timestamp),
        ).toBeGreaterThan(0);
      }
    });

    it("should extract timestamp from migration key", () => {
      const migrations = loadMigrations();

      for (const migration of migrations) {
        expect(migration.timestamp).toMatch(/^\d{14}$/);
      }
    });

    it("should extract description from migration key", () => {
      const migrations = loadMigrations();

      for (const migration of migrations) {
        expect(migration.description).toBeTruthy();
        expect(migration.description.length).toBeGreaterThan(0);
      }
    });

    it("should include up function for each migration", () => {
      const migrations = loadMigrations();

      for (const migration of migrations) {
        expect(typeof migration.up).toBe("function");
      }
    });
  });
});
