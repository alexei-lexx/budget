import { DateTimeString } from "../../types/date-time-string";
import { AbstractConstructor, Entity } from "./entity";

export interface TimestampedData {
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

/**
 * Mixin adding createdAt/updatedAt tracking to an Entity.
 *
 * @typeParam TBase - Entity constructor being extended.
 */
export function Timestampable<
  TBase extends AbstractConstructor<Entity<TimestampedData>>,
>(Base: TBase) {
  abstract class TimestampableEntity extends Base {
    get createdAt() {
      return this.data.createdAt;
    }

    get updatedAt() {
      return this.data.updatedAt;
    }
  }

  // TypeScript's inference for `class X extends Base`
  // doesn't retain a generic base's full instantiation
  // through this kind of mixin composition,
  // so it's re-attached explicitly here.
  return TimestampableEntity as unknown as TBase & typeof TimestampableEntity;
}
