# Code Style

Apply these rules to all code.
This includes generated code and code written manually.

## TypeScript: Type Safety

- Avoid non-null assertions (`!`) unless necessary
  - Allowed for an array index (or similar) that other code proves to be in bounds, because TypeScript can't track that proof
  - Document the reason
- Avoid type assertions (`as any`) unless necessary
  - Document the reason when used
- Avoid type checks (`typeof`, non-null checks, non-undefined checks) that the declared type makes unnecessary

## TypeScript: Enum-Like Values

- Enum-like values MUST use `as const` string-union types, not TypeScript `enum`
- Members MUST use UPPER_CASE
- Members MUST be in alphabetical order or in a meaningful order (for example, a workflow sequence)

## Naming

- Use descriptive names for variables, methods, parameters, and types
- Avoid single-character names, except loop indices `i`, `j`, `k`
- Avoid abbreviations that hide meaning (for example, use `user`, not `usr`, and `transaction`, not `tx`)
- Keep names short, but put clarity first

## Function and Method Arguments

- For functions and methods with 0–2 arguments, use positional arguments
- For functions and methods with 3 or more arguments, use keyword arguments (object destructuring)
- For functions and methods with an optional argument that is not last, use keyword arguments

## Finder Method Naming

Finder method names MUST show cardinality and error behavior.

**Prefixes**:

- `findOne` — returns one instance, or `null` if not found
- `findMany` — returns an array of instances (empty if nothing matches, never `null`)
- `get` — returns one instance and throws if not found (use when absence is a program error)

## Method Ordering

Methods in a class MUST follow a consistent order.

**Rules** (in priority order; earlier rules override later ones):

1. All public methods MUST come before all private methods
2. Reads MUST come before writes (CRUD classes only)
   - Reads, in order: find one, find many, other reads (aggregations, calculations)
   - Writes, in order: create one, create many, update one, update many, archive one, archive many, delete one, delete many
3. A caller MUST come above the methods it calls (Stepdown Rule)

**Test files**: `describe` blocks MUST follow the method order of the source class.

## Comments

- Break lines at punctuation or logical boundaries, not mid-phrase
  - For example, keep an adjective on the same line as its noun
- Prefer short sentences over long compound ones
- Comment lines MUST NOT exceed the project's line-length limit
