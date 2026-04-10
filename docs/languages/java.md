---
language: java
last_reviewed_against: "26.0"
upstream_version_source:
  type: endoflife
  product: oracle-jdk
---

# Java language pack

Canonical idioms, common pitfalls, mental-model shifts, and challenge seeds for modern Java (17+). This file is the **human-readable reference** for chiron's Java knowledge base. The content is mirrored into `.claude/skills/challenge/SKILL.md` at runtime for the `/challenge` command's seeded pass.

**Contributors:** when adding idioms or seeds here, also update the corresponding section in `.claude/skills/challenge/SKILL.md`. See [`CONTRIBUTING-LANGUAGE-PACKS.md`](../CONTRIBUTING-LANGUAGE-PACKS.md) for the authoring guide.

---

## Read this first (stdlib and ecosystem anchors)

Docs chiron points to most often. When introducing any of these primitives during a teach turn, offer the corresponding pointer as a "read this first."

| Primitive | Doc pointer | Used for |
|-----------|-------------|----------|
| `java.util.Optional` | `docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Optional.html` | Nullable returns done right |
| `java.util.stream` | `docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/package-summary.html` | Lazy pipelines over collections |
| `java.util.concurrent` | `docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html` | Executors, futures, concurrent collections |
| `CompletableFuture` | `docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html` | Async composition and combinators |
| `java.nio.file.Path` | `docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/file/Path.html` | Modern file system paths, replaces `java.io.File` |
| `java.time` | `docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/package-summary.html` | `Instant`, `LocalDate`, `Duration` — replaces `Date`/`Calendar` |
| Records | `docs.oracle.com/en/java/javase/21/language/records.html` | Immutable data carriers |
| Sealed classes | `docs.oracle.com/en/java/javase/21/language/sealed-classes-and-interfaces.html` | Closed type hierarchies |
| Pattern matching | `docs.oracle.com/en/java/javase/21/language/pattern-matching-switch.html` | `switch` expressions and records in patterns |
| JUnit 5 | `junit.org/junit5` | Modern test framework |
| Mockito | `site.mockito.org` | Mocking library for tests |
| SLF4J + Logback | `slf4j.org`, `logback.qos.ch` | Structured logging facade |

**Meta-resources:**

- **Effective Java (Joshua Bloch)** — the canonical style guide; read it
- **JEP index** — `openjdk.org/jeps/0` — history of language changes
- **Oracle Java Tutorials** — `docs.oracle.com/javase/tutorial` — foundational material
- **Baeldung** — `baeldung.com` — pragmatic how-tos for most stdlib topics
- **Google Java Style Guide** — `google.github.io/styleguide/javaguide.html` — a widely adopted style reference

---

## Idioms — canonical patterns worth knowing

Each idiom has: what it is, when to use it, a minimal example, and its tag for profile logging.

### Data modeling

#### 1. Records for immutable data carriers

**Tag:** `java:record`

Records (Java 14+) are the one-line way to define an immutable value class. The compiler generates the constructor, accessors, `equals`, `hashCode`, and `toString`.

```java
public record User(long id, String name, String email) {}

var alice = new User(1, "Alice", "alice@example.com");
alice.name();  // "Alice"
```

Records can have custom constructors for validation, methods, and implement interfaces. They cannot extend other classes (they implicitly extend `Record`).

#### 2. `final` fields by default

**Tag:** `java:final-fields`

Mark every instance field `final` unless you have a concrete reason to mutate it. Immutable objects are easier to reason about, thread-safe by default, and cacheable.

```java
public class Config {
    private final String host;
    private final int port;
    private final Duration timeout;

    public Config(String host, int port, Duration timeout) {
        this.host = host;
        this.port = port;
        this.timeout = timeout;
    }
    // accessors; no setters
}
```

#### 3. Sealed interfaces for closed hierarchies

**Tag:** `java:sealed-interface`

Sealed types (Java 17+) explicitly enumerate their subtypes. Combined with pattern matching, they give you discriminated unions.

```java
public sealed interface Shape permits Circle, Square, Triangle {}

public record Circle(double radius) implements Shape {}
public record Square(double side) implements Shape {}
public record Triangle(double base, double height) implements Shape {}

public static double area(Shape s) {
    return switch (s) {
        case Circle c -> Math.PI * c.radius() * c.radius();
        case Square sq -> sq.side() * sq.side();
        case Triangle t -> 0.5 * t.base() * t.height();
    };
}
```

Adding a new variant to the sealed hierarchy causes a compile error in every non-exhaustive switch — a refactoring safety net.

#### 4. Builder pattern for complex construction

**Tag:** `java:builder`

When a class has many optional parameters, provide a builder. Consider Lombok's `@Builder` annotation or a hand-written inner class.

```java
public class Email {
    private final String from;
    private final List<String> to;
    private final String subject;
    private final String body;
    private final List<String> cc;
    private final List<String> bcc;

    private Email(Builder b) {
        this.from = b.from;
        this.to = List.copyOf(b.to);
        this.subject = b.subject;
        this.body = b.body;
        this.cc = List.copyOf(b.cc);
        this.bcc = List.copyOf(b.bcc);
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String from;
        private List<String> to = new ArrayList<>();
        private String subject;
        private String body;
        private List<String> cc = new ArrayList<>();
        private List<String> bcc = new ArrayList<>();

        public Builder from(String s) { this.from = s; return this; }
        public Builder to(String s) { this.to.add(s); return this; }
        public Builder subject(String s) { this.subject = s; return this; }
        public Builder body(String s) { this.body = s; return this; }
        public Email build() { return new Email(this); }
    }
}
```

### Null handling

#### 5. `Optional<T>` for possibly-absent return values

**Tag:** `java:optional-return`

Return `Optional<T>` from methods that might not produce a value — instead of `null`. Callers must explicitly handle the empty case.

```java
public Optional<User> findById(long id) {
    var user = database.lookup(id);
    return Optional.ofNullable(user);
}

// At the call site:
findById(42).ifPresentOrElse(
    u -> log.info("found: {}", u.name()),
    () -> log.warn("user 42 missing")
);
```

**Rule:** use `Optional` for return types. Never for fields or method parameters (overhead, clumsy semantics). Never wrap a collection in `Optional` — return an empty collection instead.

#### 6. `Objects.requireNonNull` for precondition checks

**Tag:** `java:requireNonNull`

At the top of public methods, validate non-null parameters with `Objects.requireNonNull`. The resulting NPE fails fast and clearly at the boundary.

```java
public void save(User user) {
    Objects.requireNonNull(user, "user");
    // ... never have to check null again
}
```

### Error handling

#### 7. try-with-resources for `AutoCloseable`

**Tag:** `java:try-with-resources`

Any resource implementing `AutoCloseable` (files, sockets, database connections, locks) should be acquired in a try-with-resources block. Cleanup is automatic, even on exceptions.

```java
try (var reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
    return reader.lines().toList();
}
// reader.close() called automatically, even if lines() throws
```

Multiple resources in the same block close in reverse order. Suppressed exceptions are attached to the primary via `Throwable.getSuppressed()`.

#### 8. Custom exceptions for domain errors

**Tag:** `java:custom-exception`

Define domain-specific exception classes extending `RuntimeException` (for unchecked) or `Exception` (for checked). Callers can catch them specifically.

```java
public class NotFoundException extends RuntimeException {
    private final String resource;
    public NotFoundException(String resource) {
        super(resource + " not found");
        this.resource = resource;
    }
    public String resource() { return resource; }
}
```

Prefer unchecked exceptions for programming errors and domain failures. Reserve checked exceptions for recoverable I/O where the caller must handle the failure.

#### 9. Specific catch clauses, not `catch (Exception e)`

**Tag:** `java:specific-catch`

```java
try {
    return load(path);
} catch (NoSuchFileException e) {
    return defaultConfig();
} catch (IOException e) {
    log.error("read failed for {}", path, e);
    throw new ConfigLoadException(path, e);
}
```

### Stream API

#### 10. `stream().map().filter().toList()`

**Tag:** `java:stream-pipeline`

For transformations and filtering, prefer streams over manual loops. Java 16+ has `.toList()` for the terminal operation.

```java
List<String> activeNames = users.stream()
    .filter(User::isActive)
    .map(User::name)
    .toList();
```

Don't reach for streams when a plain `for` loop is clearer. Streams shine when there are multiple transformations in sequence.

#### 11. `Collectors.groupingBy` for aggregation

**Tag:** `java:collectors-groupingby`

```java
Map<Department, List<Employee>> byDept = employees.stream()
    .collect(Collectors.groupingBy(Employee::department));

Map<Department, Long> countByDept = employees.stream()
    .collect(Collectors.groupingBy(Employee::department, Collectors.counting()));
```

#### 12. `Stream.of` and `IntStream.range` for quick streams

**Tag:** `java:stream-of`

```java
// From known elements
var stream = Stream.of("a", "b", "c");

// From a range
IntStream.range(0, 10).forEach(System.out::println);

// From a collection
users.stream();
```

### Collections

#### 13. `List.of` / `Map.of` / `Set.of` for immutable literals

**Tag:** `java:collection-of`

Java 9+ has immutable factory methods. Use them instead of `Arrays.asList(...)` (which is mutable and a `List` view of an array).

```java
List<String> roles = List.of("admin", "user", "guest");
Map<String, Integer> config = Map.of("timeout", 5000, "retries", 3);
Set<Integer> allowedPorts = Set.of(80, 443, 8080);
```

#### 14. `List.copyOf` / `Map.copyOf` for defensive copies

**Tag:** `java:collection-copyof`

When taking a collection parameter that you want to store, copy it to decouple from the caller.

```java
public Config(List<String> hosts) {
    this.hosts = List.copyOf(hosts);  // immutable snapshot
}
```

### Concurrency

#### 15. `ExecutorService` over raw `Thread`

**Tag:** `java:executor-service`

Don't call `new Thread(...).start()` in application code. Use an `ExecutorService` — you get thread pooling, lifecycle management, and a clean shutdown path.

```java
try (var executor = Executors.newFixedThreadPool(8)) {
    List<Future<Result>> futures = tasks.stream()
        .map(t -> executor.submit(() -> process(t)))
        .toList();
    for (var f : futures) {
        results.add(f.get());
    }
}
```

Java 19+ supports try-with-resources on `ExecutorService` for automatic shutdown.

#### 16. `CompletableFuture` for async composition

**Tag:** `java:completablefuture`

For chaining async operations, `CompletableFuture` provides `.thenApply`, `.thenCompose`, `.thenCombine`, `.exceptionally`.

```java
CompletableFuture<Profile> profileFuture = fetchUserAsync(id)
    .thenCompose(user -> fetchProfileAsync(user.id()))
    .exceptionally(err -> defaultProfile());
```

#### 17. `ConcurrentHashMap` for shared state

**Tag:** `java:concurrent-hashmap`

Never synchronize a regular `HashMap`. Use `ConcurrentHashMap` — thread-safe without external locking, with atomic `compute`, `merge`, and `putIfAbsent` primitives.

```java
var cache = new ConcurrentHashMap<String, Result>();
cache.computeIfAbsent(key, k -> expensiveLookup(k));
```

### Path and I/O

#### 18. `Path` over `File`

**Tag:** `java:nio-path`

`java.nio.file.Path` and `Files` are the modern replacement for `java.io.File`. They work with `try-with-resources`, throw specific exceptions, and support non-default filesystems.

```java
var configPath = Path.of(System.getProperty("user.home"), ".myapp", "config.json");
if (Files.exists(configPath)) {
    var contents = Files.readString(configPath, StandardCharsets.UTF_8);
}
```

#### 19. `StandardCharsets.UTF_8` always

**Tag:** `java:standard-charsets-utf8`

Specify `StandardCharsets.UTF_8` on any read/write operation. Never rely on the platform default — it's portability poison.

### Testing

#### 20. JUnit 5 `@Test` and `@ParameterizedTest`

**Tag:** `java:junit5`

```java
class CalcTest {
    @Test
    void addsPositives() {
        assertEquals(3, Calc.add(1, 2));
    }

    @ParameterizedTest
    @CsvSource({
        "0, 0, 0",
        "1, 1, 2",
        "-1, 1, 0",
    })
    void adds(int a, int b, int expected) {
        assertEquals(expected, Calc.add(a, b));
    }
}
```

#### 21. AssertJ for fluent assertions

**Tag:** `java:assertj`

`assertThat(x).isEqualTo(y)` reads better than `assertEquals(y, x)`. The fluent API chains multiple checks and gives clearer failure messages.

```java
import static org.assertj.core.api.Assertions.assertThat;

assertThat(result)
    .isNotNull()
    .hasSize(3)
    .contains("alice", "bob");
```

### Dependency injection

#### 22. Constructor injection over field injection

**Tag:** `java:constructor-injection`

Inject dependencies via the constructor, not via `@Autowired` fields. Constructor injection makes dependencies explicit, supports immutability (`final` fields), and tests without the DI container.

```java
@Service
public class OrderService {
    private final OrderRepository repo;
    private final NotificationService notifications;

    public OrderService(OrderRepository repo, NotificationService notifications) {
        this.repo = repo;
        this.notifications = notifications;
    }
    // ...
}
```

In Spring, a single-constructor class is autowired without annotation (4.3+).

### Logging

#### 23. SLF4J parameterized logging

**Tag:** `java:slf4j-parameterized`

Use placeholders (`{}`) instead of string concatenation. The argument is only formatted if the log level is enabled.

```java
private static final Logger log = LoggerFactory.getLogger(MyClass.class);

log.info("user {} logged in from {}", user.name(), ip);
log.error("save failed for user {}", user.id(), exception);
```

Never use `log.info("user " + user.name() + " ...")` — the concatenation runs even when info is disabled.

### Pattern matching

#### 24. Pattern matching for `instanceof`

**Tag:** `java:pattern-matching-instanceof`

Java 16+ allows pattern binding in `instanceof`.

```java
// Old:
if (obj instanceof String) {
    String s = (String) obj;
    // ...
}

// New:
if (obj instanceof String s) {
    // use s directly
}
```

#### 25. Switch expressions

**Tag:** `java:switch-expression`

Switch as an expression (Java 14+) — returns a value, no fall-through, exhaustive checking for sealed types and enums.

```java
String description = switch (day) {
    case MONDAY, FRIDAY, SUNDAY -> "good";
    case TUESDAY -> "bad";
    case THURSDAY, SATURDAY -> "ok";
    case WEDNESDAY -> "meh";
};
```

### Build and tooling

#### 26. Maven or Gradle — pick one

**Tag:** `java:maven-or-gradle`

New projects: Gradle Kotlin DSL is the modern default. Existing projects: stick with whatever's in use. Don't mix build tools in the same repo.

#### 27. Checkstyle / Spotless / Error Prone in CI

**Tag:** `java:static-analysis-ci`

Run a linter (Checkstyle or Google Java Format via Spotless) and Error Prone in CI. Catch style and bug classes automatically.

### Other

#### 28. `var` for local type inference (Java 10+)

**Tag:** `java:var-local`

Use `var` for local variables where the type is obvious from the right-hand side. Don't use it when the type isn't obvious at a glance.

```java
var users = new ArrayList<User>();           // obvious
var result = loadFromApi();                  // avoid — hides the return type
```

#### 29. Text blocks for multi-line strings (Java 15+)

**Tag:** `java:text-block`

```java
var sql = """
    SELECT id, name, email
    FROM users
    WHERE active = true
    """;

var json = """
    {"name": "Alice", "age": 30}
    """;
```

#### 30. Null-safe collection returns

**Tag:** `java:empty-collection-return`

Return an empty collection, never `null`, from a method whose return type is a collection.

```java
public List<Order> orders() {
    if (orders == null) return List.of();  // empty, not null
    return List.copyOf(orders);
}
```

---

## Common pitfalls (anti-patterns)

Each pitfall has: the bug, why it's bad, the fix, and its tag.

### Null-related pitfalls

#### 1. Returning `null` from a method whose contract implies a value

**Tag:** `java:null-return`

```java
// BUG: caller crashes with NPE, must remember to null-check
public User findById(long id) {
    var row = database.lookup(id);
    if (row == null) return null;
    return toUser(row);
}
```

**Fix:** return `Optional<User>`.

```java
public Optional<User> findById(long id) {
    return Optional.ofNullable(database.lookup(id)).map(this::toUser);
}
```

#### 2. Null-checking everywhere

**Tag:** `java:defensive-null-check`

Sprinkling `if (x != null)` throughout the call graph is a sign of unclear contracts.

**Fix:** validate at the boundary with `Objects.requireNonNull`, then trust the contract internally.

#### 3. Returning `null` instead of an empty collection

**Tag:** `java:null-collection-return`

```java
// BUG: forces every caller to null-check before iterating
public List<Order> getOrders(long userId) {
    if (orders.isEmpty()) return null;
    return orders;
}
```

**Fix:** return `List.of()`, `Collections.emptyList()`, or an empty ArrayList.

### Resource handling pitfalls

#### 4. Missing `close()` on `Closeable`

**Tag:** `java:resource-leak`

```java
// BUG: file handle leaks on exception
var reader = new BufferedReader(new FileReader(path));
var line = reader.readLine();
reader.close();
```

**Fix:** try-with-resources.

```java
try (var reader = new BufferedReader(new FileReader(path))) {
    return reader.readLine();
}
```

#### 5. Swallowed exception in a finally block

**Tag:** `java:swallowed-exception-in-finally`

```java
// BUG: the original exception is lost
InputStream in = null;
try {
    in = open();
    doWork(in);
} catch (IOException e) {
    log.error("failed", e);
} finally {
    try { if (in != null) in.close(); }
    catch (IOException e) { /* ignored */ }
}
```

**Fix:** use try-with-resources.

### String pitfalls

#### 6. `String` concatenation in loops

**Tag:** `java:string-concat-loop`

```java
// BUG: quadratic time, each iteration creates a new String
String result = "";
for (var part : parts) {
    result += part;
}
```

**Fix:** `StringBuilder` or `String.join`.

```java
var result = String.join(", ", parts);

// or for more complex logic:
var sb = new StringBuilder();
for (var part : parts) {
    sb.append(part).append(", ");
}
```

#### 7. `==` on Strings

**Tag:** `java:string-equals-equals`

```java
// BUG: compares reference equality, not content
if (name == "Alice") { /* ... */ }
```

**Fix:** `.equals(...)` or `Objects.equals(...)`.

```java
if ("Alice".equals(name)) { /* ... */ }        // also null-safe on left
if (Objects.equals(name, "Alice")) { /* ... */ }
```

### Collection pitfalls

#### 8. Modifying a collection while iterating

**Tag:** `java:concurrent-modification`

```java
// BUG: throws ConcurrentModificationException
for (var user : users) {
    if (user.isInactive()) {
        users.remove(user);  // mutates the collection
    }
}
```

**Fix:** use `Iterator.remove()`, or build a new list with `.stream().filter(...).toList()`.

#### 9. `Arrays.asList(...)` as a mutable list

**Tag:** `java:arrays-aslist-mutability`

```java
// Surprise: the returned list is backed by the array
List<Integer> list = Arrays.asList(1, 2, 3);
list.add(4);  // UnsupportedOperationException
```

**Fix:** use `new ArrayList<>(Arrays.asList(...))` if you need a mutable list, or `List.of(...)` for an immutable one.

#### 10. Mutating an `unmodifiableList` wrapper

**Tag:** `java:unmodifiable-wrapper-leak`

`Collections.unmodifiableList(list)` returns a view. If you keep a reference to the original, mutations leak through.

**Fix:** copy first (`List.copyOf(list)`) or hide the original reference.

### Equality and hash pitfalls

#### 11. Overriding `equals` without `hashCode`

**Tag:** `java:equals-without-hashcode`

```java
// BUG: breaks hash-based collections (HashMap, HashSet)
public class User {
    private long id;
    @Override public boolean equals(Object o) { /* ... */ }
    // no hashCode!
}
```

**Fix:** always override both. IDEs generate them together.

```java
@Override public int hashCode() { return Long.hashCode(id); }
```

Better: use a record, which gets both for free.

#### 12. Field-mutable objects used as map keys

**Tag:** `java:mutable-map-key`

Using objects whose `hashCode` changes over time as keys in a `HashMap` causes silent lookup failures.

**Fix:** use immutable key objects (records are ideal).

### Concurrency pitfalls

#### 13. Unsynchronized access to shared mutable state

**Tag:** `java:unsynchronized-shared`

```java
// BUG: two threads can both read the old value and double-store
public class Counter {
    private long value;
    public void increment() { value++; }
    public long get() { return value; }
}
```

**Fix:** use `AtomicLong`, or synchronize, or `LongAdder` for high contention.

```java
public class Counter {
    private final AtomicLong value = new AtomicLong();
    public void increment() { value.incrementAndGet(); }
    public long get() { return value.get(); }
}
```

#### 14. `new Thread(...).start()` in application code

**Tag:** `java:raw-thread`

Creating raw threads gives you no lifecycle management and no graceful shutdown.

**Fix:** use an `ExecutorService`.

#### 15. `SimpleDateFormat` shared across threads

**Tag:** `java:simpledateformat-sharing`

`SimpleDateFormat` is not thread-safe. A shared instance produces corrupted output or exceptions.

**Fix:** use `DateTimeFormatter` from `java.time`. It's immutable and thread-safe.

```java
private static final DateTimeFormatter ISO_LOCAL = DateTimeFormatter.ISO_LOCAL_DATE;
```

### Generic pitfalls

#### 16. Raw types

**Tag:** `java:raw-type`

```java
// BUG: loses all type info
List users = loadUsers();
for (Object o : users) { /* ... */ }
```

**Fix:** always parameterize.

```java
List<User> users = loadUsers();
```

#### 17. `? extends` vs `? super` confusion

**Tag:** `java:pecs-confusion`

The PECS rule — *Producer `extends`, Consumer `super`* — applies when a generic method both reads from and writes to a collection.

```java
// Good — reads from producers
static <T> void copy(List<? extends T> src, List<? super T> dst) {
    for (T t : src) dst.add(t);
}
```

### Stream pitfalls

#### 18. Side effects in stream operations

**Tag:** `java:stream-side-effect`

```java
// BUG: modifying external state from a stream violates assumptions about parallelism and laziness
var result = new ArrayList<String>();
users.stream()
    .filter(User::isActive)
    .forEach(u -> result.add(u.name()));  // side effect
```

**Fix:** terminal operation.

```java
var result = users.stream()
    .filter(User::isActive)
    .map(User::name)
    .toList();
```

#### 19. Parallel streams without understanding

**Tag:** `java:parallel-stream-misuse`

`.parallel()` looks like a free speedup but has real costs: thread pool contention, ordering surprises, worse tail latency. Default to sequential streams.

**Fix:** only parallelize if you've benchmarked and the speedup is real.

### Exception handling pitfalls

#### 20. Catching `Exception` or `Throwable` broadly

**Tag:** `java:catch-exception-broadly`

```java
// BUG: swallows OutOfMemoryError, InterruptedException, bugs
try {
    doThing();
} catch (Exception e) {
    log.error("something failed", e);
}
```

**Fix:** catch specific exceptions.

#### 21. Swallowing `InterruptedException`

**Tag:** `java:swallowed-interrupt`

```java
// BUG: loses the interrupt signal; thread can't cancel
try {
    Thread.sleep(1000);
} catch (InterruptedException e) {
    // ignored
}
```

**Fix:** re-interrupt the current thread, or propagate.

```java
try {
    Thread.sleep(1000);
} catch (InterruptedException e) {
    Thread.currentThread().interrupt();  // restore the flag
    return;
}
```

### Date and time pitfalls

#### 22. `Date` and `Calendar` in new code

**Tag:** `java:legacy-date`

`java.util.Date` is mutable, confusingly designed, and bug-prone. `Calendar` is worse.

**Fix:** use `java.time` — `Instant`, `LocalDate`, `ZonedDateTime`, `Duration`, `Period`.

### Logging pitfalls

#### 23. String concatenation in log calls

**Tag:** `java:log-string-concat`

```java
// BUG: concat runs even when DEBUG is disabled
log.debug("processing user " + user.name() + " at " + System.currentTimeMillis());
```

**Fix:** use SLF4J placeholders.

```java
log.debug("processing user {} at {}", user.name(), System.currentTimeMillis());
```

#### 24. `System.out.println` instead of logger

**Tag:** `java:sysout-logging`

`System.out.println` bypasses the logging framework — no levels, no structured output, hard to silence.

**Fix:** use SLF4J.

### Design pitfalls

#### 25. God classes

**Tag:** `java:god-class`

A class with 20+ public methods and multiple responsibilities is a maintenance nightmare. Extract cohesive groups into their own classes.

---

## Mental-model deltas (for engineers coming from other languages)

Things that work differently in Java than in Go/Python/JavaScript/C#. Chiron calls these out when they come up in conversation.

1. **Everything non-primitive is an object reference.** Primitives (`int`, `boolean`, `double`) are value types. Everything else is a reference. Assignment copies the reference, not the object.

2. **Generics use type erasure.** At runtime, `List<String>` and `List<Integer>` are the same type. You cannot `new T[]` or `instanceof T` for a type parameter.

3. **Checked exceptions must be caught or declared.** The compiler enforces that callers either handle `IOException` or declare `throws IOException`. Runtime exceptions (`RuntimeException` subclasses) are not checked.

4. **`null` is a valid value for any reference type.** Default field values are `null`. The compiler doesn't check for nullability (unless you use an external tool like the Checker Framework).

5. **`equals` and `==` are different.** `==` compares references. `.equals` compares content (if overridden). Always use `.equals` for value comparison.

6. **`hashCode` must be consistent with `equals`.** If two objects are `.equals`, their `hashCode` must be equal. Breaking this contract corrupts `HashMap` and `HashSet`.

7. **Strings are immutable.** Every operation that "modifies" a string returns a new one. Use `StringBuilder` for accumulation.

8. **Primitives vs boxed types.** `int` is a primitive; `Integer` is a reference-typed wrapper. Autoboxing converts between them implicitly — usually fine, occasionally a performance or nullability trap.

9. **Arrays and collections are different.** `int[]` is a primitive array with fixed length. `List<Integer>` is a growable collection of boxed integers. They're not interchangeable.

10. **The JVM heap is garbage collected.** You don't `free`. The GC decides when objects are eligible for collection based on reachability.

11. **Threads are real OS threads** (before Project Loom). Creating thousands is fine; creating millions will kill your process. Use an `ExecutorService`.

12. **Virtual threads (Java 21)** are cheap, M:N-scheduled threads for I/O-bound workloads. Use `Executors.newVirtualThreadPerTaskExecutor()` for web server request handling.

13. **`static` is class-level.** A `static` method or field belongs to the class, not an instance. Often used for factory methods, utilities, and constants.

14. **Inner classes implicitly reference their enclosing instance.** This can cause memory leaks. Use `static` nested classes unless you need the outer reference.

15. **Java packages are directories, not modules.** Java 9 introduced modules (`module-info.java`) for strong encapsulation, but adoption is uneven. Most projects still use packages with public/protected/private access.

16. **`public`, `protected`, `package-private`, `private`.** Four access levels. Omitting the modifier defaults to package-private — visible within the same package.

17. **Interfaces can have default methods (Java 8+).** This is the modern way to add methods to an existing interface without breaking implementers.

18. **Anonymous inner classes vs lambdas.** Lambdas are lightweight; use them for single-method functional interfaces. Anonymous inner classes for multi-method cases (rare).

19. **`stream()` is lazy.** Intermediate operations (`.map`, `.filter`) don't execute until a terminal operation (`.collect`, `.toList`, `.forEach`).

20. **Autoboxing has performance cost.** `List<Integer>` with millions of elements allocates millions of `Integer` objects. For hot paths with large data, use primitive arrays or specialized libraries (Eclipse Collections, fastutil).

21. **`final` means different things.** On a variable: can't be reassigned. On a method: can't be overridden. On a class: can't be subclassed.

22. **Reflection is powerful but slow and unsafe.** Avoid it in hot paths. Modern frameworks use it at startup, then cache.

23. **JVM shutdown hooks run on `SIGTERM`.** Register cleanup with `Runtime.getRuntime().addShutdownHook(new Thread(...))`. Keep them fast — the JVM doesn't wait forever.

24. **`Thread.sleep` is interruptible.** If the thread is interrupted during sleep, `InterruptedException` is thrown and the flag is cleared. Handle both.

25. **`var` is inference, not dynamic typing.** The type is fixed at compile time based on the initializer. No runtime type changes.

---

## Challenge seeds

Each seed is a pre-authored drill that `/challenge` pattern-matches against source code. When the seed's `Signal` matches a file, the `Drill` becomes a concrete practice target for the user.

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

---

## Authoring new seeds

When adding a new seed to this pack:

1. **Name it** `java:<idiom-slug>` — consistent with the profile tag format.
2. **Write the Signal** in prose or pseudo-regex — concrete enough that a reader can verify a match by inspection.
3. **Write the Drill** with Task + Constraint — task is what to change, constraint is what makes it bounded (measurable, finite).
4. **Keep it small.** Drills must be ≤20 lines of change, ≤1 function touched, 5–15 minutes of focused work.
5. **Mirror into `.claude/skills/challenge/SKILL.md`.** The runtime source of truth is the command file; this document is the human-readable mirror and the contribution-PR target.
