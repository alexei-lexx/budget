# Code Style

### TypeScript Code Generation

All generated or manually written TypeScript code MUST adhere to strict type safety and code quality standards.

- Avoid non-null assertions (`!`) unless absolutely necessary
  - Document the reason when used
- Avoid type assertions (`as any`) unless absolutely necessary
  - Document the reason when used
- Avoid unnecessary type checks (`typeof`, non-null checks, non-undefined checks) when the provided type is explicit and doesn't require such checks
- Use descriptive names for all variables, methods, parameters, and types
  - Avoid single-character names (except standard loop indices: `i`, `j`, `k`)
  - Avoid abbreviated forms that obscure meaning
  - Avoid shortened versions (e.g., use `user` instead of `usr`, `transaction` instead of `tx`)
  - Keep names concise while prioritizing clarity over brevity
- Use the following arguments rules
  - For functions with 0–2 arguments, use positional arguments for simplicity
  - For functions with 3 or more arguments, use keyword arguments (object destructuring)
- Enum-like values MUST be modeled as `as const` string-union types, not TypeScript `enum`
  - Members MUST use UPPER_CASE
  - Members MUST be either sorted alphabetically or follow a meaningful order (e.g. a workflow sequence)

### Finder Method Naming

Finder method names MUST encode cardinality and error behavior.

**Prefixes**:

- `findOne` — returns a single instance or `null` if not found
- `findMany` — returns an array of instances (empty array when nothing matches, never `null`)
- `get` — returns a single instance and throws if not found (use when absence is a program error)

Callers know from the method name alone whether to handle `null`, iterate a collection, or catch a thrown error — without reading the return type or implementation.

### Method Ordering

Methods within a class MUST follow a consistent ordering that exposes the public API first and places higher-level logic above the details it depends on.

**Rules** (listed by priority — earlier rules take precedence over later ones):

1. **Public before private**
   - All public methods MUST appear before all private methods
2. **Reads before writes** (CRUD classes only)
   - Reads MUST come before writes
   - Reads (in order): find one, find many, other reads (aggregations, calculations)
   - Writes (in order): create one, create many, update one, update many, delete one/archive one, delete many/archive many
3. **Stepdown Rule**
   - Caller MUST appear above the methods it calls

**Test files**: `describe` blocks MUST mirror the method order of the source class.

Consistent ordering makes the public API immediately visible, places non-mutating operations before mutations, and keeps test files predictably aligned with their source.
