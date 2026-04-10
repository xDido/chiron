# TypeScript language pack (inlined)

This is the runtime source of truth for chiron's TypeScript knowledge. The canonical human-readable explanation of each idiom and anti-pattern lives at `docs/languages/typescript.md`. **TypeScript files also match JavaScript seeds** — consult both packs when running `{{command_prefix}}challenge` on a `.ts`/`.tsx` file.

## TypeScript idiom tag list (for eyeball fallback reference)

### Type declarations

- `ts:strict-tsconfig` — `"strict": true` in `tsconfig.json`
- `ts:interface-vs-type` — `interface` for object shapes, `type` for unions/intersections
- `ts:readonly` — `readonly` fields and `ReadonlyArray<T>` parameters
- `ts:as-const` — `as const` for literal types
- `ts:satisfies` — `satisfies` operator to check without widening (TS 4.9+)

### Generics

- `ts:generic-constraint` — constrain type parameters with `extends`
- `ts:multi-generic` — multiple type parameters
- `ts:keyof-indexed-access` — `keyof T` and `T[K]`

### Utility types

- `ts:partial-required-readonly` — `Partial`, `Required`, `Readonly`
- `ts:pick-omit-record` — `Pick`, `Omit`, `Record`
- `ts:returntype-parameters` — `ReturnType` and `Parameters`

### Narrowing

- `ts:discriminated-union` — tagged unions with a literal discriminant field
- `ts:type-guard-is` — custom type guards with `x is Type`
- `ts:in-operator-narrowing` — `"key" in obj` narrowing
- `ts:exhaustive-never` — `never` default branch for exhaustiveness

### Unknown over any

- `ts:unknown-over-any` — `unknown` for external input
- `ts:catch-unknown` — `catch (e: unknown)` with narrowing

### Modules

- `ts:import-type` — `import type` for type-only imports
- `ts:export-type` — `export type` for re-exporting types

### Error types

- `ts:custom-error-class` — subclasses with typed properties

### Runtime validation

- `ts:runtime-validation` — Zod/io-ts for data crossing the I/O boundary

### Tooling

- `ts:eslint-prettier-ci` — typescript-eslint + Prettier in CI
- `ts:tsc-noemit-ci` — `tsc --noEmit` in CI

### Strict dials

- `ts:no-unchecked-indexed-access` — makes `arr[0]` return `T | undefined`
- `ts:exact-optional-property-types` — `{x?: T}` rejects `{x: undefined}`
- `ts:no-implicit-override` — `override` keyword required

### Advanced types

- `ts:awaited-type` — `Awaited<T>` for promise unwrapping
- `ts:conditional-types` — `T extends U ? X : Y`
- `ts:template-literal-types` — template literal type construction
- `ts:typed-builder` — builders with phantom types

## TypeScript challenge seeds

### `ts:any-everywhere`

**Signal:** A file contains 3+ explicit uses of `any` as a type annotation (parameters, return types, variables, casts).

**Drill:**
- **Task:** replace at least half of the `any` uses with `unknown`, a proper type, or a Zod/type-guard validator.
- **Constraint:** no runtime behavior change; at least one `unknown` must be narrowed via a type guard before use.

### `ts:as-assertion-escape`

**Signal:** A `value as SomeType` assertion in a context where the source is `unknown`, `any`, or a function return, and the target is a domain type (not a narrowing within a union).

**Drill:**
- **Task:** replace the assertion with a type guard function or runtime validator; narrow instead of assert.
- **Constraint:** the cast is gone; the new code path rejects invalid input at runtime with a clear error.

### `ts:non-null-assertion-abuse`

**Signal:** A `!` non-null assertion on a value that is genuinely `T | undefined` — map lookups, array indexing, optional chaining results.

**Drill:**
- **Task:** narrow the value explicitly with an `if (x === undefined) throw ...` or similar guard.
- **Constraint:** no `!` assertion remains on that path; the missing case is handled with a clear error.

### `ts:ts-ignore-no-explanation`

**Signal:** `@ts-ignore` comment without an adjacent explanation comment or tracking reference.

**Drill:**
- **Task:** replace with `@ts-expect-error` and add a comment explaining why.
- **Constraint:** the new form will error if the underlying TS error becomes valid — helps the team notice when the ignore is no longer needed.

### `ts:unconstrained-generic`

**Signal:** A function generic `<T>` whose body uses `obj[key]` or `.length` or other property access without constraining `T`.

**Drill:**
- **Task:** add a constraint like `T extends { length: number }` or `K extends keyof T`.
- **Constraint:** the constrained version compiles; the unconstrained version produced `any`-typed property access.

### `ts:discriminated-union`

**Signal:** A union of object types without a shared discriminant field (e.g., `type X = { value: string } | { error: Error }` — narrowing requires checking for key existence each time).

**Drill:**
- **Task:** add a `kind` (or similar) discriminant field to each variant; update consumers to narrow on `kind`.
- **Constraint:** narrowing becomes a simple `switch (x.kind)` — no more `"error" in x` checks.

### `ts:exhaustive-never`

**Signal:** A `switch` over a discriminated union that covers all current variants but has no exhaustive default branch.

**Drill:**
- **Task:** add a `default: { const _e: never = value; return _e; }` branch (or equivalent).
- **Constraint:** adding a new variant must cause a compile error in this function.

### `ts:strict-disabled`

**Signal:** A `tsconfig.json` with `"strict": false`, or missing, or one or more individual strict flags disabled.

**Drill:**
- **Task:** enable `strict: true`. Fix the first wave of errors that appear (narrow/propagate, don't silence).
- **Constraint:** `tsc --noEmit` must pass after the change; no new `any`, `@ts-ignore`, or `!` assertions introduced.

### `ts:catch-unknown`

**Signal:** A `catch (e)` clause where `e` is used as `e.message` or `e.name` without narrowing.

**Drill:**
- **Task:** narrow with `if (e instanceof Error) { ... } else { ... }` before accessing `.message`.
- **Constraint:** `catch (e)` (or `catch (e: unknown)`) must not reference `.message` or other `Error` methods without narrowing.

### `ts:json-no-validation`

**Signal:** `JSON.parse(...)` result assigned to a typed variable via annotation or `as`, without validation.

**Drill:**
- **Task:** parse as `unknown` and validate with a type guard function or Zod schema.
- **Constraint:** the declared type is only reached after runtime validation; invalid input produces a clear error.

### `ts:partial-required-readonly`

**Signal:** A function parameter `Patch<User>`-shaped as `{ id?: number; name?: string; ... }` manually written out instead of using `Partial<User>`.

**Drill:**
- **Task:** replace the manual all-optional type with `Partial<User>`.
- **Constraint:** every field optional, no duplication of field definitions.

### `ts:import-type`

**Signal:** A module's `import { X, Y, Z } from "..."` statement where X and Z are only used in type positions (parameters, returns, generics) but Y is used at runtime.

**Drill:**
- **Task:** split into `import type { X, Z } from "..."` and `import { Y } from "..."`.
- **Constraint:** no runtime import of type-only names; bundler should strip X and Z from the output.

### `ts:default-export`

**Signal:** A module with a `export default class X { ... }` or `export default function X() {}` and no named exports.

**Drill:**
- **Task:** convert to a named export.
- **Constraint:** imports must update to `import { X } from "..."`; no renaming at the import site.

### `ts:numeric-enum`

**Signal:** A `enum Foo { A, B, C }` definition (numeric enum, default values).

**Drill:**
- **Task:** replace with a string union or `as const` object.
- **Constraint:** runtime behavior preserved; the new form narrows cleanly in discriminated unions.

### `ts:as-const`

**Signal:** A mutable const array/object literal used as a source of literal types via `typeof arr[number]` that widens to `string` or `number`.

**Drill:**
- **Task:** add `as const` to freeze the literal types.
- **Constraint:** the derived type narrows from `string` to the exact literal union; the const itself is readonly.

### `ts:type-guard-is`

**Signal:** A function that checks a value's shape at runtime and returns `boolean`, used in an `if` block whose body requires narrowing — but the function is not declared with an `x is Type` predicate.

**Drill:**
- **Task:** change the return type annotation from `boolean` to `value is SomeType`.
- **Constraint:** consumers no longer need an `as` cast after the check; narrowing flows automatically.

### `ts:no-unchecked-indexed-access`

**Signal:** A `tsconfig.json` with `strict: true` but `noUncheckedIndexedAccess: false` (or unset), AND code that accesses arrays/records via index without null checks.

**Drill:**
- **Task:** enable `noUncheckedIndexedAccess: true` in tsconfig; fix the resulting errors by narrowing each unchecked access.
- **Constraint:** `tsc --noEmit` passes; no `!` non-null assertions introduced as a workaround.

