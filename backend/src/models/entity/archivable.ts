import {
  DateTimeString,
  currentDateTimeString,
} from "../../types/date-time-string";
import { ModelError } from "../model-error";
import { AbstractConstructor, Entity } from "./entity";

export interface ArchivableData {
  isArchived: boolean;
  updatedAt: DateTimeString;
}

/**
 * Mixin adding soft-deletion to an Entity:
 * archiving, and a guard against mutating an already-archived record.
 *
 * @typeParam TBase - Entity constructor being extended.
 */
export function Archivable<
  TBase extends AbstractConstructor<Entity<ArchivableData>>,
>(Base: TBase) {
  abstract class ArchivableEntity extends Base {
    get isArchived(): boolean {
      return this.data.isArchived;
    }

    archive(): this {
      this.assertNotArchived();

      return this.copy({
        isArchived: true,
        updatedAt: currentDateTimeString(),
      });
    }

    /**
     * Guards mutating operations (archive, update) against archived records.
     */
    protected assertNotArchived(): void {
      if (this.isArchived) {
        throw new ModelError("Cannot modify an archived record");
      }
    }

    protected static get archivableDefaults(): { isArchived: boolean } {
      return { isArchived: false };
    }
  }

  // TypeScript's inference for `class X extends Base`
  // doesn't retain a generic base's full instantiation
  // through this kind of mixin composition,
  // so it's re-attached explicitly here.
  return ArchivableEntity as unknown as TBase & typeof ArchivableEntity;
}
