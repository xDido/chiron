# JavaScript language pack

This is the runtime source of truth for chiron's JavaScript knowledge. The canonical human-readable explanation of each idiom and anti-pattern lives at `docs/languages/javascript.md`. These seeds also apply to TypeScript files (`.ts`, `.tsx`).

## JavaScript idiom tag list (for eyeball fallback reference)

### Variables and scope

- `js:const-by-default` — `const` unless reassigned; never `var`
- `js:arrow-function` — arrow functions for callbacks with lexical `this`
- `js:destructuring-params` — destructure objects in function signatures
- `js:default-params` — native default parameter syntax

### Arrays and objects

- `js:array-methods` — `.map/.filter/.reduce/.find` over `for` loops
- `js:spread-copy` — `[...arr]` / `{...obj}` for shallow copies
- `js:destructuring-assignment` — destructuring with defaults and rest patterns
- `js:optional-chaining` — `?.` for safe deep property access
- `js:nullish-coalescing` — `??` for null/undefined defaults
- `js:computed-property` — `{ [key]: value }` for dynamic keys

### Async

- `js:async-await` — `async/await` over `.then` chains
- `js:promise-all` — `Promise.all` for parallel work
- `js:promise-all-settled` — `Promise.allSettled` for partial failures
- `js:try-catch-await` — `try/catch` around `await`
- `js:abort-controller` — `AbortController` for cancellation

### Strings

- `js:template-literal` — backticks with `${}` over concatenation
- `js:string-includes` — `.includes(...)` over `.indexOf(...) !== -1`

### Modules and iteration

- `js:esm-imports` — ES modules over CommonJS
- `js:for-of` — `for...of` over `for...in` for arrays

### Data modeling

- `js:map-over-object` — `Map` for dynamic key-value stores
- `js:set-uniqueness` — `Set` for uniqueness and membership
- `js:object-freeze` — `Object.freeze` for immutable config

### Errors

- `js:custom-error-class` — `Error` subclasses with `.name`
- `js:error-cause` — `new Error(msg, { cause: err })` for wrapping

### Node-specific

- `js:fs-promises` — `node:fs/promises` over callback `fs`
- `js:path-join` — `path.join` / `path.resolve` for filesystem paths
- `js:graceful-shutdown` — SIGINT/SIGTERM signal handlers

### Tooling

- `js:strict-equality` — `===` / `!==` by default
- `js:eslint-prettier-ci` — ESLint + Prettier in CI
- `js:structured-logging` — `pino`/`winston` in services, not `console.log`

## JavaScript challenge seeds

### `js:var-in-new-code`

**Signal:** `var` declaration in a file that does not exclusively target legacy browsers (ES5-only projects are the exception).

**Drill:**
- **Task:** replace `var` with `const` (default) or `let` (if reassigned).
- **Constraint:** no behavior change; hoisting semantics change but must not affect the observable result — verify with a quick read of the block scope.

### `js:loose-equality`

**Signal:** `==` or `!=` comparison anywhere except `x == null` (the single legitimate use, which checks both `null` and `undefined`).

**Drill:**
- **Task:** replace with `===` or `!==`.
- **Constraint:** no behavior change for the intended path; any existing reliance on coercion must be made explicit.

### `js:or-truthiness-trap`

**Signal:** `x || defaultValue` pattern where `x` could legitimately be `0`, `""`, or `false` as a valid value.

**Drill:**
- **Task:** replace with `??` (nullish coalescing).
- **Constraint:** the fallback must only trigger when `x` is `null` or `undefined`, not on any falsy value.

### `js:callback-hell`

**Signal:** 3+ nested callbacks, each handling an error case.

**Drill:**
- **Task:** rewrite using `async/await`, with errors handled in a single `try/catch`.
- **Constraint:** no behavior change; the error path must still propagate.

### `js:serial-await`

**Signal:** Multiple `await` statements in a function where the awaited expressions are independent (no data flow from one to the next).

**Drill:**
- **Task:** collect the promises and `await Promise.all([...])`.
- **Constraint:** the results must be destructured in the same order; error handling must still work.

### `js:forgotten-await`

**Signal:** A call to a function declared `async` (or known to return a Promise) whose result is used as a plain value — e.g., `.name` on the result, pass to a sync function, or implicit return of a Promise from a non-async context.

**Drill:**
- **Task:** add `await` and, if needed, make the enclosing function `async`.
- **Constraint:** no dangling unhandled promises; callers of the enclosing function should still work.

### `js:for-in-array`

**Signal:** `for (const key in arrayVariable)` where the target is an array.

**Drill:**
- **Task:** replace with `for (const item of arrayVariable)` or an array method (`.forEach`, `.map`).
- **Constraint:** no prototype-key leakage; iteration covers all array elements exactly once.

### `js:array-methods`

**Signal:** A `for` loop that pushes into a result array based on a conditional or transformation.

**Drill:**
- **Task:** rewrite using `.filter(...).map(...)` or `.reduce(...)`.
- **Constraint:** the resulting array must be identical; the loop body must be expressible as pure transformations.

### `js:strict-equality`

**Signal:** A `.eslintrc` or project style that allows `==` together with multiple actual uses of `==` in production code.

**Drill:**
- **Task:** convert all non-`== null` uses to `===`.
- **Constraint:** any surviving `==` must be the legitimate `x == null` shorthand, and commented as such.

### `js:mutate-arguments`

**Signal:** A function body that calls a mutating array method (`.sort`, `.reverse`, `.splice`, `.push`, `.pop`, `.shift`, `.unshift`) on a parameter and then returns the mutated value.

**Drill:**
- **Task:** copy before mutating — `[...arr].sort()`, `arr.slice().reverse()`, etc.
- **Constraint:** the caller's array must be unchanged after the function returns.

### `js:unhandled-rejection`

**Signal:** A call to an `async` function or `.then` chain whose returned Promise is neither awaited nor has a `.catch` attached.

**Drill:**
- **Task:** add `await` (preferred) or a `.catch(handler)`.
- **Constraint:** no "unhandled promise rejection" warning in test runs; errors must be logged or propagated.

### `js:throw-string`

**Signal:** `throw "..."` or `throw someString` anywhere in the code.

**Drill:**
- **Task:** replace with `throw new Error("...")` (or a custom error class).
- **Constraint:** callers that `catch (err)` must see an `Error` instance with a `.message` and stack trace.

### `js:empty-catch`

**Signal:** A `catch` block with empty body (`catch {}`, `catch (e) {}`).

**Drill:**
- **Task:** log the error, handle it meaningfully, or re-throw.
- **Constraint:** no error silently disappears; if the intent is "ignore," add an explicit comment explaining why.

### `js:fs-promises`

**Signal:** Callback-style `fs.readFile`, `fs.writeFile`, or other callback-based `node:fs` calls in a file that could use `async/await`.

**Drill:**
- **Task:** import from `node:fs/promises` and rewrite with `await`.
- **Constraint:** error handling via `try/catch` instead of error-first callbacks.

### `js:template-literal`

**Signal:** String concatenation with `+` involving 2+ variables or expressions, used to build a message or path.

**Drill:**
- **Task:** rewrite as a template literal with `${...}` interpolation.
- **Constraint:** no behavior change; multi-line strings use the backtick form if the original used `"\n"` concatenation.

### `js:const-by-default`

**Signal:** `let` declarations whose variable is never reassigned in the current scope.

**Drill:**
- **Task:** change `let` to `const`.
- **Constraint:** no behavior change; if the variable is genuinely reassigned later, leave it as `let`.

### `js:optional-chaining`

**Signal:** `x && x.y && x.y.z` (or deeper) manual safety chains.

**Drill:**
- **Task:** rewrite using optional chaining: `x?.y?.z`.
- **Constraint:** equivalent safety; `undefined` at any level still yields `undefined` instead of a `TypeError`.

