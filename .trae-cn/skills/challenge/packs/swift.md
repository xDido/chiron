# Swift language pack (inlined)

This is the runtime source of truth for chiron's Swift knowledge. The canonical human-readable explanation of each idiom and anti-pattern lives at `docs/languages/swift.md`.

## Swift idiom tag list (for eyeball fallback reference)

### Value types and immutability

- `swift:struct-by-default` — `struct` over `class` unless reference semantics needed
- `swift:let-by-default` — `let` unless reassigned
- `swift:immutable-struct` — immutable struct with computed properties

### Optionals

- `swift:if-let-guard-let` — safe unwrapping without force
- `swift:nil-coalescing` — `??` for defaults
- `swift:optional-chaining` — `?.` short-circuit

### Enums and pattern matching

- `swift:enum-associated-values` — enums as sum types
- `swift:exhaustive-switch` — compiler-enforced exhaustive matching
- `swift:switch-where` — `where` clauses in switch cases

### Protocols

- `swift:protocol-oriented` — protocol-oriented programming over inheritance
- `swift:protocol-extension` — default implementations via extensions
- `swift:associated-type` — generic protocols with associated types

### Error handling

- `swift:throws-try-catch` — throwing functions and `do`/`catch`
- `swift:result-type` — `Result<Success, Failure>` for callback APIs
- `swift:custom-error-enum` — domain-specific error enums

### Async concurrency

- `swift:async-await` — async functions and await
- `swift:async-let` — concurrent bindings with `async let`
- `swift:task-group` — dynamic parallelism with `TaskGroup`
- `swift:actor` — actors for isolated state
- `swift:main-actor` — `@MainActor` for UI-thread isolation

### Serialization

- `swift:codable` — `Codable` for JSON encoding/decoding

### Property wrappers

- `swift:property-wrapper` — reusable property behavior

### Generics

- `swift:generic-where` — generic constraints with `where`
- `swift:some-opaque` — `some Protocol` opaque return types
- `swift:any-existential` — `any Protocol` existential containers

### Memory management

- `swift:weak-self` — `[weak self]` in long-lived closures

### Testing

- `swift:swift-testing` — Swift Testing framework

### Build

- `swift:spm-package` — Swift Package Manager manifests

### Other

- `swift:string-interpolation` — `\(expr)` interpolation
- `swift:defer` — `defer` for cleanup

## Swift challenge seeds

### `swift:force-unwrap`

**Signal:** Multiple `!` force-unwrap operators in non-test code on values that could reasonably be nil (dictionary lookups, first/last of a collection, optional chains, function returns).

**Drill:**
- **Task:** replace `!` with safe unwrapping via `guard let`, `if let`, or `??`.
- **Constraint:** at most one `!` remains in the touched function, and it's accompanied by a comment explaining why.

### `swift:force-cast`

**Signal:** `as!` downcast in non-test code.

**Drill:**
- **Task:** replace with `as?` and handle the nil case (early return, default, or error).
- **Constraint:** no `as!` remains; the function gracefully handles the cast-failure case.

### `swift:force-try`

**Signal:** `try!` call in non-test code.

**Drill:**
- **Task:** propagate with `try` (and mark the caller `throws`) or handle with `do`/`catch`.
- **Constraint:** no `try!` remains; errors are handled explicitly or propagated.

### `swift:blocking-in-async`

**Signal:** An `async` function body that calls synchronous blocking I/O (`String(contentsOfFile:)`, `Data(contentsOf:)`, `Thread.sleep`, `DispatchSemaphore.wait`, etc.).

**Drill:**
- **Task:** replace with an async equivalent (`URLSession.shared.data`, `FileHandle.AsyncBytes`, `Task.sleep`) or wrap in `Task.detached { }` if no async alternative exists.
- **Constraint:** the function remains `async`; no blocking call on the executor thread.

### `swift:unstructured-task`

**Signal:** A `Task { ... }` invocation not tied to a parent scope (top-level in a method, no storage of the task handle, no cancellation path).

**Drill:**
- **Task:** tie the task to a scope — store the `Task` reference and cancel it in `deinit`, OR convert to structured concurrency via `async let` or `TaskGroup`.
- **Constraint:** cancellation of the owner cancels the task; no orphaned work.

### `swift:strong-self-capture`

**Signal:** A closure passed as a long-lived callback (completion handler, stored property, `Task { ... }` body) that uses `self.someMethod` or `self.someProperty` without `[weak self]` or `[unowned self]`.

**Drill:**
- **Task:** add `[weak self]` to the capture list and `guard let self else { return }` at the top of the closure.
- **Constraint:** the closure no longer creates a retain cycle; the closure body behaves the same when `self` is alive.

### `swift:class-over-struct`

**Signal:** A `class` with only `let` properties, no inheritance, no identity semantics, no Objective-C interop — essentially an immutable data holder.

**Drill:**
- **Task:** convert to `struct`.
- **Constraint:** all existing usages still compile; value semantics (copy on assignment) are now in effect.

### `swift:non-final-class`

**Signal:** A `class` declaration without the `final` keyword that is not designed for subclassing (no protected members, no extension points documented).

**Drill:**
- **Task:** mark the class `final`.
- **Constraint:** no existing subclass breaks; compiler JIT optimizations are unlocked.

### `swift:missing-await`

**Signal:** A call to an `async` function whose return value is discarded or used as a non-Task value (e.g., `.name` accessed immediately after the call).

**Drill:**
- **Task:** add `await` (and `try` if the function is `throws`) at the call site; make the enclosing function `async` if needed.
- **Constraint:** no pending `Task<T, Error>` is silently dropped; the value is properly awaited.

### `swift:for-index-loop`

**Signal:** A `for i in 0..<array.count` loop that accesses `array[i]` inside the body.

**Drill:**
- **Task:** replace with `for item in array` (if the index isn't needed) or `for (i, item) in array.enumerated()` (if it is).
- **Constraint:** no subscript indexing by a manual loop variable; iteration is direct.

### `swift:first-on-possibly-empty`

**Signal:** `.first!` or `.last!` on a collection that could reasonably be empty.

**Drill:**
- **Task:** replace with `guard let` + error, or `??` + default.
- **Constraint:** no crash on empty collection; the empty case is explicit.

### `swift:nsstring`

**Signal:** `NSString` used in pure Swift code without a specific need for Objective-C interop.

**Drill:**
- **Task:** replace with Swift `String` and call the equivalent Swift method.
- **Constraint:** no `NSString` remains unless justified by Objective-C bridging.

### `swift:print-in-production`

**Signal:** `print(...)` or `NSLog(...)` in non-test, non-script code used as a logging mechanism.

**Drill:**
- **Task:** replace with `os.Logger` (or `Logger` from `swift-log`) at the appropriate level.
- **Constraint:** no bare `print` remains in production code; log level is appropriate (debug/info/warning/error).

### `swift:dispatch-main-async`

**Signal:** `DispatchQueue.main.async { ... }` inside a `Task { ... }` or `async` function, particularly for UI updates.

**Drill:**
- **Task:** mark the UI code `@MainActor` and remove the explicit queue dispatch.
- **Constraint:** the compiler enforces main-thread execution; no manual queue hopping remains.

### `swift:silent-catch`

**Signal:** A `do { try ... } catch { }` block with an empty body or a body that doesn't log, re-throw, or handle the error meaningfully.

**Drill:**
- **Task:** log the error with context, handle it specifically, or re-throw.
- **Constraint:** no error silently disappears; the empty `catch` is gone.

### `swift:string-concat-loop`

**Signal:** A `for` loop body contains `s += ...` or `s = s + ...` where `s` is a `String` accumulator.

**Drill:**
- **Task:** replace with `.joined(separator:)` or a single interpolated expression.
- **Constraint:** no intermediate `String` allocations inside the loop.

### `swift:any-escape`

**Signal:** A function parameter typed `Any` or `AnyObject` whose body uses `as?` downcasts to inspect the concrete type.

**Drill:**
- **Task:** replace with a protocol containing the needed methods, or a sum enum if the types are a fixed set.
- **Constraint:** no `as?` downcasts in the function body; the type system expresses intent.
