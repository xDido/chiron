# C# language pack

This is the runtime source of truth for chiron's C# knowledge. The canonical human-readable explanation of each idiom and anti-pattern lives at `docs/languages/csharp.md`.

## C# idiom tag list (for eyeball fallback reference)

### Language primitives

- `csharp:record` — records for immutable DTOs (C# 9+)
- `csharp:switch-expression` — switch as expression with arrow syntax
- `csharp:nullable-reference-types` — `#nullable enable` + `?` annotations
- `csharp:target-typed-new` — `new()` with inferred type
- `csharp:file-scoped-namespace` — single namespace per file (C# 10+)
- `csharp:global-using` — `global using` declarations

### LINQ and collections

- `csharp:linq` — `Where`/`Select`/`OrderBy`/`GroupBy` over manual loops
- `csharp:readonly-collection-api` — `IReadOnlyList<T>` / `IEnumerable<T>` at API boundaries
- `csharp:async-enumerable` — `IAsyncEnumerable<T>` + `await foreach`
- `csharp:span` — `Span<T>` / `ReadOnlySpan<T>` for zero-alloc slicing

### Async and concurrency

- `csharp:async-await` — task-based async all the way down
- `csharp:configure-await-false` — `.ConfigureAwait(false)` in libraries
- `csharp:task-whenall` — parallel awaits with `Task.WhenAll`
- `csharp:cancellation-token` — propagate `CancellationToken` through async methods

### Resource management

- `csharp:using-declaration` — `using var x = ...;` without nesting
- `csharp:await-using` — `await using` for `IAsyncDisposable`

### Dependency injection

- `csharp:primary-constructor-di` — primary constructors for DI (C# 12+)
- `csharp:di-registration` — `IServiceCollection` registration patterns

### Error handling

- `csharp:custom-exception` — domain exception classes
- `csharp:specific-catch` — narrow catch clauses

### Logging

- `csharp:structured-logging` — message templates with placeholders

### Testing

- `csharp:xunit-theory` — `[Theory]` + `[InlineData]` for parametrized tests
- `csharp:fluent-assertions` — fluent assertion chains

### Immutability

- `csharp:readonly-struct` — small immutable value types
- `csharp:init-only-setters` — `init` setters for immutable properties

### Time and performance

- `csharp:datetimeoffset-utcnow` — `DateTimeOffset.UtcNow` over `DateTime.Now`
- `csharp:stringbuilder` — `StringBuilder` in loop-based concatenation

### Design

- `csharp:sealed-by-default` — seal classes not designed for inheritance
- `csharp:top-level-statements` — `Program.cs` without boilerplate
- `csharp:ioptions` — `IOptions<T>` for typed configuration binding

## C# challenge seeds

### `csharp:task-result-wait`

**Signal:** A call to `.Result`, `.Wait()`, or `.GetAwaiter().GetResult()` on a `Task<T>` inside a method that could be made async, outside of program-entry-point code.

**Drill:**
- **Task:** propagate `async` up the call chain, return `Task<T>`, and replace `.Result` with `await`.
- **Constraint:** no `.Result` / `.Wait()` / `.GetAwaiter().GetResult()` remains in the affected code path.

### `csharp:async-void`

**Signal:** A method declared `async void` that is NOT an event handler (not matching the `EventHandler` / `(object sender, EventArgs e)` signature).

**Drill:**
- **Task:** change the return type from `void` to `Task`. Update callers to `await` it.
- **Constraint:** exceptions thrown from the method must be observable by callers via the returned `Task`.

### `csharp:serial-await`

**Signal:** Multiple consecutive `await` statements where the awaited expressions are independent (no data flow between them).

**Drill:**
- **Task:** start all tasks first, then `await Task.WhenAll(...)`.
- **Constraint:** each task is started before any `await`; results are destructured after `WhenAll` completes.

### `csharp:missing-cancellation-token`

**Signal:** A public async method without a `CancellationToken` parameter, OR a method that has one but fails to pass it to inner `await` calls.

**Drill:**
- **Task:** add `CancellationToken ct = default` as the last parameter (or thread an existing one through) and pass it to every inner async call that accepts one.
- **Constraint:** all inner async calls accept and receive the token; the method can be canceled mid-flight.

### `csharp:string-concat-loop`

**Signal:** A `for`, `foreach`, or `while` loop body contains `s += ...` or `s = s + ...` where `s` is a `string` accumulator.

**Drill:**
- **Task:** replace with `StringBuilder` or `string.Join(...)`.
- **Constraint:** no intermediate `string` allocations inside the loop.

### `csharp:interpolated-log-message`

**Signal:** A `_logger.Log*` / `ILogger.Log*` call with an interpolated string argument (`$"..."`).

**Drill:**
- **Task:** convert to a message template with `{Placeholder}` tokens and separate arguments.
- **Constraint:** no `$"..."` in the log call; placeholder names describe the fields.

### `csharp:record`

**Signal:** A class with only a constructor that assigns parameters to read-only properties, no business logic, used as a DTO. No `Equals` / `GetHashCode` override.

**Drill:**
- **Task:** convert to a `record` (or `record struct` if value-type semantics are desired).
- **Constraint:** all call sites still work; value equality via `Equals` / `==` is now free.

### `csharp:switch-expression`

**Signal:** A `switch` statement that assigns a variable or returns based on a series of `case X: ... break;` branches with no fall-through.

**Drill:**
- **Task:** convert to a switch expression using `=>` arrows.
- **Constraint:** no `break`; the expression form returns the value directly; exhaustiveness is visible.

### `csharp:using-declaration`

**Signal:** A `using (...)` block where the scope is the entire method body (or close to it) — unnecessary nesting.

**Drill:**
- **Task:** convert to a `using` declaration (`using var x = ...;` without the block).
- **Constraint:** disposal still happens at the same point; indentation reduces.

### `csharp:nullable-reference-types`

**Signal:** A file or project without `#nullable enable` (or `<Nullable>enable</Nullable>` in `.csproj`), combined with multiple places where a reference-type return could legitimately be null.

**Drill:**
- **Task:** enable nullable reference types, annotate the returns and parameters with `?` where null is valid, narrow with `is not null` where needed.
- **Constraint:** zero nullable warnings after the annotations; no `!` non-null suppression operators introduced as a workaround.

### `csharp:httpclient-short-lived`

**Signal:** A `new HttpClient()` inside a method body (not a field or a singleton), typically inside `using (var client = new HttpClient())` patterns.

**Drill:**
- **Task:** inject `IHttpClientFactory` via the constructor and use `factory.CreateClient()`.
- **Constraint:** no `new HttpClient()` remains; the DI container is responsible for the client lifecycle.

### `csharp:datetime-now`

**Signal:** Uses of `DateTime.Now` in non-UI code (logging, persistence, comparison with UTC values).

**Drill:**
- **Task:** replace with `DateTimeOffset.UtcNow` (or inject an `IClock` / `TimeProvider` for testability).
- **Constraint:** no `DateTime.Now` remains in the touched code; timestamps are unambiguous.

### `csharp:catch-exception`

**Signal:** A `catch (Exception)` or `catch (Exception ex)` block that either does nothing or logs + swallows without re-throwing.

**Drill:**
- **Task:** narrow to the specific exception type(s) this code can handle; let everything else propagate.
- **Constraint:** no `catch (Exception)` remains unless paired with `throw;`.

### `csharp:throw-ex`

**Signal:** A `throw ex;` (with the variable) inside a `catch` block.

**Drill:**
- **Task:** change to bare `throw;`.
- **Constraint:** the original stack trace is preserved.

### `csharp:public-list`

**Signal:** A class exposes `public List<T> X { get; set; }` or `public List<T> X { get; }` as part of its API surface.

**Drill:**
- **Task:** keep the `List<T>` as a `private readonly` field; expose `IReadOnlyList<T>` publicly.
- **Constraint:** callers can still iterate and count; they cannot add, remove, or clear.

### `csharp:lock-on-this`

**Signal:** `lock (this)` or `lock (typeof(X))` anywhere in the code.

**Drill:**
- **Task:** replace with a lock on a private dedicated object (`private readonly object _lock = new();`).
- **Constraint:** no external code can contend for the same lock.

### `csharp:modify-during-iteration`

**Signal:** A `foreach` loop body calls `.Remove(...)`, `.Add(...)`, or `.Clear()` on the collection being iterated.

**Drill:**
- **Task:** use `RemoveAll(predicate)`, iterate a snapshot (`.ToList()`), or build a new collection.
- **Constraint:** no `InvalidOperationException` at runtime; semantics preserved.

