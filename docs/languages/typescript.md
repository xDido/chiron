---
language: typescript
last_reviewed_against: "5.7"
upstream_version_source:
  type: npm
  package: typescript
---

# TypeScript language pack

Canonical idioms, common pitfalls, mental-model shifts, and challenge seeds for TypeScript. This file is the **human-readable reference** for chiron's TypeScript knowledge base. The content is mirrored into `.claude/skills/challenge/SKILL.md` at runtime for the `/challenge` command's seeded pass.

TypeScript builds on JavaScript — **the idioms and pitfalls in [`javascript.md`](./javascript.md) all apply.** This pack focuses on TypeScript-specific concerns: typing discipline, generics, utility types, narrowing, and the compiler surface.

**Contributors:** when adding idioms or seeds here, also update the corresponding section in `.claude/skills/challenge/SKILL.md`. See [`CONTRIBUTING-LANGUAGE-PACKS.md`](../CONTRIBUTING-LANGUAGE-PACKS.md) for the authoring guide.

---

## Read this first (TypeScript-specific anchors)

Docs chiron points to most often for TypeScript. For general JavaScript, see [`javascript.md`](./javascript.md).

| Primitive | Doc pointer | Used for |
|-----------|-------------|----------|
| TypeScript Handbook | `typescriptlang.org/docs/handbook/intro.html` | The canonical reference |
| Utility Types | `typescriptlang.org/docs/handbook/utility-types.html` | `Partial`, `Required`, `Pick`, `Omit`, `Record`, etc. |
| Generics | `typescriptlang.org/docs/handbook/2/generics.html` | Type parameters, constraints, conditional types |
| Narrowing | `typescriptlang.org/docs/handbook/2/narrowing.html` | Type guards, discriminated unions |
| Modules | `typescriptlang.org/docs/handbook/modules/introduction.html` | `import`/`export` semantics |
| `tsconfig.json` | `typescriptlang.org/tsconfig` | Full compiler options reference |
| `strict` mode | `typescriptlang.org/tsconfig#strict` | The flags that make TypeScript actually useful |
| Type-only imports | `typescriptlang.org/docs/handbook/2/modules.html#importing-types` | `import type { ... }` |
| `satisfies` operator | `typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator` | Type-checked without widening |

**Meta-resources:**

- **TypeScript Deep Dive** — `basarat.gitbook.io/typescript` — free book covering the language in depth
- **type-challenges** — `github.com/type-challenges/type-challenges` — interactive type-level puzzles
- **Effective TypeScript (book)** — Dan Vanderkam — the canonical "how to use TS well" book
- **typescript-eslint rules** — `typescript-eslint.io/rules` — lint rules specific to TypeScript code

---

## Idioms — canonical patterns worth knowing

TypeScript-specific idioms. All JavaScript idioms from [`javascript.md`](./javascript.md) apply equally.

### Type declarations

#### 1. Enable `strict: true` in `tsconfig.json`

**Tag:** `ts:strict-tsconfig`

Non-strict TypeScript is barely better than JavaScript. `"strict": true` turns on a bundle of flags that catch real bugs: `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictPropertyInitialization`, and more.

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "target": "ES2022",
    "module": "NodeNext"
  }
}
```

Also enable `noUncheckedIndexedAccess` — it makes `arr[0]` return `T | undefined` instead of just `T`, forcing you to handle the empty case.

#### 2. `interface` vs `type`

**Tag:** `ts:interface-vs-type`

Use `interface` for object shapes that might be extended. Use `type` for unions, intersections, mapped types, and anything else. Both are mostly interchangeable for simple objects; pick one per project and stick with it.

```ts
interface User {
  id: number;
  name: string;
  email: string;
}

// Can be extended:
interface AdminUser extends User {
  permissions: string[];
}

// Unions need `type`:
type Result<T> = { ok: true; value: T } | { ok: false; error: Error };
```

#### 3. `readonly` for immutability

**Tag:** `ts:readonly`

Mark properties as `readonly` when they shouldn't change after construction. Use `ReadonlyArray<T>` (or `readonly T[]`) for read-only array parameters — the function can't mutate the caller's data.

```ts
interface Config {
  readonly database: string;
  readonly port: number;
}

function sum(nums: readonly number[]): number {
  // nums.push(1);  // error: Property 'push' does not exist on type 'readonly number[]'
  return nums.reduce((a, b) => a + b, 0);
}
```

#### 4. `as const` for literal types

**Tag:** `ts:as-const`

`as const` freezes a value and narrows it to its literal type. Useful for enum-like constants without runtime enum overhead.

```ts
const COLORS = ["red", "green", "blue"] as const;
type Color = typeof COLORS[number];  // "red" | "green" | "blue"

const METHOD_MAP = { GET: "get", POST: "post" } as const;
type Method = keyof typeof METHOD_MAP;  // "GET" | "POST"
```

#### 5. `satisfies` operator (TS 4.9+)

**Tag:** `ts:satisfies`

`satisfies` checks that a value matches a type without widening. Useful for config objects where you want exhaustiveness checking but also want to keep the narrow types for downstream inference.

```ts
type ThemeColors = Record<"primary" | "secondary" | "error", string>;

const theme = {
  primary: "#0070f3",
  secondary: "#7928ca",
  error: "#ff0000",
} satisfies ThemeColors;

// theme.primary has type `string` (from satisfies check)
// but `theme.extra` would be a compile error
```

### Generics

#### 6. Generic functions with constraints

**Tag:** `ts:generic-constraint`

Constrain type parameters with `extends` so the function can use properties of the constraint.

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest("hello", "hi");           // ok: strings have .length
longest([1, 2, 3], [4, 5]);       // ok: arrays have .length
// longest(42, 13);               // error: number has no .length
```

#### 7. Multiple type parameters

**Tag:** `ts:multi-generic`

```ts
function mapBy<T, K extends keyof T>(items: T[], key: K): Map<T[K], T> {
  const result = new Map<T[K], T>();
  for (const item of items) {
    result.set(item[key], item);
  }
  return result;
}

const byId = mapBy(users, "id");  // Map<number, User>
```

#### 8. `keyof` and indexed access

**Tag:** `ts:keyof-indexed-access`

`keyof T` is the union of `T`'s property names. `T[K]` is the type of property `K` on `T`.

```ts
interface User { id: number; name: string; email: string; }
type UserKey = keyof User;              // "id" | "name" | "email"
type UserName = User["name"];           // string

function get<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

### Utility types

#### 9. `Partial`, `Required`, `Readonly`

**Tag:** `ts:partial-required-readonly`

- `Partial<T>` — all properties optional (good for patch-style updates)
- `Required<T>` — all properties required
- `Readonly<T>` — all properties readonly

```ts
function updateUser(id: number, updates: Partial<User>): User { /* ... */ }
const frozenConfig: Readonly<Config> = { ... };
```

#### 10. `Pick`, `Omit`, `Record`

**Tag:** `ts:pick-omit-record`

- `Pick<T, K>` — subset of properties
- `Omit<T, K>` — all properties except the named ones
- `Record<K, V>` — object with keys `K` and values `V`

```ts
type UserSummary = Pick<User, "id" | "name">;
type UserWithoutEmail = Omit<User, "email">;
type UsersById = Record<number, User>;
```

#### 11. `ReturnType` and `Parameters`

**Tag:** `ts:returntype-parameters`

Extract types from function signatures so you don't duplicate them.

```ts
function createUser(name: string, email: string): User { /* ... */ }

type UserResult = ReturnType<typeof createUser>;           // User
type UserArgs = Parameters<typeof createUser>;             // [string, string]
```

### Narrowing

#### 12. Discriminated unions

**Tag:** `ts:discriminated-union`

The canonical "tagged union" pattern. Each variant has a distinguishing literal property; TypeScript narrows on that property automatically.

```ts
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: Error };

function handle<T>(r: Result<T>): T {
  if (r.ok) {
    return r.value;  // TS knows r.value is T
  }
  throw r.error;     // TS knows r.error is Error
}
```

#### 13. Type guards with `is`

**Tag:** `ts:type-guard-is`

Custom type guard functions use the `x is Type` return type annotation.

```ts
function isUser(x: unknown): x is User {
  return (
    typeof x === "object" &&
    x !== null &&
    "id" in x &&
    typeof (x as any).id === "number"
  );
}

if (isUser(data)) {
  console.log(data.name);  // TS knows data is User here
}
```

#### 14. `in` operator for narrowing

**Tag:** `ts:in-operator-narrowing`

`"key" in obj` narrows `obj` to variants that have that key.

```ts
type Animal = Bird | Fish;
interface Bird { fly(): void; feathers: number; }
interface Fish { swim(): void; scales: number; }

function move(a: Animal) {
  if ("fly" in a) { a.fly(); }
  else { a.swim(); }
}
```

#### 15. Exhaustiveness check with `never`

**Tag:** `ts:exhaustive-never`

Use `never` in a default branch so the compiler warns if a new variant is added.

```ts
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.radius ** 2;
    case "square": return s.side ** 2;
    default: {
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}
```

Add a new variant, get a compile error at the default branch. Refactoring safety net.

### Unknown over any

#### 16. `unknown` over `any` for external input

**Tag:** `ts:unknown-over-any`

`any` disables type checking entirely. `unknown` requires narrowing before use. Always prefer `unknown` for JSON, API responses, and `catch (e)`.

```ts
async function loadConfig(path: string): Promise<Config> {
  const raw: unknown = JSON.parse(await readFile(path, "utf-8"));
  if (!isConfig(raw)) {
    throw new Error("invalid config shape");
  }
  return raw;
}
```

#### 17. `catch (e: unknown)` (TS 4.4+)

**Tag:** `ts:catch-unknown`

With `useUnknownInCatchVariables` enabled (part of strict), `catch` parameters are `unknown` by default. Narrow before accessing `.message`.

```ts
try {
  await doWork();
} catch (err) {
  if (err instanceof Error) {
    logger.error(err.message);
  } else {
    logger.error(String(err));
  }
}
```

### Modules

#### 18. `import type` for type-only imports

**Tag:** `ts:import-type`

Type-only imports are erased at compile time — no runtime impact. Use them for types you only reference in annotations.

```ts
import type { User, Post } from "./models";
import { loadUser } from "./api";

function format(user: User, posts: Post[]): string { /* ... */ }
```

#### 19. `export type` for re-exporting types

**Tag:** `ts:export-type`

```ts
export type { User, Post } from "./models";
export { loadUser, savePost } from "./api";
```

### Error types

#### 20. Custom error classes with typed properties

**Tag:** `ts:custom-error-class`

```ts
class NotFoundError extends Error {
  readonly kind = "not_found" as const;
  constructor(public readonly resource: string) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

try {
  await loadUser(id);
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log(`missing: ${err.resource}`);
  }
}
```

### Design patterns

#### 21. Builder pattern with phantom types

**Tag:** `ts:typed-builder`

Use phantom types (type parameters with no runtime effect) to track builder state at the type level.

```ts
interface Empty {}
interface HasHost { host: string; }
interface HasPort { port: number; }

class UrlBuilder<State> {
  private parts: Partial<HasHost & HasPort> = {};

  host(h: string): UrlBuilder<State & HasHost> {
    return Object.assign(this, { parts: { ...this.parts, host: h } });
  }
  port(p: number): UrlBuilder<State & HasPort> {
    return Object.assign(this, { parts: { ...this.parts, port: p } });
  }
  build(this: UrlBuilder<HasHost & HasPort>): string {
    return `http://${(this as any).parts.host}:${(this as any).parts.port}`;
  }
}

new UrlBuilder().host("example.com").port(8080).build();  // ok
// new UrlBuilder().host("example.com").build();          // error: missing port
```

#### 22. Zod / io-ts for runtime validation

**Tag:** `ts:runtime-validation`

Static types are erased. For data crossing the IO boundary (HTTP, JSON files, user input), use a runtime validator that produces TypeScript types.

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});
type User = z.infer<typeof UserSchema>;  // { id: number; name: string; email: string }

function parseUser(raw: unknown): User {
  return UserSchema.parse(raw);  // throws on mismatch
}
```

### Tooling

#### 23. `typescript-eslint` + Prettier in CI

**Tag:** `ts:eslint-prettier-ci`

`typescript-eslint` adds rules that understand the type system (`no-floating-promises`, `no-misused-promises`, `strict-boolean-expressions`, `no-unnecessary-type-assertion`). Run it in CI alongside `tsc --noEmit`.

#### 24. `tsc --noEmit` in CI

**Tag:** `ts:tsc-noemit-ci`

Run `tsc --noEmit` in CI so type errors fail the build. Don't rely on the IDE catching them.

### Strictness dials

#### 25. `noUncheckedIndexedAccess`

**Tag:** `ts:no-unchecked-indexed-access`

With this flag, `arr[0]` is typed `T | undefined` instead of `T`. Forces you to handle the empty case.

```ts
const first = arr[0];  // T | undefined with the flag
if (first !== undefined) { use(first); }
```

#### 26. `exactOptionalPropertyTypes`

**Tag:** `ts:exact-optional-property-types`

Without this flag, `{ name?: string }` is satisfied by `{ name: undefined }` — which is usually a bug. With the flag, `undefined` must be explicit.

#### 27. `noImplicitOverride`

**Tag:** `ts:no-implicit-override`

Requires subclasses to use the `override` keyword when overriding methods. Catches stale overrides after a base class rename.

```ts
class Base { greet(): void { /* ... */ } }
class Derived extends Base {
  override greet(): void { /* ... */ }  // required with the flag
}
```

### Narrow return types

#### 28. `Awaited<T>` for async result types

**Tag:** `ts:awaited-type`

`Awaited<T>` unwraps `Promise<X>` to `X`. Useful when writing generic async helpers.

```ts
function wrap<T>(fn: () => Promise<T>): Promise<Awaited<T>> {
  return fn();
}
```

#### 29. Conditional types for API shaping

**Tag:** `ts:conditional-types`

```ts
type NonEmpty<T extends readonly unknown[]> = T extends readonly [] ? never : T;

function first<T extends readonly unknown[]>(arr: NonEmpty<T>): T[0] {
  return arr[0];
}

first([1, 2, 3]);  // ok
// first([]);      // error: Argument of type '[]' is not assignable to parameter of type 'never'
```

#### 30. Template literal types

**Tag:** `ts:template-literal-types`

```ts
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type ApiEndpoint = `/api/${string}`;
type ApiRoute = `${HttpMethod} ${ApiEndpoint}`;  // "GET /api/...", etc.
```

---

## Common pitfalls (anti-patterns)

Each pitfall has: the bug, why it's bad, the fix, and its tag. All JavaScript anti-patterns from [`javascript.md`](./javascript.md) apply equally.

### Typing pitfalls

#### 1. `any` everywhere

**Tag:** `ts:any-everywhere`

```ts
// BUG: disables type checking
function process(data: any): any {
  return data.items.map((x: any) => x.value);
}
```

**Fix:** use `unknown` for genuinely unknown shapes, or define the actual type.

```ts
interface Data {
  items: Array<{ value: string }>;
}
function process(data: Data): string[] {
  return data.items.map((x) => x.value);
}
```

#### 2. `as` type assertions as escape hatches

**Tag:** `ts:as-assertion-escape`

```ts
// BUG: lies to the compiler; crashes at runtime if wrong
const user = data as User;
```

**Fix:** write a type guard and narrow.

```ts
if (isUser(data)) {
  const user = data;  // narrowed, no assertion
}
```

Exception: `as const`, `as unknown as SomeType` for genuine escape hatches (documented).

#### 3. `@ts-ignore` without explanation

**Tag:** `ts:ts-ignore-no-explanation`

```ts
// BUG: future readers have no idea why
// @ts-ignore
const value = untypedLib.doThing();
```

**Fix:** use `@ts-expect-error` (which errors if the line becomes valid) with a comment explaining why.

```ts
// @ts-expect-error: untyped-lib has no .d.ts; tracked in ISSUE-123
const value = untypedLib.doThing();
```

#### 4. Unsound type assertions with `!` non-null

**Tag:** `ts:non-null-assertion-abuse`

```ts
// BUG: crashes if map.get returns undefined
const user = map.get(id)!;
```

**Fix:** narrow explicitly.

```ts
const user = map.get(id);
if (!user) throw new Error(`user ${id} not found`);
```

#### 5. Disabling `strict` in tsconfig

**Tag:** `ts:strict-disabled`

A `tsconfig.json` with `"strict": false` or partial strict flags gives up most of TypeScript's value.

**Fix:** enable `strict: true` and deal with the errors. Use `// @ts-expect-error` locally if the codebase needs migration.

### Null/undefined pitfalls

#### 6. Not handling `undefined` from optional properties

**Tag:** `ts:optional-undefined-ignored`

```ts
interface User { name: string; email?: string; }
function mail(u: User) { sendTo(u.email); }  // u.email is string | undefined
```

**Fix:** narrow before use.

```ts
function mail(u: User) {
  if (u.email) sendTo(u.email);
}
```

#### 7. `null` vs `undefined` confusion

**Tag:** `ts:null-undefined-confusion`

Mixing `null` and `undefined` for "missing" across a codebase leads to bugs.

**Fix:** pick one convention. Most TypeScript teams prefer `undefined` for uninitialized and optional, reserving `null` for "explicitly empty" (rarely).

### Generic pitfalls

#### 8. Unconstrained generics

**Tag:** `ts:unconstrained-generic`

```ts
// BUG: T is effectively unknown; T[K] is `any`
function get<T, K>(obj: T, key: K) { return obj[key as any]; }
```

**Fix:** constrain.

```ts
function get<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

#### 9. Generics where a concrete type would do

**Tag:** `ts:generic-overuse`

```ts
// BUG: "flexibility" that isn't needed
function loadUser<T extends User>(id: number): Promise<T> { /* ... */ }
```

**Fix:** return `Promise<User>`. The generic adds nothing.

### Enum pitfalls

#### 10. Numeric `enum` with reverse mapping surprises

**Tag:** `ts:numeric-enum`

Numeric enums create both name→value and value→name mappings at runtime, and don't narrow as nicely as literal unions.

**Fix:** use a string union or `as const` objects.

```ts
// Instead of:
// enum Status { Active, Inactive, Pending }

// Prefer:
type Status = "active" | "inactive" | "pending";
// Or:
const Status = { Active: "active", Inactive: "inactive", Pending: "pending" } as const;
type Status = typeof Status[keyof typeof Status];
```

### Import pitfalls

#### 11. Mixing `import` and `require`

**Tag:** `ts:mixed-import-require`

Mixing ESM `import` with CommonJS `require` in the same file defeats the module graph.

**Fix:** use one. Set `"module": "NodeNext"` and use ESM throughout.

#### 12. Runtime imports where a type-only import would do

**Tag:** `ts:runtime-import-for-types`

```ts
// BUG: imports the whole module at runtime just for a type
import { SomeClass } from "./big-module";
function f(x: SomeClass): void { /* ... */ }
```

**Fix:** type-only import.

```ts
import type { SomeClass } from "./big-module";
function f(x: SomeClass): void { /* ... */ }
```

With `verbatimModuleSyntax: true` in `tsconfig`, this becomes mandatory.

### Runtime-type pitfalls

#### 13. Trusting JSON without validation

**Tag:** `ts:json-no-validation`

```ts
// BUG: JSON.parse returns `any`; the type annotation is a lie
const config: Config = JSON.parse(await readFile(path, "utf-8"));
```

**Fix:** validate with Zod, io-ts, or a hand-written type guard.

```ts
const raw: unknown = JSON.parse(await readFile(path, "utf-8"));
const config = ConfigSchema.parse(raw);
```

#### 14. `Function` as a type

**Tag:** `ts:function-as-type`

```ts
// BUG: `Function` is almost the same as `any`
function call(fn: Function) { return fn(); }
```

**Fix:** use a specific function signature.

```ts
function call<T>(fn: () => T): T { return fn(); }
```

### Assertion pitfalls

#### 15. `as unknown as Foo` double-cast

**Tag:** `ts:double-cast`

```ts
// BUG: silences any compile error but the runtime is still broken
const f = something as unknown as Foo;
```

**Fix:** almost always, the code needs a real type guard instead. Reserve double-casts for genuinely unsound but necessary cases (interop), and document why.

### Class pitfalls

#### 16. Missing `override` keyword

**Tag:** `ts:missing-override`

With `noImplicitOverride`, every method intended to override must say so. Without the flag, silent stale overrides survive base-class renames.

**Fix:** enable `noImplicitOverride` and use `override` consistently.

#### 17. Parameter properties obscuring initialization order

**Tag:** `ts:parameter-property-order`

```ts
class User {
  constructor(
    public id: number,
    public name: string,
    public computed = name.toUpperCase(),  // may not work as expected
  ) {}
}
```

**Fix:** assign in the body when there are dependencies.

### Promise pitfalls

#### 18. `Promise<void>` misuse with `no-misused-promises`

**Tag:** `ts:misused-promises`

```ts
// BUG: the async return is ignored by the event handler
element.addEventListener("click", async () => {
  await saveChanges();  // if this throws, the handler doesn't know
});
```

**Fix:** either `void` the promise explicitly or use a sync wrapper that attaches `.catch`.

### Module pitfalls

#### 19. Default exports

**Tag:** `ts:default-export`

Default exports can be renamed at import time, breaking auto-import and making refactors noisier. Named exports are easier to grep.

**Fix:** prefer named exports.

```ts
// Instead of: export default class User { ... }
export class User { ... }
```

#### 20. `index.ts` barrels that re-export everything

**Tag:** `ts:barrel-file-overexport`

Barrel files are fine when small and curated. When they re-export entire directories, they import everything on every build — slowing down compilation and bundlers.

**Fix:** export only the public API. Don't auto-glob.

### Mapped type pitfalls

#### 21. Recursive types with too-deep inference

**Tag:** `ts:deep-type-recursion`

Deeply recursive mapped types (e.g., `DeepPartial<T>`) can hit the compiler's recursion limit or explode compile times.

**Fix:** cap recursion depth, or flatten the type with a specific version.

### Tooling pitfalls

#### 22. Ignoring the output of `tsc --noEmit` in CI

**Tag:** `ts:ignore-tsc-errors`

Skipping type errors in CI is giving up on TypeScript. Type errors are first-class failures.

**Fix:** `tsc --noEmit` must be a required check.

#### 23. Using JS files without `allowJs` + checking

**Tag:** `ts:unchecked-js-files`

Keeping `.js` files around in a TS project, without `allowJs` and `checkJs`, means a chunk of the codebase has no type checks.

**Fix:** enable `allowJs: true` and `checkJs: true`, or convert the files.

#### 24. Relying on `any` from untyped dependencies

**Tag:** `ts:untyped-dep-any`

A dependency without type declarations (or with incomplete ones) becomes a stealth `any` source.

**Fix:** install `@types/<pkg>`, write a local `.d.ts` file, or wrap the dependency in a typed adapter.

#### 25. `noEmit: false` in an output-less project

**Tag:** `ts:accidental-emit`

A TypeScript project that uses a bundler for output but doesn't set `noEmit: true` will write `.js` files next to `.ts` sources, polluting the workspace.

**Fix:** `noEmit: true` unless TSC is the build tool.

---

## Mental-model deltas (for engineers coming from untyped JS or other typed languages)

Things that work differently in TypeScript. Chiron calls these out when they come up in conversation.

1. **TypeScript is a superset, not a runtime.** All types are erased at compile time. Nothing checks types at runtime unless you add a validator.

2. **Types are structural.** Two types with the same shape are compatible, even if they have different names. Unlike Java/C# where nominal typing is the default.

3. **`any` is a leak.** Anywhere `any` appears, type safety around it disappears — including through function boundaries. `unknown` is the safe alternative.

4. **Narrowing is local.** TypeScript tracks narrowed types within a block; the narrowing resets when control flow leaves the block. Function calls can invalidate narrowing (the compiler assumes a function might mutate `this`).

5. **Union types require handling every case.** `x: string | number` can't be passed to a function expecting `string`. Narrow first.

6. **Generics are erased but not gone.** They exist at compile time for type checking and then disappear. Don't try to branch on `T` at runtime.

7. **Declaration files (`.d.ts`) describe types without code.** Used for ambient declarations, third-party library types, and globals.

8. **`interface` merges, `type` doesn't.** Two `interface Foo` declarations in the same scope merge into one. Two `type Foo` declarations are an error.

9. **`tsconfig.json` is the compiler's source of truth.** Every option matters. `strict: true` is the one that makes TypeScript valuable.

10. **Excess property checks on object literals.** `const x: { a: number } = { a: 1, b: 2 }` is an error (extra `b`). Assigning a pre-made object with `b` is fine.

11. **`this` has a type.** Functions can declare `this: SomeType` as the first parameter. Useful for methods attached to prototypes or callbacks that rely on call-time binding.

12. **Assignability vs subtype.** `null` is assignable to `string` without `strictNullChecks`. With it, `null` is its own type. Similar for `undefined`.

13. **Index signatures widen inference.** `type Obj = { [key: string]: unknown }` means every key access returns `unknown`. Prefer specific shapes or `Record<K, V>`.

14. **Conditional types are ternary at the type level.** `T extends U ? X : Y` — TypeScript evaluates this during inference. Powerful for utility types.

15. **Mapped types rewrite every property.** `{ [K in keyof T]: Promise<T[K]> }` turns every property into a promise. The basis for `Partial`, `Readonly`, and friends.

16. **`infer` extracts types inside conditional types.** `T extends (arg: infer A) => unknown ? A : never` extracts the argument type of a function.

17. **Return type inference is good; annotation is still useful.** Infer when the return is obviously derived; annotate public APIs to get better error messages and prevent accidental widening.

18. **Generics at the function signature, not the parameter.** `function f<T>(x: T)` not `function f(x: <T>T)`. Type parameters belong at the function level.

19. **`const` assertions freeze a literal type.** `const x = "hello" as const` gives `x` the type `"hello"`, not `string`.

20. **Never type means "cannot happen."** Useful for exhaustiveness checks, impossible branches, and functions that throw or loop forever.

21. **Structural subtyping with functions uses bivariance by default, contravariance with strict.** `strictFunctionTypes` catches more bugs.

22. **Discriminated unions are the modeling primitive.** Any "tagged enum" from Rust/Swift/Haskell becomes a discriminated union here.

23. **Type predicates (`x is T`) are type guards, not assertions.** The compiler trusts them to be correct — write them carefully.

24. **JSON does not carry types.** `JSON.parse` returns `any` (or `unknown` with careful typing). Always validate at the boundary.

25. **Compile time matters.** Complex generic types can balloon compile time. Profile with `tsc --extendedDiagnostics` if your project gets slow.

---

## Challenge seeds

Each seed is a pre-authored drill that `/challenge` pattern-matches against source code.

**Note:** Many JavaScript seeds from [`javascript.md`](./javascript.md) also apply to TypeScript files. Run `/challenge` on a `.ts` file and both pack's seeds are candidates.

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

---

## Authoring new seeds

When adding a new seed to this pack:

1. **Name it** `ts:<idiom-slug>` — consistent with the profile tag format.
2. **Write the Signal** in prose or pseudo-regex — concrete enough that a reader can verify a match by inspection.
3. **Write the Drill** with Task + Constraint — task is what to change, constraint is what makes it bounded (measurable, finite).
4. **Keep it small.** Drills must be ≤20 lines of change, ≤1 function touched, 5–15 minutes of focused work.
5. **Mirror into `.claude/skills/challenge/SKILL.md`.** The runtime source of truth is the command file; this document is the human-readable mirror and the contribution-PR target.
