---
language: kotlin
last_reviewed_against: "2.3"
upstream_version_source:
  type: github-release
  repo: JetBrains/kotlin
---

# Kotlin language pack

Canonical idioms, common pitfalls, mental-model shifts, and challenge seeds for modern Kotlin (1.9+ / 2.0). This file is the **human-readable reference** for chiron's Kotlin knowledge base. The content is mirrored into `.claude/skills/challenge/SKILL.md` at runtime for the `/challenge` command's seeded pass.

**Contributors:** when adding idioms or seeds here, also update the corresponding section in `.claude/skills/challenge/SKILL.md`. See [`CONTRIBUTING-LANGUAGE-PACKS.md`](../CONTRIBUTING-LANGUAGE-PACKS.md) for the authoring guide.

---

## Read this first (stdlib and ecosystem anchors)

Docs chiron points to most often. When introducing any of these primitives during a teach turn, offer the corresponding pointer as a "read this first."

| Primitive | Doc pointer | Used for |
|-----------|-------------|----------|
| Null safety | `kotlinlang.org/docs/null-safety.html` | `?`, `?.`, `?:`, `!!`, `requireNotNull` |
| Coroutines | `kotlinlang.org/docs/coroutines-overview.html` | `suspend`, structured concurrency, `Flow` |
| `kotlinx.coroutines` | `kotlinlang.org/api/kotlinx.coroutines/` | `launch`, `async`, `withContext`, `Flow`, scopes |
| Scope functions | `kotlinlang.org/docs/scope-functions.html` | `let`, `run`, `with`, `apply`, `also` |
| Sealed classes | `kotlinlang.org/docs/sealed-classes.html` | Closed hierarchies with exhaustive `when` |
| Data classes | `kotlinlang.org/docs/data-classes.html` | Immutable records with `copy`, `equals`, `componentN` |
| Extension functions | `kotlinlang.org/docs/extensions.html` | Adding behavior to existing types |
| Collections | `kotlinlang.org/docs/collections-overview.html` | Read-only vs mutable, transformations |
| `Flow` | `kotlinlang.org/docs/flow.html` | Cold async streams, `StateFlow`, `SharedFlow` |
| Delegation | `kotlinlang.org/docs/delegation.html` | `by` for interface + property delegation |
| Kotest / JUnit 5 | `kotest.io` / `junit.org/junit5` | Testing frameworks |
| Ktor / Spring Boot | `ktor.io` / `spring.io/projects/spring-boot` | Server frameworks on Kotlin |

**Meta-resources:**

- **Kotlin language reference** — `kotlinlang.org/docs/reference.html`
- **Coroutines guide** — `kotlinlang.org/docs/coroutines-guide.html` — the canonical coroutines tutorial
- **Kotlin Standard Library API** — `kotlinlang.org/api/latest/jvm/stdlib/`
- **Effective Kotlin (Marcin Moskala)** — the canonical style guide book
- **Jetpack Compose** — `developer.android.com/jetpack/compose` — UI toolkit built on Kotlin idioms

---

## Idioms — canonical patterns worth knowing

Each idiom has: what it is, when to use it, a minimal example, and its tag for profile logging.

### Null safety

#### 1. `val` by default, `var` when reassigned

**Tag:** `kotlin:val-by-default`

Declare with `val` (read-only reference) unless you plan to reassign. Kotlin reviewers treat `var` as a signal to justify — immutability is the default.

```kotlin
val users = loadUsers()    // reference can't change
var total = 0              // will accumulate
for (u in users) { total += u.balance }
```

#### 2. Safe call operator `?.`

**Tag:** `kotlin:safe-call`

`?.` short-circuits to `null` if the receiver is null — no manual null check ceremony.

```kotlin
val city: String? = user?.address?.city
val firstTag: String? = post?.tags?.firstOrNull()
```

#### 3. Elvis operator `?:`

**Tag:** `kotlin:elvis`

`?:` provides a default when the left side is null. Combine with early returns via `return` / `throw`.

```kotlin
val name = user?.name ?: "anonymous"
val id = userId ?: throw IllegalArgumentException("userId required")
```

#### 4. `?.let { }` for conditional scope

**Tag:** `kotlin:safe-let`

`?.let { ... }` runs the block only when the receiver is non-null, with the non-null value in scope as `it`.

```kotlin
user?.email?.let { email ->
    sendNotification(email)
}
```

Prefer this over `if (x != null) { x.foo() }` when the null-check result feeds an expression.

#### 5. `requireNotNull` / `checkNotNull` for preconditions

**Tag:** `kotlin:require-not-null`

At the top of functions, assert non-null inputs with `requireNotNull` (throws `IllegalArgumentException`) or `checkNotNull` (throws `IllegalStateException`). The resulting type is smart-cast to non-null.

```kotlin
fun saveUser(user: User?) {
    val validUser = requireNotNull(user) { "user must not be null" }
    database.save(validUser)
}
```

### Data modeling

#### 6. Data classes for DTOs

**Tag:** `kotlin:data-class`

`data class` generates `equals`, `hashCode`, `toString`, `copy`, and `componentN` functions for free. Perfect for immutable value objects.

```kotlin
data class User(
    val id: Long,
    val name: String,
    val email: String,
)

val alice = User(1, "Alice", "alice@example.com")
val renamed = alice.copy(name = "Alicia")
val (id, name, _) = alice  // destructuring
```

#### 7. Sealed classes for closed hierarchies

**Tag:** `kotlin:sealed-class`

`sealed class` / `sealed interface` declares a closed set of subtypes. Combined with `when`, you get exhaustive pattern matching — the compiler ensures every variant is handled.

```kotlin
sealed interface ApiResult<out T> {
    data class Success<T>(val value: T) : ApiResult<T>
    data class Failure(val error: Throwable) : ApiResult<Nothing>
    data object Loading : ApiResult<Nothing>
}

fun <T> handle(result: ApiResult<T>): String = when (result) {
    is ApiResult.Success -> "got ${result.value}"
    is ApiResult.Failure -> "error: ${result.error.message}"
    ApiResult.Loading    -> "loading..."
}
```

Adding a new sealed subtype causes a compile error in every non-exhaustive `when`. Refactoring safety net.

#### 8. `object` for singletons

**Tag:** `kotlin:object-singleton`

`object` declares a lazily-initialized, thread-safe singleton. Great for stateless services, utility holders, and sealed-class data variants that have no parameters.

```kotlin
object Clock {
    fun now(): Instant = Instant.now()
}

// Usage: Clock.now()
```

For sealed classes: `data object` (Kotlin 1.9+) gives you a singleton with a proper `toString`.

### Scope functions

#### 9. `let` for null-safe transformations

**Tag:** `kotlin:scope-let`

`let` takes the receiver as `it` and returns the block's result. Useful for chaining transformations on nullable values.

```kotlin
val length = name?.let { it.trim().length } ?: 0
```

#### 10. `apply` for object initialization

**Tag:** `kotlin:scope-apply`

`apply` executes a block with the receiver as `this` and returns the receiver. Perfect for configuring a new object in a single expression.

```kotlin
val dialog = AlertDialog.Builder(context).apply {
    setTitle("Confirm")
    setMessage("Delete this item?")
    setPositiveButton("Yes") { _, _ -> delete() }
    setNegativeButton("No", null)
}.create()
```

#### 11. `run` for scoping expressions

**Tag:** `kotlin:scope-run`

`run` takes a block with the receiver as `this` and returns the block's result. Useful when you want to compute something based on a receiver without leaking intermediates.

```kotlin
val description = user.run {
    "$name <$email> (${if (isActive) "active" else "inactive"})"
}
```

#### 12. `also` for side effects

**Tag:** `kotlin:scope-also`

`also` takes the receiver as `it`, runs the block for side effects, and returns the receiver unchanged. Useful for logging in the middle of a chain.

```kotlin
val user = loadUser(id)
    .also { logger.info("loaded user {}", it.id) }
    .copy(lastAccessedAt = Clock.now())
```

### Extension functions

#### 13. Extension functions for behavior reuse

**Tag:** `kotlin:extension-function`

Extension functions add methods to existing types without subclassing. Resolved statically at compile time. Great for utility behavior on stdlib or framework types.

```kotlin
fun String.isValidEmail(): Boolean =
    contains('@') && contains('.') && length >= 5

fun <T> List<T>.secondOrNull(): T? = if (size >= 2) this[1] else null
```

Place them in a well-named file (`StringExtensions.kt`, `ListExtensions.kt`) and import where needed.

#### 14. Extension properties

**Tag:** `kotlin:extension-property`

Like extension functions but for computed properties. Read-only; they can't have backing fields.

```kotlin
val String.lastChar: Char
    get() = this[length - 1]
```

### Collections

#### 15. Read-only collection interfaces

**Tag:** `kotlin:readonly-collections`

Kotlin distinguishes `List<T>` (read-only) from `MutableList<T>`. Default return type from a function should be the read-only interface.

```kotlin
fun activeUsers(): List<User> {  // caller can iterate but not mutate
    return users.filter { it.isActive }
}
```

The underlying JVM object might be an `ArrayList`, but the type signature controls what the caller can do.

#### 16. Collection transformations with `map`/`filter`/`fold`

**Tag:** `kotlin:collection-transforms`

Kotlin collections come with a rich functional API. Prefer these over manual loops for transformations.

```kotlin
val activeNames = users
    .filter { it.isActive }
    .map { it.name }
    .sorted()

val totalByRegion = orders
    .groupBy { it.region }
    .mapValues { (_, orders) -> orders.sumOf { it.total } }
```

### Coroutines

#### 17. `suspend` functions for async operations

**Tag:** `kotlin:suspend-function`

`suspend` marks a function as a coroutine-compatible operation that can pause without blocking a thread. Callable only from other suspend functions or coroutine builders.

```kotlin
suspend fun fetchUser(id: Long): User {
    val response = httpClient.get("/users/$id")
    return response.body()
}
```

#### 18. Structured concurrency with `CoroutineScope`

**Tag:** `kotlin:structured-concurrency`

Every coroutine belongs to a scope. When the scope is canceled, all its children are canceled. Prevents leaks and enables cooperative cancellation.

```kotlin
class UserService(private val scope: CoroutineScope) {
    fun loadAllUsers() {
        scope.launch {
            val users = fetchUsers()
            updateUi(users)
        }
    }
}
```

Android: use `viewModelScope` or `lifecycleScope`. Ktor: use the request scope. Never use `GlobalScope`.

#### 19. `async`/`await` for concurrent results

**Tag:** `kotlin:coroutine-async`

`async` starts a coroutine that returns a `Deferred<T>`. `await` joins it. Perfect for parallel independent fetches.

```kotlin
suspend fun loadDashboard(userId: Long): DashboardData = coroutineScope {
    val userDeferred = async { fetchUser(userId) }
    val ordersDeferred = async { fetchOrders(userId) }
    val notifsDeferred = async { fetchNotifications(userId) }

    DashboardData(
        user = userDeferred.await(),
        orders = ordersDeferred.await(),
        notifications = notifsDeferred.await(),
    )
}
```

The `coroutineScope { }` builder ensures cancellation cascades if any child fails.

#### 20. `withContext` for dispatcher switching

**Tag:** `kotlin:with-context`

Use `withContext(Dispatchers.IO)` to move blocking I/O off the main thread, or `Dispatchers.Default` for CPU-bound work. The scope is suspended until the block completes.

```kotlin
suspend fun loadFile(path: Path): String = withContext(Dispatchers.IO) {
    path.toFile().readText()
}
```

#### 21. `Flow` for cold async streams

**Tag:** `kotlin:flow`

`Flow<T>` is the async equivalent of `Sequence<T>`. Cold — the producer doesn't run until a terminal collector subscribes.

```kotlin
fun pollEvents(): Flow<Event> = flow {
    while (true) {
        emit(fetchNextEvent())
        delay(1000)
    }
}

// Collector:
lifecycleScope.launch {
    pollEvents()
        .filter { it.severity == Severity.High }
        .collect { event -> handle(event) }
}
```

#### 22. `StateFlow` / `SharedFlow` for hot state

**Tag:** `kotlin:state-flow`

`StateFlow<T>` is a hot flow that holds one current value — perfect for UI state. `SharedFlow<T>` is a hot multi-value broadcaster.

```kotlin
class UserViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _uiState.value = UiState.Loaded(fetchUsers())
        }
    }
}
```

### Delegation

#### 23. `by lazy` for lazy initialization

**Tag:** `kotlin:by-lazy`

`by lazy { }` initializes a property the first time it's accessed. Thread-safe by default.

```kotlin
val config: Config by lazy {
    loadConfigFromDisk()
}
```

Combine with `LazyThreadSafetyMode.NONE` if you know access is single-threaded and want to skip the lock.

#### 24. Interface delegation with `by`

**Tag:** `kotlin:interface-delegation`

Kotlin's `by` delegates an interface's implementation to another object — composition without manually writing every method.

```kotlin
interface Repository {
    fun load(id: Long): User
    fun save(user: User)
}

class LoggedRepository(
    private val delegate: Repository,
    private val logger: Logger,
) : Repository by delegate {
    override fun save(user: User) {
        logger.info("saving user {}", user.id)
        delegate.save(user)
    }
}
```

All methods not explicitly overridden are forwarded to `delegate`.

### Functional and expression style

#### 25. Single-expression functions

**Tag:** `kotlin:single-expression-fn`

When a function body is a single expression, use `=` instead of `{ return ... }`.

```kotlin
fun double(x: Int) = x * 2

fun User.displayName(): String = "$name <$email>"
```

#### 26. Trailing lambda convention

**Tag:** `kotlin:trailing-lambda`

When the last parameter of a function is a lambda, Kotlin lets you put it outside the parentheses. If it's the only parameter, you can omit the parens entirely.

```kotlin
// Instead of:
users.filter({ it.isActive })

// Prefer:
users.filter { it.isActive }

// With other params:
users.fold(0) { acc, user -> acc + user.balance }
```

### Error handling

#### 27. `Result<T>` for recoverable errors

**Tag:** `kotlin:result-type`

`Result<T>` (stdlib) wraps a success value or a `Throwable`. Use for operations that might fail without needing specific exception types at the boundary.

```kotlin
fun parseConfig(text: String): Result<Config> = runCatching {
    Json.decodeFromString<Config>(text)
}

parseConfig(input)
    .onSuccess { config -> applyConfig(config) }
    .onFailure { error -> logger.error("bad config", error) }
```

#### 28. Exception handling with `try`/`catch` for JVM interop

**Tag:** `kotlin:try-catch`

For JVM interop, standard `try`/`catch` works. Catch specific exception types, never bare `Exception`.

```kotlin
fun loadFile(path: Path): String? = try {
    path.toFile().readText()
} catch (e: NoSuchFileException) {
    logger.warn("missing file {}", path)
    null
}
```

### Testing

#### 29. Kotest idioms

**Tag:** `kotlin:kotest`

Kotest offers multiple DSLs. `StringSpec` and `ShouldSpec` are common. Matchers like `shouldBe`, `shouldContain`, `shouldHaveSize` read naturally.

```kotlin
class CalcSpec : StringSpec({
    "adds positive numbers" {
        Calc.add(1, 2) shouldBe 3
    }

    "add is commutative" {
        forAll(Arb.int(), Arb.int()) { a, b ->
            Calc.add(a, b) == Calc.add(b, a)
        }
    }
})
```

#### 30. Coroutine tests with `runTest`

**Tag:** `kotlin:runtest`

`runTest` from `kotlinx-coroutines-test` provides virtual time, controlled dispatchers, and deterministic coroutine execution for tests.

```kotlin
@Test
fun `load users returns empty on failure`() = runTest {
    val service = UserService(failingRepo)
    val result = service.loadUsers()
    result shouldBe emptyList()
}
```

---

## Common pitfalls (anti-patterns)

Each pitfall has: the bug, why it's bad, the fix, and its tag.

### Null safety pitfalls

#### 1. `!!` non-null assertion abuse

**Tag:** `kotlin:double-bang-abuse`

```kotlin
// BUG: crashes if anything in the chain is null
val city = user!!.address!!.city!!
```

**Fix:** use safe calls + Elvis or `let`.

```kotlin
val city = user?.address?.city ?: "unknown"
```

Reserve `!!` for the rare case where you genuinely have an invariant the type system can't express — and add a comment explaining why.

#### 2. Platform types from Java interop

**Tag:** `kotlin:platform-type`

Java APIs return platform types (`String!`) that Kotlin treats as nullable OR non-null — the compiler can't tell. Silently-nullable values crash unexpectedly.

**Fix:** explicitly annotate the return type when calling into Java.

```kotlin
val name: String? = javaObject.getName()  // explicit nullable
// or use require/check if you know it's non-null
val name: String = requireNotNull(javaObject.getName()) { "name required" }
```

Better: use `@Nullable` / `@NonNull` annotations on the Java side, which Kotlin respects.

#### 3. `lateinit` for values that could be optional

**Tag:** `kotlin:lateinit-abuse`

```kotlin
// BUG: UninitializedPropertyAccessException at runtime
lateinit var config: Config

fun use() {
    println(config.host)  // crashes if not initialized
}
```

**Fix:** use `val config: Config?` if it might genuinely be absent, or initialize in `init { }`.

### Coroutine pitfalls

#### 4. `GlobalScope` usage

**Tag:** `kotlin:global-scope`

```kotlin
// BUG: unstructured — coroutine outlives the enclosing work, leaks, no cancellation
GlobalScope.launch {
    fetchUsers()
}
```

**Fix:** use a structured scope (`viewModelScope`, `lifecycleScope`, a dedicated `CoroutineScope` field, or `coroutineScope { }` inside a suspend function).

#### 5. `runBlocking` in production code

**Tag:** `kotlin:run-blocking-prod`

```kotlin
// BUG: blocks the calling thread, defeats coroutines' purpose
fun loadUser(id: Long): User = runBlocking {
    fetchUserAsync(id)
}
```

**Fix:** make the caller `suspend` instead.

```kotlin
suspend fun loadUser(id: Long): User = fetchUserAsync(id)
```

`runBlocking` is for `main` functions, tests (though `runTest` is better), and interop with non-coroutine code.

#### 6. Blocking calls inside coroutines

**Tag:** `kotlin:blocking-in-coroutine`

```kotlin
// BUG: blocks the dispatcher, starves other coroutines
suspend fun loadFile(path: Path): String {
    return Files.readString(path)  // blocking I/O on whatever dispatcher we're on
}
```

**Fix:** wrap in `withContext(Dispatchers.IO)`.

```kotlin
suspend fun loadFile(path: Path): String = withContext(Dispatchers.IO) {
    Files.readString(path)
}
```

#### 7. Catching `CancellationException`

**Tag:** `kotlin:catch-cancellation`

```kotlin
// BUG: swallows cancellation, breaks structured concurrency
try {
    someSuspendFunction()
} catch (e: Exception) {
    logger.error("failed", e)
}
```

**Fix:** re-throw `CancellationException` explicitly, or use `CancellationException` as a separate catch.

```kotlin
try {
    someSuspendFunction()
} catch (e: CancellationException) {
    throw e
} catch (e: Exception) {
    logger.error("failed", e)
}
```

Better: use `coroutineScope { }` which handles this correctly, or catch only the specific exception types you expect.

### Mutability pitfalls

#### 8. `var` when `val` would work

**Tag:** `kotlin:var-abuse`

```kotlin
// BUG: implies reassignment that never happens, hides intent
var users = loadUsers()
return users
```

**Fix:** `val`.

#### 9. `MutableList`/`MutableMap` exposed as API

**Tag:** `kotlin:mutable-collection-api`

```kotlin
// BUG: callers can mutate internal state
class Repository {
    val items: MutableList<Item> = mutableListOf()
}
```

**Fix:** expose the read-only interface; keep the mutable form private.

```kotlin
class Repository {
    private val _items: MutableList<Item> = mutableListOf()
    val items: List<Item> get() = _items
}
```

#### 10. Data class with `var` properties

**Tag:** `kotlin:data-class-var`

```kotlin
// BUG: data class equality is surprising with mutable fields
data class User(var id: Long, var name: String)
```

**Fix:** use `val`.

```kotlin
data class User(val id: Long, val name: String)
// Updates via copy():
val renamed = user.copy(name = "new name")
```

### Java interop pitfalls

#### 11. Java-style getters/setters

**Tag:** `kotlin:java-style-getters`

```kotlin
// BUG: Java idioms leaking into Kotlin
class User {
    private var name: String = ""
    fun getName(): String = name
    fun setName(value: String) { name = value }
}
```

**Fix:** use Kotlin properties.

```kotlin
class User(var name: String = "")
```

#### 12. Extension properties with side effects

**Tag:** `kotlin:extension-side-effect`

Extension properties should be pure computed values. Don't hide I/O or mutation behind a property getter — callers expect a property read to be cheap.

**Fix:** use an extension function instead.

### Collection pitfalls

#### 13. `.first()` on possibly-empty collection

**Tag:** `kotlin:first-on-empty`

```kotlin
// BUG: throws NoSuchElementException if empty
val admin = users.first { it.role == "admin" }
```

**Fix:** use `.firstOrNull` and handle the null case.

```kotlin
val admin = users.firstOrNull { it.role == "admin" }
    ?: error("no admin user found")
```

#### 14. Sequence vs collection confusion

**Tag:** `kotlin:sequence-confusion`

`users.filter { ... }.map { ... }.first()` materializes an intermediate list. For large collections with short-circuit terminal ops, use `asSequence()`.

```kotlin
val firstAdmin = users
    .asSequence()
    .filter { it.role == "admin" }
    .map { it.copy(lastSeen = Clock.now()) }
    .first()
```

### Exception handling pitfalls

#### 15. Catching `Throwable`

**Tag:** `kotlin:catch-throwable`

`catch (e: Throwable)` catches `Error` subclasses (`OutOfMemoryError`, `StackOverflowError`) and JVM internals that you can't meaningfully handle.

**Fix:** catch `Exception` at most, preferably specific subtypes.

#### 16. Swallowing exceptions

**Tag:** `kotlin:swallow-exception`

```kotlin
// BUG: silent failure
try { doThing() } catch (e: Exception) { /* ignored */ }
```

**Fix:** log, re-throw, or handle explicitly.

### Design pitfalls

#### 17. Abstract classes where sealed would work

**Tag:** `kotlin:abstract-instead-of-sealed`

Open class hierarchies that are actually closed (all subclasses live in the same module) should be `sealed` — the compiler then enforces exhaustiveness.

#### 18. Nullable vs sealed for "result or error"

**Tag:** `kotlin:nullable-for-errors`

Returning `User?` for "user or not found" loses information about the error. Use a sealed class when there's more than one failure mode.

```kotlin
// Better:
sealed interface LoadResult {
    data class Success(val user: User) : LoadResult
    data object NotFound : LoadResult
    data class Error(val cause: Throwable) : LoadResult
}
```

### Scope function pitfalls

#### 19. Overusing scope functions

**Tag:** `kotlin:scope-fn-overuse`

```kotlin
// BUG: chain of scope functions obscures what's happening
user.let { it }.apply { validate() }.run { copy(name = name.trim()) }
```

**Fix:** straight code is usually clearer.

```kotlin
user.validate()
val cleaned = user.copy(name = user.name.trim())
```

Use scope functions when they genuinely reduce noise, not as a reflex.

### Testing pitfalls

#### 20. Tests that depend on wall-clock time

**Tag:** `kotlin:test-wall-clock`

Tests calling `Clock.now()` or `System.currentTimeMillis()` directly are non-deterministic. Inject a clock abstraction and fake it in tests.

#### 21. `runBlocking` in suspend function tests

**Tag:** `kotlin:runblocking-in-tests`

```kotlin
// BUG: uses real dispatchers, slow and flaky
@Test fun test() = runBlocking {
    val result = suspendFunction()
    assertEquals(expected, result)
}
```

**Fix:** use `runTest` from `kotlinx-coroutines-test` — virtual time, controlled dispatchers.

### Build and tooling pitfalls

#### 22. Missing `ktlint` / `detekt` in CI

**Tag:** `kotlin:no-static-analysis`

Projects without `ktlint` (formatting) and `detekt` (static analysis) accumulate style drift and subtle bugs. Add both to CI and treat violations as failures.

#### 23. Not using explicit API mode for libraries

**Tag:** `kotlin:no-explicit-api`

Libraries should enable `explicitApi()` in `build.gradle.kts` — forces every public declaration to have an explicit visibility modifier and return type.

### Resource handling pitfalls

#### 24. Missing `use {}` for `Closeable`

**Tag:** `kotlin:missing-use`

```kotlin
// BUG: leaks the stream on exception
val reader = FileReader(path)
val content = reader.readText()
reader.close()
```

**Fix:** `use`.

```kotlin
val content = FileReader(path).use { it.readText() }
```

### Performance pitfalls

#### 25. Unnecessary object creation in hot paths

**Tag:** `kotlin:hot-path-allocation`

Lambdas that capture variables from their enclosing scope allocate a closure object. In hot paths, prefer `inline` functions or avoid captures entirely. Profile before optimizing.

---

## Mental-model deltas (for engineers coming from Java / Scala / TypeScript)

Things that work differently in Kotlin than in other JVM or typed languages. Chiron calls these out when they come up in conversation.

1. **Null safety is in the type system.** `String` and `String?` are different types. The compiler enforces null checks at use sites. No more `NullPointerException` — unless you use `!!`.

2. **Everything is an expression.** `if`, `when`, `try` all return values. Assignment is a statement, but most control flow is not.

3. **No checked exceptions.** Kotlin inherits Java's exception model but drops checked exceptions. You don't declare `throws` clauses; callers don't have to `try/catch` or propagate.

4. **Smart casts.** After `if (x is String)`, the compiler knows `x` is `String` in that branch. Same for `if (x != null)`. Saves ceremony.

5. **`when` is more powerful than `switch`.** Matches on types, ranges, values, and arbitrary conditions. Returns a value. Exhaustive when matched against a sealed class or enum.

6. **Primary constructors.** Declared in the class header: `class User(val id: Long, val name: String)`. Parameters marked `val` / `var` become properties automatically.

7. **`object` is a keyword.** Declares a singleton. `companion object` inside a class is the Kotlin equivalent of Java's static members.

8. **Extension functions are resolved statically.** `fun String.foo()` is a static function that takes a `String` as its receiver. Not polymorphic — you can't override them via inheritance.

9. **`Unit` is not `void`.** `Unit` is a real type with a single value, returned by functions that don't produce a meaningful result. At the JVM level it compiles to `void`, but in the type system it behaves like any other type.

10. **`Nothing` is the bottom type.** A function returning `Nothing` never returns normally — it always throws or loops. Useful for functions like `throw IllegalStateException(...)`.

11. **Operators are functions.** `a + b` calls `a.plus(b)`. You can overload operators by defining `plus`, `minus`, `times`, `get`, etc.

12. **Infix functions.** Functions marked `infix` can be called without the dot: `1 to "one"`, `4 shl 2`. Used for DSL-like code.

13. **Function types are first-class.** `val op: (Int, Int) -> Int = { a, b -> a + b }`. Functions can be passed, returned, and stored.

14. **Inline functions.** `inline fun <T> runCatching(block: () -> T)` — the function body is inlined at the call site, eliminating lambda allocation overhead. Used for stdlib performance.

15. **Reified generics (with `inline`).** `inline fun <reified T> parse(s: String): T` — type parameters can be inspected at runtime inside inline functions.

16. **Default parameter values.** No method overloading needed — just provide defaults: `fun greet(name: String, greeting: String = "Hello")`.

17. **Named arguments.** `greet(name = "Alice", greeting = "Hi")` — cuts down on accidents from positional arg order.

18. **`typealias` for naming.** `typealias UserId = Long` gives a name to an existing type without creating a new one. Doesn't prevent passing the wrong kind.

19. **Destructuring declarations.** `val (id, name) = user` works on data classes (via `componentN()` functions) and Pair/Triple.

20. **Trailing commas are legal.** `fun f(a: Int, b: Int,)` — reduces diff noise when adding new parameters.

21. **String templates.** `"Hello, $name"` — simple interpolation. `"Value: ${user.name.uppercase()}"` for expressions.

22. **`when` as an expression or statement.** `when(x) { ... }` can replace long if/else chains. When used as an expression over an enum or sealed class, it must be exhaustive.

23. **Coroutines are user-space.** `suspend` functions don't use OS threads. The runtime multiplexes them onto a small pool of actual threads.

24. **Flow is cold.** A `Flow<T>` doesn't emit until you call a terminal collector. Creating a flow is cheap; subscribing starts the work.

25. **Kotlin/Native, Kotlin/JS, Kotlin/JVM.** Kotlin compiles to multiple targets. Multiplatform projects share business logic across JVM, iOS (native), and the browser (JS).

---

## Challenge seeds

Each seed is a pre-authored drill that `/challenge` pattern-matches against source code.

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

---

## Authoring new seeds

When adding a new seed to this pack:

1. **Name it** `kotlin:<idiom-slug>` — consistent with the profile tag format.
2. **Write the Signal** in prose or pseudo-regex — concrete enough that a reader can verify a match by inspection.
3. **Write the Drill** with Task + Constraint — task is what to change, constraint is what makes it bounded (measurable, finite).
4. **Keep it small.** Drills must be ≤20 lines of change, ≤1 function touched, 5–15 minutes of focused work.
5. **Mirror into `.claude/skills/challenge/SKILL.md`.** The runtime source of truth is the command file; this document is the human-readable mirror and the contribution-PR target.
