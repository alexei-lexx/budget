import { AbstractConstructor, Entity } from "./entity";

export interface VersionedData {
  version: number;
}

/**
 * Mixin adding optimistic-locking version tracking to an Entity.
 *
 * @typeParam TBase - Entity constructor being extended.
 */
export function Versioned<
  TBase extends AbstractConstructor<Entity<VersionedData>>,
>(Base: TBase) {
  abstract class VersionedEntity extends Base {
    get version(): number {
      return this.data.version;
    }

    /**
     * Returns the version this entity will have once persisted.
     */
    nextVersion(): number {
      return this.version + 1;
    }

    /**
     * Returns a new instance with the version incremented by 1.
     */
    bumpVersion(): this {
      return this.copy(
        { version: this.nextVersion() },
        // Version bump leaves all invariant-bearing fields unchanged.
        { skipInvariants: true },
      );
    }

    protected static get versionDefaults(): { version: number } {
      return { version: 0 };
    }
  }

  // TypeScript's inference for `class X extends Base`
  // doesn't retain a generic base's full instantiation
  // through this kind of mixin composition,
  // so it's re-attached explicitly here.
  return VersionedEntity as unknown as TBase & typeof VersionedEntity;
}
