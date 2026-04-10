# Kotlin language pack (inlined)

This is the runtime source of truth for chiron's Kotlin knowledge. The canonical human-readable explanation of each idiom and anti-pattern lives at `docs/languages/kotlin.md`.

## Kotlin idiom tag list (for eyeball fallback reference)

### Null safety

- `kotlin:val-by-default` — `val` unless reassigned
- `kotlin:safe-call` — `?.` short-circuit
- `kotlin:elvis` — `?:` default values
- `kotlin:safe-let` — `?.let { }` for conditional scope
- `kotlin:require-not-null` — `requireNotNull` / `checkNotNull` for preconditions

### Data modeling

- `kotlin:data-class` — `data class` for DTOs
- `kotlin:sealed-class` — `sealed class` / `sealed interface` for closed hierarchies
- `kotlin:object-singleton` — `object` for thread-safe singletons

### Scope functions

- `kotlin:scope-let` — `let` for null-safe transformations
- `kotlin:scope-apply` — `apply` for object initialization
- `kotlin:scope-run` — `run` for scoped expressions
- `kotlin:scope-also` — `also` for side effects in chains

### Extensions

- `kotlin:extension-function` — extension functions for behavior reuse
- `kotlin:extension-property` — extension properties for computed values

### Collections

- `kotlin:readonly-collections` — `List<T>` over `MutableList<T>` at API boundaries
- `kotlin:collection-transforms` — `map`/`filter`/`fold` functional chains

### Coroutines

- `kotlin:suspend-function` — `suspend` for async operations
- `kotlin:structured-concurrency` — scope-based coroutines
- `kotlin:coroutine-async` — `async`/`await` for parallel results
- `kotlin:with-context` — `withContext(Dispatchers.IO)` for dispatcher switching
- `kotlin:flow` — `Flow<T>` for cold async streams
- `kotlin:state-flow` — `StateFlow` / `SharedFlow` for hot state

### Delegation

- `kotlin:by-lazy` — lazy initialization
- `kotlin:interface-delegation` — `by` for interface delegation

### Style

- `kotlin:single-expression-fn` — single-expression functions with `=`
- `kotlin:trailing-lambda` — trailing lambda convention

### Error handling

- `kotlin:result-type` — `Result<T>` for recoverable errors
- `kotlin:try-catch` — specific catch clauses

### Testing

- `kotlin:kotest` — Kotest matcher DSL
- `kotlin:runtest` — `runTest` for coroutine tests

## Kotlin challenge seeds

### `kotlin:double-bang-abuse`

**Signal:** Multiple `!!` non-null assertions in the same file, particularly chained (`x!!.y!!.z!!`) or applied to values that could reasonably be null (map lookups, function returns, external API values).

**Drill:**
- **Task:** replace `!!` with safe calls (`?.`), Elvis (`?:`), or `requireNotNull`.
- **Constraint:** at most one `!!` remains in the touched function, and it's accompanied by a comment explaining why.

### `kotlin:global-scope`

**Signal:** `GlobalScope.launch { ... }` or `GlobalScope.async { ... }` in production code.

**Drill:**
- **Task:** replace with a structured scope (`viewModelScope`, `lifecycleScope`, a dedicated scope field, or `coroutineScope { }` inside a suspend function).
- **Constraint:** no `GlobalScope` reference remains; cancellation of the enclosing work cancels the coroutine.

### `kotlin:run-blocking-prod`

**Signal:** `runBlocking { ... }` used inside a regular (non-suspend, non-test) function to call a suspend function.

**Drill:**
- **Task:** make the caller a `suspend` function and remove the `runBlocking` wrapper.
- **Constraint:** `runBlocking` only remains in `main` or test code; all production code paths are suspend-aware.

### `kotlin:blocking-in-coroutine`

**Signal:** A `suspend` function body that calls blocking I/O (`Files.readString`, `Thread.sleep`, `Socket.connect`, etc.) without wrapping in `withContext(Dispatchers.IO)`.

**Drill:**
- **Task:** wrap the blocking call in `withContext(Dispatchers.IO) { ... }`.
- **Constraint:** no blocking call remains on the default dispatcher; the function is still `suspend`.

### `kotlin:data-class-var`

**Signal:** A `data class` with one or more `var` properties.

**Drill:**
- **Task:** change `var` to `val`; update call sites to use `copy(...)` for "mutations".
- **Constraint:** no `var` remains in the data class; `equals` / `hashCode` are stable across the object's lifetime.

### `kotlin:mutable-collection-api`

**Signal:** A class exposes `MutableList<T>`, `MutableMap<K,V>`, or `MutableSet<T>` publicly (field, property, or function return).

**Drill:**
- **Task:** change the public type to the read-only interface (`List<T>`, `Map<K,V>`, `Set<T>`); keep the mutable form private.
- **Constraint:** external callers can iterate and count but cannot mutate.

### `kotlin:val-by-default`

**Signal:** `var` local declarations whose variable is never reassigned in the current scope.

**Drill:**
- **Task:** change `var` to `val`.
- **Constraint:** no behavior change; compiler confirms no reassignment.

### `kotlin:first-on-empty`

**Signal:** `.first()` or `.first { ... }` on a collection where the collection could reasonably be empty — without a surrounding null check or default.

**Drill:**
- **Task:** replace with `.firstOrNull()` and handle the null case explicitly (with Elvis, error, or return).
- **Constraint:** no `NoSuchElementException` is possible at runtime.

### `kotlin:java-style-getters`

**Signal:** Kotlin class with manually-written `getX()` / `setX()` methods where a Kotlin property would do.

**Drill:**
- **Task:** convert to a Kotlin property (`var x: String` or `val x: String` with an optional custom getter).
- **Constraint:** external Kotlin callers use `.x` instead of `.getX()`; Java interop still works via the auto-generated JVM method.

### `kotlin:scope-fn-overuse`

**Signal:** A chain of 3+ scope functions (`let`, `run`, `apply`, `also`, `with`) on the same value with no clear reason.

**Drill:**
- **Task:** rewrite as straight-line code.
- **Constraint:** the result is clearer to read; scope functions are used only when they genuinely reduce noise.

### `kotlin:sealed-class`

**Signal:** An `open class` or `interface` hierarchy where all implementations live in the same module and are exhaustively enumerable (e.g., a `Result` type with a fixed set of states).

**Drill:**
- **Task:** convert to `sealed class` or `sealed interface`.
- **Constraint:** at least one `when` expression over the hierarchy is now exhaustive (no `else` branch needed).

### `kotlin:runblocking-in-tests`

**Signal:** A test function (marked `@Test`) whose body is wrapped in `runBlocking { ... }` to call suspend code.

**Drill:**
- **Task:** replace with `runTest` from `kotlinx-coroutines-test`.
- **Constraint:** no `runBlocking` in test code; virtual time and controlled dispatchers are available.

### `kotlin:catch-throwable`

**Signal:** `catch (e: Throwable)` or `catch (e: Error)` anywhere in the code.

**Drill:**
- **Task:** narrow to `catch (e: Exception)` or a specific subtype.
- **Constraint:** `Error` subclasses propagate; only handleable exceptions are caught.

### `kotlin:missing-use`

**Signal:** Manual `.close()` call in a `finally` block, or no close at all, on an object that implements `Closeable` / `AutoCloseable`.

**Drill:**
- **Task:** replace with `.use { ... }`.
- **Constraint:** cleanup happens on all exit paths; no explicit `finally` block remains for this purpose.

### `kotlin:extension-side-effect`

**Signal:** An extension property with a getter that performs I/O, mutation, or expensive work.

**Drill:**
- **Task:** convert to an extension function.
- **Constraint:** property access signals "cheap read"; the side effect is moved behind a clearly-named function.

### `kotlin:nullable-for-errors`

**Signal:** A function returning a nullable type (`T?`) where the null return encodes a specific error condition that callers need to distinguish from other failures.

**Drill:**
- **Task:** replace with a `Result<T>` or a custom sealed class with named variants.
- **Constraint:** each failure mode is represented as a distinct variant; callers can pattern-match on the result.

### `kotlin:single-expression-fn`

**Signal:** A function whose body is a single `return expression` statement.

**Drill:**
- **Task:** convert to single-expression form with `=`.
- **Constraint:** no behavior change; function signature is unchanged.

