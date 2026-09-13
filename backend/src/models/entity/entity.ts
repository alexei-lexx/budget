export type AbstractConstructor<T = object> = abstract new (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => T;

/**
 * Base class for domain entities.
 *
 * @typeParam TData - Plain data shape the entity wraps.
 *
 * @remarks
 * Constructor is public, not private or protected.
 * TypeScript's constructor-access checks don't see mixins
 * as part of the class hierarchy.
 * A restricted constructor would break `Archivable(Versioned(Entity<TData>))`.
 */
export abstract class Entity<TData extends object> {
  protected readonly data: Readonly<TData>;

  static fromPersistence<TData extends object, TEntity extends Entity<TData>>(
    this: new (data: Readonly<TData>) => TEntity,
    data: Readonly<TData>,
  ): TEntity {
    return new this(data);
  }

  constructor(
    data: Readonly<TData>,
    { skipInvariants = false }: { skipInvariants?: boolean } = {},
  ) {
    this.data = { ...data };

    if (!skipInvariants) {
      this.assertInvariants();
    }
  }

  toData(): Readonly<TData> {
    return { ...this.data };
  }

  /**
   * Returns a new instance of the concrete subclass
   * with the given fields overridden,
   * preserving the rest of the current data.
   */
  protected copy<TOptions = { skipInvariants?: boolean }>(
    overrides: Partial<TData>,
    options?: TOptions,
  ): this {
    const Ctor = this.constructor as unknown as new (
      data: Readonly<TData>,
      options?: TOptions,
    ) => this;

    return new Ctor({ ...this.data, ...overrides }, options);
  }

  protected abstract assertInvariants(): void;
}
