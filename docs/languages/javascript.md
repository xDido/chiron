# JavaScript language pack

Canonical idioms, common pitfalls, mental-model shifts, and challenge seeds for modern JavaScript (ES2020+). This file is the **human-readable reference** for chiron's JavaScript knowledge base. The content is mirrored into `.claude/skills/challenge/SKILL.md` at runtime for the `/challenge` command's seeded pass.

**Contributors:** when adding idioms or seeds here, also update the corresponding section in `.claude/skills/challenge/SKILL.md`. See [`CONTRIBUTING-LANGUAGE-PACKS.md`](../CONTRIBUTING-LANGUAGE-PACKS.md) for the authoring guide.

---

## Read this first (stdlib and ecosystem anchors)

Docs chiron points to most often. When introducing any of these primitives during a teach turn, offer the corresponding pointer as a "read this first."

| Primitive | Doc pointer | Used for |
|-----------|-------------|----------|
| `Array` methods | `developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array` | `.map/.filter/.reduce/.find/.some/.every` |
| `Promise` | `developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise` | Async composition, `.then/.catch/.finally`, `Promise.all/allSettled` |
| `async/await` | `developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function` | Syntactic sugar over Promises |
| `fetch` | `developer.mozilla.org/en-US/docs/Web/API/Fetch_API` | HTTP requests in the browser and Node 18+ |
| `Map` / `Set` | `developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map` | Typed collections beyond plain objects |
| `JSON` | `developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON` | `JSON.parse` / `JSON.stringify` |
| `AbortController` | `developer.mozilla.org/en-US/docs/Web/API/AbortController` | Cancellation for fetch and async work |
| Node `fs/promises` | `nodejs.org/api/fs.html#promises-api` | Promise-based file I/O |
| Node `path` | `nodejs.org/api/path.html` | Cross-platform filesystem paths |
| Node `url` | `nodejs.org/api/url.html` | `URL` parsing and construction |
| ESM modules | `nodejs.org/api/esm.html` | `import` / `export` syntax |

**Meta-resources:**

- **MDN Web Docs** — `developer.mozilla.org` — canonical reference for everything JavaScript
- **Node.js Docs** — `nodejs.org/api/` — server-side stdlib
- **TC39 proposals** — `github.com/tc39/proposals` — what's coming to the language
- **You Don't Know JS** — `github.com/getify/You-Dont-Know-JS` — book series on JS fundamentals
- **Exploring ES2024** — `exploringjs.com/es2024` — recent language features
- **eslint rules** — `eslint.org/docs/rules` — catalog of automated "taste" checks

---

## Idioms — canonical patterns worth knowing

Each idiom has: what it is, when to use it, a minimal example, and its tag for profile logging.

### Variable declarations and scope

#### 1. `const` by default, `let` when reassigned

**Tag:** `js:const-by-default`

Declare with `const` unless you plan to reassign — then use `let`. Never use `var`. This makes the intent visible and catches accidental reassignment.

```js
const users = loadUsers();    // reference won't change
let total = 0;                // will accumulate
for (const u of users) { total += u.balance; }
```

#### 2. Arrow functions for callbacks

**Tag:** `js:arrow-function`

Arrow functions inherit `this` from their lexical scope, making them the right choice for short callbacks, array methods, and promise chains.

```js
const doubled = nums.map((n) => n * 2);
users.filter((u) => u.active).forEach((u) => sendEmail(u));
```

For methods on objects/classes, prefer regular methods (`foo() { ... }`) because arrow functions don't bind their own `this`.

#### 3. Destructuring in function signatures

**Tag:** `js:destructuring-params`

Destructure objects in the parameter list so the function body doesn't need to dig into arguments.

```js
// Good
function greet({ firstName, lastName, email }) {
  return `Hello ${firstName} ${lastName} (${email})`;
}

// Worse
function greet(user) {
  return `Hello ${user.firstName} ${user.lastName} (${user.email})`;
}
```

#### 4. Default parameter values

**Tag:** `js:default-params`

Use native default parameter syntax instead of `x = x || defaultValue` (which fails on falsy inputs like `0` or `""`).

```js
function paginate(items, pageSize = 20, offset = 0) {
  return items.slice(offset, offset + pageSize);
}
```

### Array and object operations

#### 5. Array methods over `for` loops

**Tag:** `js:array-methods`

`for` loops that build arrays should be rewritten as `.map`, `.filter`, `.reduce`, `.find`, `.some`, or `.every`. Clearer intent, fewer off-by-one bugs.

```js
const activeNames = users.filter((u) => u.active).map((u) => u.name);
const total = items.reduce((sum, item) => sum + item.price, 0);
const admin = users.find((u) => u.role === "admin");
```

#### 6. Spread operator for shallow copies

**Tag:** `js:spread-copy`

Shallow copies via `[...arr]` and `{...obj}` are the idiomatic way to avoid mutating shared state.

```js
const newUsers = [...users, newUser];
const updatedConfig = { ...config, timeout: 5000 };
```

#### 7. Destructuring assignment

**Tag:** `js:destructuring-assignment`

Extract values from objects and arrays with destructuring syntax. Supports rename, default, and rest patterns.

```js
const { name, email = "unknown@example.com" } = user;
const [first, second, ...rest] = items;
const { data: { user: currentUser } } = response; // nested destructure
```

#### 8. Optional chaining (`?.`)

**Tag:** `js:optional-chaining`

Use `?.` to safely access deeply nested properties without verbose `&&` chains.

```js
const city = user?.address?.city;
const firstTag = post?.tags?.[0];
const name = response?.data?.user?.name?.toUpperCase();
```

#### 9. Nullish coalescing (`??`)

**Tag:** `js:nullish-coalescing`

`??` returns the right side only if the left is `null` or `undefined`. Unlike `||`, it doesn't treat `0`, `""`, or `false` as "missing."

```js
const timeout = config.timeout ?? 5000;       // 0 stays as 0
const name = user.name ?? "anonymous";        // "" stays as ""
```

#### 10. Computed property names

**Tag:** `js:computed-property`

Use `{ [key]: value }` to build objects with dynamic keys — cleaner than `obj[key] = value` after construction.

```js
const field = "email";
const update = { [field]: newValue, updatedAt: Date.now() };
```

### Async and promises

#### 11. `async/await` over `.then()` chains

**Tag:** `js:async-await`

For linear sequences of async operations, `async/await` reads top-to-bottom and handles errors via normal `try/catch`. Reserve `.then()` for cases where the chain itself is the primary abstraction.

```js
async function loadUser(id) {
  const user = await fetchUser(id);
  const posts = await fetchPosts(user.id);
  return { user, posts };
}
```

#### 12. `Promise.all` for independent concurrent work

**Tag:** `js:promise-all`

If several promises can run in parallel, start them together and `await Promise.all([...])`. Don't `await` sequentially if there's no dependency.

```js
// Good — parallel
const [user, posts, comments] = await Promise.all([
  fetchUser(id),
  fetchPosts(id),
  fetchComments(id),
]);

// Worse — sequential for no reason
const user = await fetchUser(id);
const posts = await fetchPosts(id);
const comments = await fetchComments(id);
```

#### 13. `Promise.allSettled` when you need all results

**Tag:** `js:promise-all-settled`

`Promise.all` rejects on the first failure. `Promise.allSettled` waits for every promise and returns an array of `{ status, value | reason }`. Use it when partial failure is acceptable.

```js
const results = await Promise.allSettled(urls.map(fetch));
const ok = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
const failures = results.filter((r) => r.status === "rejected");
```

#### 14. `try/catch` around `await`

**Tag:** `js:try-catch-await`

Wrap `await` in a `try/catch` block to handle rejection. The error surfaces as a thrown value.

```js
async function loadConfig() {
  try {
    return await fetchConfig();
  } catch (err) {
    console.error("config load failed:", err);
    return defaultConfig;
  }
}
```

#### 15. `AbortController` for cancellation

**Tag:** `js:abort-controller`

Use `AbortController` to cancel `fetch`, timers, and async operations that support it. Essential for cleanup on component unmount or route change.

```js
const controller = new AbortController();
const { signal } = controller;

fetch(url, { signal }).catch((err) => {
  if (err.name === "AbortError") return;
  throw err;
});

// Later:
controller.abort();
```

### Strings and formatting

#### 16. Template literals

**Tag:** `js:template-literal`

Use backticks for string interpolation and multi-line strings. More readable than `"a" + b + "c"`.

```js
const message = `Hello, ${name}! You have ${count} unread messages.`;
const sql = `
  SELECT id, name
  FROM users
  WHERE active = true
`;
```

#### 17. `String.prototype.includes` over `.indexOf(...) !== -1`

**Tag:** `js:string-includes`

```js
if (title.includes("urgent")) { /* ... */ }
// instead of
if (title.indexOf("urgent") !== -1) { /* ... */ }
```

Same for `Array.prototype.includes`.

### Modules and imports

#### 18. ESM over CommonJS for new code

**Tag:** `js:esm-imports`

Use `import`/`export` syntax. Set `"type": "module"` in `package.json` for Node, or write `.mjs` files. Named exports over default exports — they're safer to refactor and auto-import.

```js
// Good
export function loadUser(id) { ... }
export function saveUser(user) { ... }

// At the call site
import { loadUser, saveUser } from "./users.js";
```

#### 19. `for...of` over `for...in`

**Tag:** `js:for-of`

`for...in` iterates over keys (including prototype keys — surprising). `for...of` iterates over values, in a way that works for arrays, sets, maps, and any iterable.

```js
for (const item of items) { process(item); }
for (const [key, value] of Object.entries(obj)) { ... }
```

### Data modeling

#### 20. `Map` over plain object for dynamic key-value stores

**Tag:** `js:map-over-object`

Plain objects have prototype keys. `Map` has no prototype pollution, supports non-string keys, and has an explicit size.

```js
const idToUser = new Map();
idToUser.set(1, alice);
idToUser.set(2, bob);
const u = idToUser.get(1);
const n = idToUser.size;
```

#### 21. `Set` for uniqueness and membership

**Tag:** `js:set-uniqueness`

```js
const uniqueTags = new Set(tags);
if (uniqueTags.has("urgent")) { /* ... */ }
const count = uniqueTags.size;
```

#### 22. `Object.freeze` for immutable config

**Tag:** `js:object-freeze`

Freeze module-level config objects so accidental mutation fails loudly (in strict mode).

```js
export const CONFIG = Object.freeze({
  maxRetries: 3,
  timeout: 5000,
});
```

### Error handling

#### 23. Custom error classes

**Tag:** `js:custom-error-class`

Define error subclasses so callers can `instanceof`-check specific failure modes.

```js
class NotFoundError extends Error {
  constructor(resource) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

try {
  loadUser(id);
} catch (err) {
  if (err instanceof NotFoundError) { /* ... */ }
  else throw err;
}
```

#### 24. `Error.cause` for wrapping

**Tag:** `js:error-cause`

Use the `cause` option to preserve the underlying error without losing its stack trace.

```js
try {
  await doWork();
} catch (err) {
  throw new Error("work failed", { cause: err });
}
```

### Node-specific idioms

#### 25. `fs/promises` over callback `fs`

**Tag:** `js:fs-promises`

Node's `fs/promises` module gives you async/await support for file I/O. The callback-based `fs` API is legacy.

```js
import { readFile, writeFile } from "node:fs/promises";

const contents = await readFile("data.json", "utf-8");
const parsed = JSON.parse(contents);
```

#### 26. Node `path.join` / `path.resolve`

**Tag:** `js:path-join`

Never use string concatenation or hardcoded `/` for filesystem paths. Use `path.join` or `path.resolve` for cross-platform correctness.

```js
import path from "node:path";
const configPath = path.join(os.homedir(), ".myapp", "config.json");
```

#### 27. Graceful shutdown with signal handlers

**Tag:** `js:graceful-shutdown`

Listen for `SIGINT`/`SIGTERM`, clean up resources, then exit.

```js
async function shutdown() {
  console.log("shutting down");
  await server.close();
  await db.disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
```

### Testing and tooling

#### 28. `===` / `!==` by default

**Tag:** `js:strict-equality`

Always use strict equality (`===`, `!==`) unless you have a specific reason to use coercing equality. ESLint's `eqeqeq` rule enforces this.

```js
if (status === "active") { /* ... */ }
if (value !== null && value !== undefined) { /* ... */ }
```

#### 29. ESLint + Prettier in CI

**Tag:** `js:eslint-prettier-ci`

Lint and formatting errors should fail CI. Pick one formatter (Prettier), one linter (ESLint), and configure them to agree.

#### 30. `console.log` for scripts; structured logging for services

**Tag:** `js:structured-logging`

`console.log` is fine for one-off scripts. In services, use `pino`, `winston`, or `bunyan` for structured JSON logs. Production observability depends on it.

```js
import pino from "pino";
const log = pino();
log.info({ userId: u.id, action: "login" }, "user logged in");
```

---

## Common pitfalls (anti-patterns)

Each pitfall has: the bug, why it's bad, the fix, and its tag.

### Variable declaration pitfalls

#### 1. `var` in new code

**Tag:** `js:var-in-new-code`

```js
// BUG: function-scoped, hoisted, can be re-declared
var x = 1;
if (cond) {
  var x = 2;  // same variable
}
```

**Fix:** use `const` or `let`. Both are block-scoped.

#### 2. Global assignment without declaration

**Tag:** `js:implicit-global`

```js
// BUG: creates a global in non-strict mode, throws in strict mode
function setup() {
  config = loadConfig();  // missing `const`
}
```

**Fix:** always declare. Use `"use strict"` or ES modules (strict by default) to catch these.

### Equality and coercion pitfalls

#### 3. `==` instead of `===`

**Tag:** `js:loose-equality`

```js
// BUG: "0" == 0, null == undefined, "" == false
if (value == 0) { /* matches 0, "0", false, [], ... */ }
```

**Fix:** use `===`.

#### 4. Truthiness traps with `||`

**Tag:** `js:or-truthiness-trap`

```js
// BUG: 0 and "" get replaced with the default
const timeout = config.timeout || 5000;  // 0 becomes 5000!
const name = user.name || "anonymous";   // "" becomes "anonymous"
```

**Fix:** use `??` (nullish coalescing) for "only if null/undefined."

### Async pitfalls

#### 5. Forgotten `await`

**Tag:** `js:forgotten-await`

```js
// BUG: returns a pending Promise, not the value
async function load(id) {
  const user = fetchUser(id);  // no await!
  return user.name;            // user is a Promise, .name is undefined
}
```

**Fix:** `const user = await fetchUser(id);`. ESLint's `require-await` and `no-floating-promises` catch many of these.

#### 6. Unhandled promise rejection

**Tag:** `js:unhandled-rejection`

```js
// BUG: rejection is lost
async function bg() {
  fetchData(); // no await, no .catch()
}
```

**Fix:** await and handle, or attach `.catch(...)` explicitly.

```js
fetchData().catch((err) => logger.error(err, "bg fetch failed"));
```

#### 7. Sequential awaits when parallel would work

**Tag:** `js:serial-await`

```js
// BUG: three requests run one after another
const a = await fetchA();
const b = await fetchB();
const c = await fetchC();
```

**Fix:** `Promise.all`.

```js
const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()]);
```

#### 8. Callback hell

**Tag:** `js:callback-hell`

```js
// BUG: nested callbacks, hard to read, error handling repeated
fetchUser(id, (err, user) => {
  if (err) return cb(err);
  fetchPosts(user.id, (err, posts) => {
    if (err) return cb(err);
    fetchComments(posts[0].id, (err, comments) => {
      if (err) return cb(err);
      cb(null, { user, posts, comments });
    });
  });
});
```

**Fix:** rewrite using `async/await` or promise chains.

### Iteration pitfalls

#### 9. `for...in` on arrays

**Tag:** `js:for-in-array`

```js
// BUG: iterates over keys, including inherited ones
for (const i in myArray) { ... }
```

**Fix:** `for (const item of myArray)` for values, or `myArray.forEach(...)`, or `for (let i = 0; i < myArray.length; i++)` when you need the index.

#### 10. Mutating function arguments

**Tag:** `js:mutate-arguments`

```js
// BUG: modifies caller's array
function sortAndReturn(items) {
  items.sort();  // mutates the caller's data!
  return items;
}
```

**Fix:** copy first.

```js
function sortAndReturn(items) {
  return [...items].sort();
}
```

#### 11. Mutating arrays while iterating

**Tag:** `js:mutate-while-iterating`

```js
// BUG: skips elements or misses mutations
for (let i = 0; i < items.length; i++) {
  if (shouldRemove(items[i])) {
    items.splice(i, 1);
  }
}
```

**Fix:** build a new array or iterate backwards.

```js
const keep = items.filter((item) => !shouldRemove(item));
```

### Object and type pitfalls

#### 12. Modifying `Object.prototype`

**Tag:** `js:prototype-pollution`

Extending built-in prototypes (`Array.prototype.myHelper = ...`) causes surprising behavior everywhere in the app. Never do it.

**Fix:** define plain functions and import them explicitly.

#### 13. `typeof` quirks

**Tag:** `js:typeof-quirks`

```js
typeof null              // "object" — historical bug
typeof []                // "object" — not "array"
typeof NaN               // "number" — though it's "not a number"
```

**Fix:** use `Array.isArray(x)`, `x === null`, `Number.isNaN(x)`, `x instanceof SomeClass`.

#### 14. Floating-point equality

**Tag:** `js:float-equality`

```js
// BUG: 0.1 + 0.2 !== 0.3
if (price + tax === total) { /* rarely matches */ }
```

**Fix:** compare with an epsilon, or use integer cents.

```js
if (Math.abs((price + tax) - total) < 0.001) { /* ... */ }
```

### Module and scope pitfalls

#### 15. Mixing ESM and CommonJS

**Tag:** `js:mixed-module-systems`

Node supports both `require`/`module.exports` (CommonJS) and `import`/`export` (ESM), but mixing them in the same codebase creates import/export surprises.

**Fix:** pick one. For new code, pick ESM.

#### 16. Global state in modules

**Tag:** `js:module-global-state`

Module-level `let` variables mutated by exported functions create hidden global state that's hard to reason about and test.

**Fix:** encapsulate in a class or factory function that takes dependencies explicitly.

### Error handling pitfalls

#### 17. `throw "string"` instead of `throw new Error(...)`

**Tag:** `js:throw-string`

```js
// BUG: no stack trace, no .message, breaks instanceof checks
throw "something went wrong";
```

**Fix:** throw `Error` objects.

```js
throw new Error("something went wrong");
```

#### 18. Empty `catch` block

**Tag:** `js:empty-catch`

```js
// BUG: silently swallows everything
try {
  doRisky();
} catch {}
```

**Fix:** log, handle specifically, or re-throw. Never swallow silently.

### Browser/DOM pitfalls

#### 19. `innerHTML` with user input

**Tag:** `js:inner-html-xss`

```js
// BUG: XSS vulnerability
element.innerHTML = userComment;
```

**Fix:** use `textContent` or a sanitizer (DOMPurify).

```js
element.textContent = userComment;
```

#### 20. Event listeners leaked on re-render

**Tag:** `js:event-listener-leak`

Adding listeners in an event handler without removing them creates memory leaks.

**Fix:** keep a reference and call `removeEventListener` on cleanup. In React, the useEffect cleanup callback handles this.

### Performance pitfalls

#### 21. Array `push` in loops vs. spread

**Tag:** `js:array-push-loop-spread`

Both are fine in most cases, but note that `[...arr, x]` creates a new array each time (O(n²) in a loop). For accumulation in a hot path, prefer `.push`.

```js
// Good in a hot path
const result = [];
for (const x of xs) { result.push(transform(x)); }

// Bad in a hot path — O(n²)
let result = [];
for (const x of xs) { result = [...result, transform(x)]; }
```

#### 22. Creating functions inside hot paths

**Tag:** `js:function-in-hot-path`

Allocating new closures per iteration in a tight loop creates GC pressure. Hoist stable functions outside.

### Testing pitfalls

#### 23. Tests that depend on wall-clock time

**Tag:** `js:wall-clock-in-tests`

`setTimeout`, `Date.now()`, and real timers make tests flaky.

**Fix:** use fake timers (`vi.useFakeTimers()` in Vitest, `jest.useFakeTimers()` in Jest).

#### 24. `console.log` debugging left in code

**Tag:** `js:console-log-debugging`

**Fix:** remove before committing, or use a real debug library (`debug` package) that can be enabled selectively.

#### 25. Skipped tests left skipped

**Tag:** `js:skipped-tests`

`it.skip(...)` and `xit(...)` that stay in the codebase become invisible debt.

**Fix:** either fix or delete. CI should report skipped counts.

---

## Mental-model deltas (for engineers coming from static / compiled languages)

Things that work differently in JavaScript than in Java/C#/Go/Rust. Chiron calls these out when they come up in conversation.

1. **Single-threaded with an event loop.** One call stack, one thread, one message queue. Async work yields to the loop via `await`, promise callbacks, or `setTimeout`. Blocking the main thread freezes the app.

2. **Functions are first-class values.** A function is an object. You can pass it, return it, store it in an array, attach properties to it.

3. **Closures capture by reference.** A function defined inside another function sees the same variable binding the outer function had, even after the outer function returned.

4. **`this` is determined at call time.** In regular functions, `this` depends on how the function is called (`obj.method()`, `method.call(...)`, `new Method()`). Arrow functions inherit `this` lexically.

5. **`undefined` vs `null`.** `undefined` means "not assigned"; `null` means "assigned to nothing." JavaScript uses both. Stick to one convention for your own code (most teams pick `null` for explicit absence, `undefined` for uninitialized).

6. **Objects are dictionaries.** `{}` is a hash map with string (or symbol) keys. Access with `obj.key` or `obj["key"]`. For true map semantics (any key type, no prototype), use `Map`.

7. **Type coercion is aggressive.** `1 + "2"` is `"12"`. `"5" - 1` is `4`. `==` does conversions. Strict mode and `===` mostly avoid surprises — embrace them.

8. **Promises are objects that eventually resolve.** A Promise is created once and has one of three states: pending, fulfilled, rejected. Once settled, it doesn't change.

9. **`async` functions always return Promises.** Even if the body returns a plain value, the wrapper is a Promise.

10. **Array holes are a thing.** `const a = [1, , 3]` creates a sparse array. `a.length === 3` but `a[1] === undefined`. `.map` skips holes but `forEach` doesn't.

11. **Iteration order of object keys.** String keys in insertion order, integer-like keys first in numeric order, then symbol keys. Usually you want a `Map` if this matters.

12. **Prototypes, not classes (under the hood).** `class Foo { ... }` is sugar over prototype chains. `instanceof` walks the chain.

13. **`===` compares references for objects.** Two objects are `===` only if they point to the same memory. `{a:1} === {a:1}` is `false`.

14. **Strings are immutable.** `s[0] = "x"` silently fails. Use `.slice`, `.replace`, or templates.

15. **Numbers are 64-bit floats.** No integers. `Number.MAX_SAFE_INTEGER` is `2^53 - 1`. For bigger integers, use `BigInt`.

16. **`NaN` is not equal to anything.** `NaN === NaN` is `false`. Use `Number.isNaN(x)`.

17. **Module top level runs once.** `import`ing a module executes its body the first time. Subsequent imports get the cached export object.

18. **Top-level `await` is allowed in ESM.** You can write `const data = await loadData();` at a module's top level. Not in CommonJS.

19. **The DOM is a global.** In the browser, `window` and `document` are globals. In Node, they're not.

20. **Node has its own stdlib.** `fs`, `path`, `os`, `http`, `crypto`. Use the `node:` prefix (`node:fs`) for clarity.

21. **Package dependency tree can be huge.** `npm install` pulls transitive dependencies aggressively. Keep `package.json` lean; audit what you add.

22. **`package.json` scripts are your task runner.** `"scripts": {"test": "vitest"}` and run with `npm run test`. Pre/post hooks are `pre<script>` and `post<script>`.

23. **Semver and lockfiles.** Declared dependency versions are ranges; `package-lock.json` pins exact versions. Commit the lockfile.

24. **Hoisting still exists for `function` and `var`.** `function foo() {}` is hoisted to the top of its scope. `let`/`const` are not. Prefer arrow functions assigned to `const` to avoid thinking about hoisting.

25. **`typeof` is an operator, not a function.** `typeof x` — no parentheses needed. Returns a string.

---

## Challenge seeds

Each seed is a pre-authored drill that `/challenge` pattern-matches against source code. When the seed's `Signal` matches a file, the `Drill` becomes a concrete practice target for the user.

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

---

## Authoring new seeds

When adding a new seed to this pack:

1. **Name it** `js:<idiom-slug>` — consistent with the profile tag format.
2. **Write the Signal** in prose or pseudo-regex — concrete enough that a reader can verify a match by inspection.
3. **Write the Drill** with Task + Constraint — task is what to change, constraint is what makes it bounded (measurable, finite).
4. **Keep it small.** Drills must be ≤20 lines of change, ≤1 function touched, 5–15 minutes of focused work.
5. **Mirror into `.claude/skills/challenge/SKILL.md`.** The runtime source of truth is the command file; this document is the human-readable mirror and the contribution-PR target.
