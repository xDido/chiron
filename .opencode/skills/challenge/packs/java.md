# Java language pack

This is the runtime source of truth for chiron's Java knowledge. The canonical human-readable explanation of each idiom and anti-pattern lives at `docs/languages/java.md`.

## Java idiom tag list (for eyeball fallback reference)

### Data modeling

- `java:record` — records for immutable data carriers (Java 14+)
- `java:final-fields` — `final` fields by default
- `java:sealed-interface` — sealed types for closed hierarchies (Java 17+)
- `java:builder` — builder pattern for complex construction

### Null handling

- `java:optional-return` — `Optional<T>` for possibly-absent return values
- `java:requireNonNull` — `Objects.requireNonNull` for precondition checks

### Error handling

- `java:try-with-resources` — automatic resource cleanup
- `java:custom-exception` — domain-specific exception classes
- `java:specific-catch` — narrow catch clauses

### Stream API

- `java:stream-pipeline` — `stream().map().filter().toList()`
- `java:collectors-groupingby` — `Collectors.groupingBy` for aggregation
- `java:stream-of` — `Stream.of` / `IntStream.range`

### Collections

- `java:collection-of` — `List.of` / `Map.of` / `Set.of` for immutable literals
- `java:collection-copyof` — `List.copyOf` / `Map.copyOf` for defensive copies

### Concurrency

- `java:executor-service` — `ExecutorService` over raw `Thread`
- `java:completablefuture` — `CompletableFuture` for async composition
- `java:concurrent-hashmap` — `ConcurrentHashMap` for shared state

### Path and I/O

- `java:nio-path` — `java.nio.file.Path` over `java.io.File`
- `java:standard-charsets-utf8` — `StandardCharsets.UTF_8` explicitly

### Testing

- `java:junit5` — JUnit 5 `@Test` / `@ParameterizedTest`
- `java:assertj` — AssertJ for fluent assertions

### Dependency injection

- `java:constructor-injection` — constructor DI with `final` fields

### Logging

- `java:slf4j-parameterized` — SLF4J placeholders (`{}`)

### Pattern matching

- `java:pattern-matching-instanceof` — `if (obj instanceof String s)`
- `java:switch-expression` — switch expressions with arrow syntax

### Tooling

- `java:maven-or-gradle` — pick one build tool
- `java:static-analysis-ci` — Checkstyle/Spotless/Error Prone in CI

### Other

- `java:var-local` — `var` for local type inference (Java 10+)
- `java:text-block` — text blocks for multi-line strings (Java 15+)
- `java:empty-collection-return` — empty collection, never null

## Java challenge seeds

### `java:null-return`

**Signal:** A non-void method returns `null` explicitly from one or more branches, and the return type is a single object (not a collection).

**Drill:**
- **Task:** change the return type to `Optional<T>` and wrap returns with `Optional.ofNullable`.
- **Constraint:** no `null` returned from the method; callers must be updated to handle the `Optional`.

### `java:null-collection-return`

**Signal:** A method whose return type is a `List`, `Set`, or `Map` returns `null` from at least one branch.

**Drill:**
- **Task:** replace `null` with `List.of()` / `Set.of()` / `Map.of()`.
- **Constraint:** no `null` returned from a collection-valued method; caller iteration must not need a null guard.

### `java:try-with-resources`

**Signal:** A resource implementing `AutoCloseable` (FileReader, BufferedReader, InputStream, Connection, Statement) is opened and explicitly closed in a `finally` block or not closed at all.

**Drill:**
- **Task:** refactor to try-with-resources.
- **Constraint:** no explicit `.close()` in a `finally`; the resource is guaranteed to close on all exit paths.

### `java:string-concat-loop`

**Signal:** A `for`, `while`, or enhanced-for loop body contains `s += ...` or `s = s + ...` where `s` is a `String` built up across iterations.

**Drill:**
- **Task:** rewrite using `StringBuilder` or `String.join(...)`.
- **Constraint:** no intermediate `String` allocations inside the loop; the final result is identical.

### `java:string-equals-equals`

**Signal:** `==` or `!=` comparison where one operand is a `String` type.

**Drill:**
- **Task:** replace with `.equals(...)` or `Objects.equals(...)`.
- **Constraint:** null-safety preserved; if the left operand could be null, prefer `"literal".equals(variable)` or `Objects.equals`.

### `java:record`

**Signal:** A final or effectively-immutable class with only constructor, accessors (getters), and possibly `equals`/`hashCode`/`toString` — no setters, no business logic.

**Drill:**
- **Task:** convert to a record.
- **Constraint:** all call sites still work (accessor method name changes from `getName()` to `name()` — update callers).

### `java:var-local`

**Signal:** A local variable declaration like `ArrayList<User> users = new ArrayList<User>();` or `HashMap<String, Integer> map = new HashMap<>();` where the type is clearly visible on the right side.

**Drill:**
- **Task:** replace with `var`.
- **Constraint:** only apply when the right-hand side makes the type obvious — not on method return assignments where the type isn't clear.

### `java:switch-expression`

**Signal:** A `switch` statement that assigns a value to a variable (or returns) via a series of `case X: result = ...; break;` branches.

**Drill:**
- **Task:** convert to a switch expression using `case X -> ...;` arrows.
- **Constraint:** no fall-through possible; no explicit `break`; the expression form returns the value directly.

### `java:pattern-matching-instanceof`

**Signal:** A pattern of `if (obj instanceof SomeType) { SomeType x = (SomeType) obj; ... }`.

**Drill:**
- **Task:** merge into `if (obj instanceof SomeType x) { ... }`.
- **Constraint:** no separate cast; the variable `x` is bound only inside the `if` body.

### `java:raw-type`

**Signal:** Use of a generic class without a type parameter — `List users = ...`, `Map config = ...`, `new ArrayList()`.

**Drill:**
- **Task:** add the type parameter everywhere.
- **Constraint:** no unchecked warnings remain; no casts needed at usage sites.

### `java:simpledateformat-sharing`

**Signal:** A `SimpleDateFormat` field or static field, or the same instance passed across threads.

**Drill:**
- **Task:** replace with `DateTimeFormatter` from `java.time`, stored as a `private static final`.
- **Constraint:** no `SimpleDateFormat` remaining in thread-visible scope; no thread-safety issues.

### `java:legacy-date`

**Signal:** Uses of `java.util.Date`, `java.util.Calendar`, or `java.text.SimpleDateFormat` in new code.

**Drill:**
- **Task:** migrate to `java.time` types (`Instant`, `LocalDate`, `LocalDateTime`, `ZonedDateTime`, `Duration`, `DateTimeFormatter`).
- **Constraint:** no `java.util.Date` or `Calendar` remains in the touched code; time zones are explicit where relevant.

### `java:unsynchronized-shared`

**Signal:** A class field updated by multiple threads via methods like `count++`, `value = newValue`, or similar multi-step operations, without `synchronized`, `AtomicX`, or `volatile`.

**Drill:**
- **Task:** switch to an `AtomicLong`/`AtomicInteger`/`AtomicReference` with CAS-style updates, OR synchronize the methods.
- **Constraint:** no data race remains; updates are visible across threads.

### `java:raw-thread`

**Signal:** `new Thread(runnable).start()` in application code (not test code or a framework hook).

**Drill:**
- **Task:** replace with submission to an `ExecutorService`.
- **Constraint:** the executor lifecycle is managed via try-with-resources (Java 19+) or explicit `shutdown()`.

### `java:log-string-concat`

**Signal:** A call like `log.info("user " + name + " did X")` or `log.debug("value=" + value)` — string concat in an SLF4J logger call.

**Drill:**
- **Task:** convert to SLF4J parameterized form: `log.info("user {} did X", name)`.
- **Constraint:** no `+` concat remains in the log call; concatenation cost is gone when the level is disabled.

### `java:swallowed-interrupt`

**Signal:** `catch (InterruptedException e)` with an empty body or a body that doesn't re-interrupt and doesn't propagate.

**Drill:**
- **Task:** add `Thread.currentThread().interrupt();` or propagate the exception.
- **Constraint:** the interrupt signal is not lost; thread cancellation works correctly.

### `java:collection-of`

**Signal:** Immutable-intent collections built via `new ArrayList<>(Arrays.asList(...))`, multiple `.add()` calls on a fresh list, or `Collections.unmodifiableList(new ArrayList<>(...))`.

**Drill:**
- **Task:** replace with `List.of(...)`, `Set.of(...)`, or `Map.of(...)`.
- **Constraint:** the resulting collection is immutable; no mutation is possible after construction.

