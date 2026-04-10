# Swift language pack

Canonical idioms, common pitfalls, mental-model shifts, and challenge seeds for modern Swift (5.9+). This file is the **human-readable reference** for chiron's Swift knowledge base. The content is mirrored into `.claude/skills/challenge/SKILL.md` at runtime for the `/challenge` command's seeded pass.

**Contributors:** when adding idioms or seeds here, also update the corresponding section in `.claude/skills/challenge/SKILL.md`. See [`CONTRIBUTING-LANGUAGE-PACKS.md`](../CONTRIBUTING-LANGUAGE-PACKS.md) for the authoring guide.

---

## Read this first (stdlib and ecosystem anchors)

Docs chiron points to most often. When introducing any of these primitives during a teach turn, offer the corresponding pointer as a "read this first."

| Primitive | Doc pointer | Used for |
|-----------|-------------|----------|
| Optional | `developer.apple.com/documentation/swift/optional` | Nullable values with `?`, `if let`, `guard let` |
| `Result<Success, Failure>` | `developer.apple.com/documentation/swift/result` | Throwing vs. Result-based error handling |
| `async/await` | `docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/` | Structured concurrency (Swift 5.5+) |
| Actors | `docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/#Actors` | Data-race-free concurrent state |
| `Codable` | `developer.apple.com/documentation/swift/codable` | Serialization to/from JSON, plist |
| Protocols | `docs.swift.org/swift-book/documentation/the-swift-programming-language/protocols/` | Behavior contracts + extensions |
| Generics | `docs.swift.org/swift-book/documentation/the-swift-programming-language/generics/` | Type parameters and `where` clauses |
| Swift Standard Library | `developer.apple.com/documentation/swift/swift_standard_library` | Collections, strings, numbers |
| Swift Testing | `developer.apple.com/documentation/testing` | Modern test framework (Swift 5.9+) |
| XCTest | `developer.apple.com/documentation/xctest` | Legacy test framework |
| `Foundation` | `developer.apple.com/documentation/foundation` | Dates, URLs, file system, JSON |
| Swift Package Manager | `swift.org/package-manager/` | Dependency management |

**Meta-resources:**

- **The Swift Programming Language book** — `docs.swift.org/swift-book/` — canonical reference
- **Swift Evolution proposals** — `github.com/apple/swift-evolution` — history of language changes
- **Swift API Design Guidelines** — `swift.org/documentation/api-design-guidelines/` — naming, clarity, and usage rules
- **WWDC sessions** — `developer.apple.com/wwdc/` — deep dives on concurrency, SwiftUI, macros
- **Point-Free** — `pointfree.co` — episodic explorations of advanced Swift patterns
- **Swift Forums** — `forums.swift.org` — community discussions and language design

---

## Idioms — canonical patterns worth knowing

Each idiom has: what it is, when to use it, a minimal example, and its tag for profile logging.

### Value types and immutability

#### 1. `struct` by default, `class` when reference semantics needed

**Tag:** `swift:struct-by-default`

Swift prefers value types. Use `struct` for almost everything; reach for `class` only when you need reference semantics (identity, shared mutation, inheritance from an Objective-C base class).

```swift
struct User {
    let id: Int64
    let name: String
    let email: String
}

// Reference semantics only when needed:
final class ConnectionPool {
    private var connections: [Connection] = []
}
```

Value types are thread-safe, copyable, and easier to reason about.

#### 2. `let` by default, `var` when reassigned

**Tag:** `swift:let-by-default`

Declare with `let` unless reassignment is needed. Swift reviewers flag unnecessary `var` — immutability is the expectation.

```swift
let users = await loadUsers()   // reference won't change
var total = 0                   // will accumulate
for user in users {
    total += user.balance
}
```

#### 3. Immutable `struct` with computed properties

**Tag:** `swift:immutable-struct`

For domain objects, all stored properties should be `let`. Derived values go in computed properties.

```swift
struct Order {
    let id: Int64
    let items: [LineItem]
    let discount: Decimal

    var subtotal: Decimal {
        items.map(\.price).reduce(0, +)
    }
    var total: Decimal {
        subtotal - discount
    }
}
```

### Optionals and null safety

#### 4. `if let` / `guard let` for optional unwrapping

**Tag:** `swift:if-let-guard-let`

Never force-unwrap (`!`) when a safe alternative exists. `if let` introduces a non-nil binding in a conditional branch; `guard let` does the same with early exit.

```swift
func greet(_ user: User?) -> String {
    guard let user else { return "hello, stranger" }
    return "hello, \(user.name)"
}

if let email = user.email, email.contains("@") {
    sendNotification(to: email)
}
```

#### 5. Nil-coalescing operator `??`

**Tag:** `swift:nil-coalescing`

`??` returns a default when the left side is `nil`.

```swift
let timeout = config.timeout ?? 5.0
let name = user?.name ?? "anonymous"
```

#### 6. Optional chaining `?.`

**Tag:** `swift:optional-chaining`

`?.` short-circuits to `nil` if any link in the chain is nil.

```swift
let city = user?.address?.city
let firstTag = post?.tags?.first
```

### Enums and pattern matching

#### 7. Enums with associated values

**Tag:** `swift:enum-associated-values`

Swift enums are true sum types — each case can carry associated values. Model finite sets of states cleanly.

```swift
enum LoadResult {
    case loading
    case success(User)
    case failure(Error)
    case notFound
}

func handle(_ result: LoadResult) -> String {
    switch result {
    case .loading:
        return "loading..."
    case .success(let user):
        return "got \(user.name)"
    case .failure(let error):
        return "error: \(error.localizedDescription)"
    case .notFound:
        return "not found"
    }
}
```

#### 8. `switch` with exhaustive matching

**Tag:** `swift:exhaustive-switch`

`switch` on an enum must be exhaustive — the compiler enforces every case. Adding a new case causes compile errors everywhere it's handled.

```swift
switch event {
case .tap(let point): handleTap(point)
case .swipe(let direction): handleSwipe(direction)
case .longPress: handleLongPress()
// Compiler requires handling every case — no default needed for enums.
}
```

#### 9. `switch` with `where` clauses

**Tag:** `swift:switch-where`

Add `where` clauses to switch cases for additional filtering.

```swift
switch user {
case .admin(let u) where u.isActive:
    grantFullAccess(u)
case .admin:
    denyAccess()
case .member(let u) where u.yearsActive > 5:
    grantVeteranAccess(u)
case .member:
    grantBasicAccess()
case .guest:
    grantLimitedAccess()
}
```

### Protocols and extensions

#### 10. Protocol-oriented programming

**Tag:** `swift:protocol-oriented`

Prefer protocols over class inheritance. Define a behavior contract with a protocol; extend any type to conform.

```swift
protocol Identifiable {
    var id: Int64 { get }
}

protocol Displayable {
    var displayName: String { get }
}

extension User: Identifiable, Displayable {
    var displayName: String { "\(name) <\(email)>" }
}
```

#### 11. Protocol extensions for default implementations

**Tag:** `swift:protocol-extension`

Extend a protocol to provide default implementations. Types conforming to the protocol get the behavior for free unless they override it.

```swift
protocol Named {
    var firstName: String { get }
    var lastName: String { get }
}

extension Named {
    var fullName: String { "\(firstName) \(lastName)" }
}

struct Person: Named {
    let firstName: String
    let lastName: String
    // `fullName` comes from the protocol extension
}
```

#### 12. Generic protocols with associated types

**Tag:** `swift:associated-type`

Protocols can declare placeholder types that the conforming type chooses. Enables generic abstractions.

```swift
protocol Container {
    associatedtype Element
    mutating func append(_ item: Element)
    var count: Int { get }
    subscript(i: Int) -> Element { get }
}

struct IntStack: Container {
    var items: [Int] = []
    mutating func append(_ item: Int) { items.append(item) }
    var count: Int { items.count }
    subscript(i: Int) -> Int { items[i] }
}
```

### Error handling

#### 13. Throwing functions with `try`/`catch`

**Tag:** `swift:throws-try-catch`

Mark failing functions `throws`. Callers must use `try`, `try?`, or `try!`. `try!` crashes on error and should be rare.

```swift
enum ConfigError: Error {
    case fileNotFound(path: String)
    case invalidFormat(line: Int)
}

func loadConfig(from path: String) throws -> Config {
    guard FileManager.default.fileExists(atPath: path) else {
        throw ConfigError.fileNotFound(path: path)
    }
    // ...
    return Config(...)
}

do {
    let config = try loadConfig(from: "/etc/app.conf")
    apply(config)
} catch ConfigError.fileNotFound(let path) {
    print("missing config: \(path)")
} catch {
    print("config load failed: \(error)")
}
```

#### 14. `Result<Success, Failure>` for callback-style APIs

**Tag:** `swift:result-type`

Use `Result<T, E>` when you need to pass a value-or-error through a closure, store it, or serialize it. Throwing functions are preferred for direct calls.

```swift
func fetchUser(id: Int64, completion: @escaping (Result<User, Error>) -> Void) {
    // ...
}

fetchUser(id: 42) { result in
    switch result {
    case .success(let user): display(user)
    case .failure(let error): logError(error)
    }
}
```

#### 15. Custom `Error` enums

**Tag:** `swift:custom-error-enum`

Define a domain-specific enum conforming to `Error`. Each case represents a distinct failure mode.

```swift
enum NetworkError: Error {
    case invalidURL
    case timeout(Duration)
    case httpStatus(Int)
    case decodingFailed(Error)
}
```

### Async concurrency

#### 16. `async`/`await` for asynchronous code

**Tag:** `swift:async-await`

Mark async functions `async`. Call them with `await`. The compiler rewrites the function into a state machine; `await` suspends without blocking the thread.

```swift
func loadUser(id: Int64) async throws -> User {
    let data = try await URLSession.shared.data(from: url(id))
    return try JSONDecoder().decode(User.self, from: data.0)
}

// Call site:
let user = try await loadUser(id: 42)
```

#### 17. `async let` for concurrent bindings

**Tag:** `swift:async-let`

`async let` starts a task immediately and binds its eventual result to a name. Multiple `async let` bindings run concurrently.

```swift
func loadDashboard(userId: Int64) async throws -> Dashboard {
    async let user = loadUser(id: userId)
    async let orders = loadOrders(userId: userId)
    async let notifications = loadNotifications(userId: userId)

    return Dashboard(
        user: try await user,
        orders: try await orders,
        notifications: try await notifications,
    )
}
```

#### 18. `TaskGroup` for dynamic parallelism

**Tag:** `swift:task-group`

When the number of parallel tasks is determined at runtime, use `withTaskGroup`.

```swift
func fetchAllPages(urls: [URL]) async throws -> [Data] {
    try await withThrowingTaskGroup(of: Data.self) { group in
        for url in urls {
            group.addTask {
                try await URLSession.shared.data(from: url).0
            }
        }
        var results: [Data] = []
        for try await data in group {
            results.append(data)
        }
        return results
    }
}
```

#### 19. Actors for isolated state

**Tag:** `swift:actor`

`actor` types isolate their mutable state — only one task at a time can access their properties. Eliminates data races at compile time.

```swift
actor Counter {
    private var value: Int = 0

    func increment() {
        value += 1
    }

    func current() -> Int {
        value
    }
}

// Usage:
let counter = Counter()
await counter.increment()
let n = await counter.current()
```

#### 20. `@MainActor` for UI-thread isolation

**Tag:** `swift:main-actor`

Mark UI code with `@MainActor`. The compiler enforces main-thread execution; calls from other actors automatically suspend and hop over.

```swift
@MainActor
final class UserViewModel {
    @Published private(set) var users: [User] = []

    func load() async {
        users = try? await repository.loadUsers() ?? []
    }
}
```

### Codable and JSON

#### 21. `Codable` for JSON encoding/decoding

**Tag:** `swift:codable`

Conform a type to `Codable` (alias for `Encodable & Decodable`) to get automatic JSON serialization. Customize with `CodingKeys` when property names differ from JSON keys.

```swift
struct User: Codable {
    let id: Int64
    let name: String
    let email: String
    let joinedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case email
        case joinedAt = "joined_at"
    }
}

let user = try JSONDecoder().decode(User.self, from: data)
let encoded = try JSONEncoder().encode(user)
```

### Property wrappers

#### 22. Property wrappers for reusable behavior

**Tag:** `swift:property-wrapper`

Property wrappers encapsulate common patterns — `@State`, `@Published`, `@AppStorage`, custom ones. The wrapper intercepts get/set and can add side effects.

```swift
@propertyWrapper
struct Clamped<Value: Comparable> {
    private var value: Value
    let range: ClosedRange<Value>

    init(wrappedValue: Value, _ range: ClosedRange<Value>) {
        self.range = range
        self.value = min(max(wrappedValue, range.lowerBound), range.upperBound)
    }

    var wrappedValue: Value {
        get { value }
        set { value = min(max(newValue, range.lowerBound), range.upperBound) }
    }
}

struct Config {
    @Clamped(0...100) var percentage: Int = 50
}
```

### Generics

#### 23. Generic functions with `where` clauses

**Tag:** `swift:generic-where`

Constrain generic type parameters with `where` clauses for clarity.

```swift
func maximum<T: Collection>(_ items: T) -> T.Element?
    where T.Element: Comparable
{
    items.max()
}
```

#### 24. Opaque return types with `some`

**Tag:** `swift:some-opaque`

Return `some Protocol` to hide the concrete type while preserving type identity across calls.

```swift
func makeShape() -> some Shape {
    Rectangle(width: 10, height: 20)
}
```

Caller knows it's a `Shape` — can't name or compare the concrete type, but also doesn't need to.

#### 25. Existential types with `any`

**Tag:** `swift:any-existential`

`any Protocol` creates a type-erased container. Use when you need heterogeneous collections of different concrete types.

```swift
let shapes: [any Shape] = [Circle(radius: 5), Rectangle(width: 10, height: 20)]
for shape in shapes {
    print(shape.area)
}
```

Prefer `some` when you don't need the erasure.

### Memory management and closures

#### 26. `[weak self]` in long-lived closures

**Tag:** `swift:weak-self`

Closures that outlive the enclosing type must not retain `self` strongly — use `[weak self]` to break the cycle.

```swift
class DataLoader {
    func load() {
        Task { [weak self] in
            guard let self else { return }
            let data = try? await self.service.fetch()
            await self.update(data)
        }
    }
}
```

For short-lived closures (executed immediately in the enclosing scope), `self` is fine.

### Testing

#### 27. Swift Testing framework

**Tag:** `swift:swift-testing`

Swift 5.9+ ships with the new Swift Testing framework. Declarative, supports parametrization and parallel execution out of the box.

```swift
import Testing

@Test func adds_two_numbers() {
    #expect(Calc.add(1, 2) == 3)
}

@Test("adds is commutative", arguments: [
    (0, 0, 0),
    (1, 1, 2),
    (-1, 1, 0),
])
func adds(a: Int, b: Int, expected: Int) {
    #expect(Calc.add(a, b) == expected)
}
```

### Build and packaging

#### 28. Swift Package Manager `Package.swift`

**Tag:** `swift:spm-package`

Define dependencies and targets in `Package.swift`. Canonical for Swift libraries.

```swift
// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "MyLib",
    platforms: [.macOS(.v13), .iOS(.v16)],
    products: [
        .library(name: "MyLib", targets: ["MyLib"]),
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-collections.git", from: "1.0.0"),
    ],
    targets: [
        .target(name: "MyLib", dependencies: [.product(name: "Collections", package: "swift-collections")]),
        .testTarget(name: "MyLibTests", dependencies: ["MyLib"]),
    ]
)
```

### Other

#### 29. String interpolation

**Tag:** `swift:string-interpolation`

Use `\(expression)` inside string literals for interpolation. Supports format specifiers and custom interpolations.

```swift
let message = "Hello, \(user.name)! You have \(count) unread messages."
let price = "Total: \(String(format: "%.2f", amount)) USD"
```

#### 30. `defer` for cleanup

**Tag:** `swift:defer`

`defer` schedules a block to run when the current scope exits, regardless of how (normal return, error, etc.).

```swift
func loadFile(at path: String) throws -> String {
    let file = try FileHandle(forReadingFrom: URL(fileURLWithPath: path))
    defer { try? file.close() }
    return try String(data: file.readToEnd() ?? Data(), encoding: .utf8) ?? ""
}
```

Order is LIFO when multiple `defer`s exist.

---

## Common pitfalls (anti-patterns)

Each pitfall has: the bug, why it's bad, the fix, and its tag.

### Optional pitfalls

#### 1. Force unwrap (`!`)

**Tag:** `swift:force-unwrap`

```swift
// BUG: crashes if the map lookup or JSON field is missing
let user = users["admin"]!
let name = dict["name"]!
let firstItem = items.first!
```

**Fix:** use `guard let` / `if let` / `??`.

```swift
guard let user = users["admin"] else {
    throw UserError.adminMissing
}
let name = dict["name"] ?? "unknown"
```

Reserve `!` for IBOutlets and genuinely-always-non-nil values, with a comment explaining why.

#### 2. `as!` forced downcast

**Tag:** `swift:force-cast`

```swift
// BUG: crashes if the cast fails
let user = any as! User
let label = subview as! UILabel
```

**Fix:** use conditional `as?` and handle the nil case.

```swift
guard let user = any as? User else {
    throw CastError.notAUser
}
```

#### 3. `try!` on throwing calls

**Tag:** `swift:force-try`

```swift
// BUG: crashes on any error
let config = try! loadConfig(from: "/etc/app.conf")
```

**Fix:** propagate with `try` or handle with `do`/`catch`.

```swift
let config = try loadConfig(from: "/etc/app.conf")
// or:
let config = (try? loadConfig(from: "/etc/app.conf")) ?? .default
```

### Reference vs value type pitfalls

#### 4. `class` where `struct` would do

**Tag:** `swift:class-over-struct`

Reaching for `class` out of Java/C# habit. Swift prefers value types for immutable data.

**Fix:** use `struct` unless you specifically need reference semantics, shared mutation, or Objective-C interop.

#### 5. Non-final classes without inheritance intent

**Tag:** `swift:non-final-class`

```swift
// BUG: open for subclassing by accident
class UserService {
    // ...
}
```

**Fix:** mark `final` unless you designed it for inheritance.

```swift
final class UserService {
    // ...
}
```

`final` enables JIT optimizations and prevents unintended subclassing.

### Concurrency pitfalls

#### 6. Blocking calls inside `async` functions

**Tag:** `swift:blocking-in-async`

```swift
// BUG: blocks the executor thread
func readFile(_ path: String) async throws -> String {
    try String(contentsOfFile: path)  // synchronous I/O
}
```

**Fix:** use async alternatives (`URLSession.shared.data`, `FileHandle.AsyncBytes`) or wrap with `Task.detached` if no async alternative exists.

#### 7. `Task { ... }` without a parent scope

**Tag:** `swift:unstructured-task`

```swift
// BUG: unstructured task; no lifecycle tied to the caller
func start() {
    Task {
        await doLongRunningWork()
    }
}
```

**Fix:** use structured concurrency — `async let` or `TaskGroup` — so cancellation propagates. Or store the `Task` reference and cancel it explicitly when the owner is deallocated.

#### 8. `DispatchQueue.main.async` instead of `@MainActor`

**Tag:** `swift:dispatch-main-async`

```swift
// BUG: mixes old and new concurrency models; harder to reason about
Task {
    let data = try await fetchData()
    DispatchQueue.main.async {
        self.display(data)
    }
}
```

**Fix:** annotate the UI code with `@MainActor` and let the compiler hop over.

```swift
@MainActor
func display(_ data: Data) { /* ... */ }

Task {
    let data = try await fetchData()
    await display(data)  // compiler ensures main-thread dispatch
}
```

#### 9. Missing `await` on async calls

**Tag:** `swift:missing-await`

```swift
// BUG: constructs an unused Task, the work is lost
fetchUser(id: 42)  // returns Task<User, Error>, discarded
```

**Fix:** `await` the call (and make the caller `async`).

### Memory management pitfalls

#### 10. Strong `self` capture in long-lived closures

**Tag:** `swift:strong-self-capture`

```swift
// BUG: retain cycle — closure keeps `self` alive forever
class DataLoader {
    var completion: (() -> Void)?

    func load() {
        service.fetch { [self] data in
            self.handle(data)
            self.completion?()
        }
    }
}
```

**Fix:** `[weak self]` + `guard let self`.

```swift
service.fetch { [weak self] data in
    guard let self else { return }
    self.handle(data)
    self.completion?()
}
```

### Error handling pitfalls

#### 11. Catching `Error` broadly without logging

**Tag:** `swift:silent-catch`

```swift
// BUG: errors silently vanish
do {
    try doWork()
} catch {
    // nothing
}
```

**Fix:** log, re-throw, or handle with specific cases.

```swift
do {
    try doWork()
} catch let error as NetworkError {
    logger.error("network: \(error)")
    throw error
} catch {
    logger.error("unexpected: \(error)")
    throw error
}
```

#### 12. `try?` masking bugs

**Tag:** `swift:try-question-abuse`

```swift
// BUG: caller can't tell if the operation failed or returned nil
let user = try? fetchUser(id: 42)
```

`try?` is fine when you genuinely don't care about the error details. But using it everywhere hides real bugs.

**Fix:** use `do`/`catch` and decide what to do with the error.

### String pitfalls

#### 13. `NSString` usage in pure Swift code

**Tag:** `swift:nsstring`

```swift
// BUG: bridges to Objective-C, less efficient than Swift String
let s = NSString(string: "hello")
let upper = s.uppercased
```

**Fix:** use Swift `String` methods directly.

```swift
let s = "hello"
let upper = s.uppercased()
```

#### 14. String concatenation in loops

**Tag:** `swift:string-concat-loop`

```swift
// BUG: quadratic allocation
var result = ""
for part in parts {
    result += part
}
```

**Fix:** use `joined(separator:)`.

```swift
let result = parts.joined(separator: "")
```

### Collection pitfalls

#### 15. `.first` / `.last` on possibly-empty collection without handling

**Tag:** `swift:first-on-possibly-empty`

```swift
// BUG: force unwrap on potentially-empty array
let firstUser = users.first!
```

**Fix:** `guard let` or `??`.

```swift
guard let firstUser = users.first else {
    throw UserError.empty
}
```

#### 16. `for` loop with index instead of `enumerated()` or value iteration

**Tag:** `swift:for-index-loop`

```swift
// BUG: C-style loop, error-prone
for i in 0..<users.count {
    let user = users[i]
    process(i, user)
}
```

**Fix:** `enumerated()`.

```swift
for (i, user) in users.enumerated() {
    process(i, user)
}
```

### Protocol pitfalls

#### 17. `Any` / `AnyObject` as an escape hatch

**Tag:** `swift:any-escape`

```swift
// BUG: throws away type information
func process(_ item: Any) {
    if let user = item as? User { /* ... */ }
    else if let order = item as? Order { /* ... */ }
}
```

**Fix:** use a protocol with associated types or a sum enum.

#### 18. Class-only protocols without good reason

**Tag:** `swift:class-only-protocol`

```swift
// BUG: restricts conformance unnecessarily
protocol Named: AnyObject {
    var name: String { get }
}
```

**Fix:** drop `AnyObject` unless you specifically need reference semantics (delegates, weak references).

### Print debugging pitfalls

#### 19. `print` statements in production

**Tag:** `swift:print-in-production`

```swift
// BUG: shipped debug output
print("user loaded: \(user.name)")
```

**Fix:** use `os.Logger` (or `Logger` from `swift-log` for cross-platform).

```swift
import os

let logger = Logger(subsystem: "com.example.app", category: "users")
logger.info("user loaded: \(user.name, privacy: .public)")
```

#### 20. `NSLog` in Swift code

**Tag:** `swift:nslog`

`NSLog` is slow and bridges to Objective-C. Use `os.Logger`.

### Dictionary pitfalls

#### 21. `Dictionary` key access with `!`

**Tag:** `swift:dict-force-unwrap`

```swift
// BUG: crashes on missing key
let name = userMap[id]!.name
```

**Fix:** optional chaining + default.

```swift
let name = userMap[id]?.name ?? "unknown"
```

### Testing pitfalls

#### 22. Tests that share mutable state

**Tag:** `swift:shared-test-state`

Tests using a static/singleton service that persists state across test runs are flaky. Inject dependencies and reset state in `setUp()`.

#### 23. Tests dependent on system clock

**Tag:** `swift:test-wall-clock`

```swift
// BUG: non-deterministic
XCTAssertEqual(user.createdAt.timeIntervalSinceNow, 0, accuracy: 1.0)
```

**Fix:** inject a clock abstraction (`Clock`, `ContinuousClock`) and fake it.

### Build pitfalls

#### 24. Ignoring warnings

**Tag:** `swift:ignored-warnings`

Swift warnings often catch real bugs (unreachable code, unused results from throwing functions, implicit type conversions). Treat them as errors in CI.

#### 25. Missing `final` on classes

**Tag:** `swift:missing-final`

Leaving classes non-`final` without planning for subclassing prevents compiler optimizations and invites accidental inheritance.

---

## Mental-model deltas (for engineers coming from Java / Kotlin / TypeScript)

Things that work differently in Swift than in other mainstream languages. Chiron calls these out when they come up in conversation.

1. **Value types are common.** `struct` and `enum` are value types — copied on assignment. Unlike Java (where everything is a reference), Swift strongly favors value semantics for immutable data.

2. **Optionals are a type.** `String?` is `Optional<String>` — a separate type from `String`. The compiler forces you to unwrap before use.

3. **No null.** Swift has no null pointer. The closest equivalent is `Optional.none`. You can't accidentally dereference nil; the compiler rejects it.

4. **Arc is automatic, retain cycles are your problem.** Reference counting happens automatically, but circular references (closures capturing `self`, parent-child pointers) need manual `weak`/`unowned`.

5. **`protocol` is richer than `interface`.** Protocols support associated types, default implementations via extensions, and can be conformed to retroactively.

6. **`extension` adds methods to existing types.** You can extend `Int`, `String`, or your own types to add functionality without subclassing.

7. **Enums are sum types.** Each case can carry associated values. `switch` over an enum is exhaustive — the compiler catches missing cases.

8. **`switch` is exhaustive.** Over an enum: every case must be handled. Over other types: requires a `default`. Pattern matching is first-class.

9. **`guard` is for early exit.** `guard let x = optional else { return }` establishes `x` as non-nil in the rest of the scope. Clearer than nested `if let`.

10. **Generics are reified.** Type parameters exist at runtime (unlike Java's erasure). Specialization happens at compile time for performance.

11. **Protocol extensions provide default implementations.** A protocol method with a default body can be overridden or inherited. Unlike Java default methods, the dispatch is static (overridable in conforming types but not through protocol references unless the method is in the protocol).

12. **Error handling is `throws`/`do-catch`.** Throwing functions declare `throws`. Callers must `try`. `do`/`catch` handles. No checked exception list — just "throws or doesn't."

13. **No implicit conversions.** `Int` and `Int64` are different types. You explicitly convert: `Int64(intValue)`. Prevents subtle bugs.

14. **`let` creates a constant.** Not a "final variable" — genuinely constant. The compiler optimizes aggressively on `let`.

15. **Structs have memberwise initializers for free.** `struct User { let id: Int64; let name: String }` — you automatically get `User(id: 42, name: "Alice")` without writing an `init`.

16. **`self` is explicit inside closures.** Method calls can usually omit `self`, but closures require `self.` for clarity about captures.

17. **Concurrency is structured.** `async`/`await` + `TaskGroup` + `actor` form a cohesive system. Unstructured `Task { }` exists but is discouraged.

18. **Actors isolate state.** `actor` types prevent data races at compile time — only one task at a time can access their properties.

19. **`@MainActor` for UI code.** Annotate UI classes and functions with `@MainActor`. The compiler enforces main-thread execution; switching is automatic.

20. **Operators are functions.** `+`, `-`, `==` are overloadable. Custom operators can be defined.

21. **Pattern matching via `case` bindings.** `if case .success(let value) = result { ... }` — pattern match without a full switch.

22. **Key paths are first-class.** `\User.name` is a `KeyPath<User, String>` — pass as a property reference, not a string. Used by LINQ-like APIs and SwiftUI bindings.

23. **Result builders for DSLs.** `@resultBuilder` underpins SwiftUI's `@ViewBuilder`, `RegexBuilder`, etc. Enables declarative DSLs with compile-time checking.

24. **`@available` for platform gating.** `@available(iOS 16.0, *)` marks features that only exist on certain OS versions. The compiler enforces availability checks.

25. **Preconditions vs assertions.** `precondition` runs in release builds; `assert` runs only in debug. Use `precondition` for invariants that must hold everywhere.

---

## Challenge seeds

Each seed is a pre-authored drill that `/challenge` pattern-matches against source code.

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

---

## Authoring new seeds

When adding a new seed to this pack:

1. **Name it** `swift:<idiom-slug>` — consistent with the profile tag format.
2. **Write the Signal** in prose or pseudo-regex — concrete enough that a reader can verify a match by inspection.
3. **Write the Drill** with Task + Constraint — task is what to change, constraint is what makes it bounded (measurable, finite).
4. **Keep it small.** Drills must be ≤20 lines of change, ≤1 function touched, 5–15 minutes of focused work.
5. **Mirror into `.claude/skills/challenge/SKILL.md`.** The runtime source of truth is the command file; this document is the human-readable mirror and the contribution-PR target.
