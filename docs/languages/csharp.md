---
language: csharp
last_reviewed_against: "12"
upstream_version_source:
  type: endoflife
  product: dotnet
---

# C# language pack

Canonical idioms, common pitfalls, mental-model shifts, and challenge seeds for modern C# (10+, targeting .NET 6/8/9). This file is the **human-readable reference** for chiron's C# knowledge base. The content is mirrored into `.claude/skills/challenge/SKILL.md` at runtime for the `/challenge` command's seeded pass.

**Contributors:** when adding idioms or seeds here, also update the corresponding section in `.claude/skills/challenge/SKILL.md`. See [`CONTRIBUTING-LANGUAGE-PACKS.md`](../CONTRIBUTING-LANGUAGE-PACKS.md) for the authoring guide.

---

## Read this first (stdlib and ecosystem anchors)

Docs chiron points to most often. When introducing any of these primitives during a teach turn, offer the corresponding pointer as a "read this first."

| Primitive | Doc pointer | Used for |
|-----------|-------------|----------|
| LINQ | `learn.microsoft.com/en-us/dotnet/csharp/linq` | Declarative queries over `IEnumerable<T>` |
| `async/await` | `learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming` | Task-based async, structured concurrency |
| `Task` / `ValueTask` | `learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task` | Futures and async composition |
| `IEnumerable<T>` / `IAsyncEnumerable<T>` | `learn.microsoft.com/en-us/dotnet/api/system.collections.generic.ienumerable-1` | Lazy and async iteration |
| `Span<T>` / `Memory<T>` | `learn.microsoft.com/en-us/dotnet/standard/memory-and-spans/` | Zero-allocation slicing in hot paths |
| Records | `learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record` | Immutable value types (C# 9+) |
| Pattern matching | `learn.microsoft.com/en-us/dotnet/csharp/fundamentals/functional/pattern-matching` | `switch` expressions, property patterns |
| Nullable reference types | `learn.microsoft.com/en-us/dotnet/csharp/nullable-references` | `#nullable enable` + `?` annotations |
| `IDisposable` / `IAsyncDisposable` | `learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose` | Resource cleanup, `using` statements |
| DI container | `learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection` | `IServiceCollection` / constructor injection |
| xUnit / NUnit | `xunit.net` / `nunit.org` | Unit testing frameworks |
| `Microsoft.Extensions.Logging` | `learn.microsoft.com/en-us/dotnet/core/extensions/logging` | Structured logging with providers |

**Meta-resources:**

- **Framework Design Guidelines** — `learn.microsoft.com/en-us/dotnet/standard/design-guidelines/` — canonical library design rules
- **C# coding conventions** — `learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions`
- **.NET Blog** — `devblogs.microsoft.com/dotnet/` — announcements for new language and runtime features
- **Stephen Toub async articles** — `devblogs.microsoft.com/dotnet/author/toub/` — definitive async/await primer

---

## Idioms — canonical patterns worth knowing

Each idiom has: what it is, when to use it, a minimal example, and its tag for profile logging.

### Language primitives

#### 1. Records for immutable DTOs

**Tag:** `csharp:record`

Records (C# 9+) generate `Equals`, `GetHashCode`, `ToString`, and a `Deconstruct` method for free. Positional records get a primary constructor. Reach for records any time you want a value-type-ish immutable shape.

```csharp
public record User(long Id, string Name, string Email);

// Later:
var alice = new User(1, "Alice", "alice@example.com");
var (id, name, _) = alice;  // deconstruction
```

Use `record class` (default) for reference types with value equality, `record struct` when you want a value type.

#### 2. Pattern matching with switch expressions

**Tag:** `csharp:switch-expression`

Switch expressions (C# 8+) return a value, exhaustively match, and compose cleanly with property patterns.

```csharp
public decimal Discount(Order order) => order switch
{
    { Total: > 1000 }                        => 0.10m,
    { Customer.IsMember: true, Total: > 100 } => 0.05m,
    { Items.Count: >= 5 }                    => 0.03m,
    _                                        => 0m,
};
```

#### 3. Nullable reference types project-wide

**Tag:** `csharp:nullable-reference-types`

Enable `#nullable enable` (or `<Nullable>enable</Nullable>` in `.csproj`). Annotate intent with `?`, narrow with `is not null`, and let the compiler flow-analyze.

```csharp
public string Format(User? user) =>
    user is not null ? $"{user.Name} <{user.Email}>" : "unknown";
```

Without nullable reference types enabled, every `string` is silently nullable. **Opt in on every new project.**

#### 4. Target-typed `new`

**Tag:** `csharp:target-typed-new`

C# 9+ allows `new()` when the type is inferrable from context.

```csharp
List<User> users = new();
Dictionary<string, int> counts = new();

public User CreateAdmin(string name) => new(0, name, "admin@example.com");
```

Reduces type-name duplication without losing clarity.

#### 5. File-scoped namespaces

**Tag:** `csharp:file-scoped-namespace`

C# 10+ allows a single namespace per file without the nested braces.

```csharp
namespace MyApp.Orders;

public class OrderService
{
    // ...
}
```

Less indentation, cleaner file structure. Use in every new file.

#### 6. Global `using` directives

**Tag:** `csharp:global-using`

C# 10+ `global using` declarations live in a single file and apply across the whole project. Reduces boilerplate in every source file.

```csharp
// GlobalUsings.cs
global using System;
global using System.Collections.Generic;
global using System.Threading.Tasks;
global using Microsoft.Extensions.Logging;
```

Pair with `<ImplicitUsings>enable</ImplicitUsings>` in `.csproj` for SDK-provided defaults.

### LINQ and collections

#### 7. LINQ for collection transformations

**Tag:** `csharp:linq`

LINQ (`Where`, `Select`, `OrderBy`, `GroupBy`, `Aggregate`) replaces most manual loops with declarative pipelines. The pipeline stays lazy until a terminal operation (`ToList`, `ToArray`, `First`, `Count`).

```csharp
var activeNames = users
    .Where(u => u.IsActive)
    .OrderBy(u => u.Name)
    .Select(u => u.Name)
    .ToList();

var totalsByRegion = orders
    .GroupBy(o => o.Region)
    .ToDictionary(g => g.Key, g => g.Sum(o => o.Total));
```

Query syntax (`from x in xs where ... select ...`) is equivalent. Pick one convention per project.

#### 8. `IEnumerable<T>` / `IReadOnlyList<T>` over `List<T>` at API boundaries

**Tag:** `csharp:readonly-collection-api`

Expose `IEnumerable<T>` when the caller only iterates, `IReadOnlyList<T>` when they also need indexing and count, `IReadOnlyDictionary<TKey, TValue>` for key/value access. Never expose `List<T>` publicly unless mutation is intentional.

```csharp
public interface IUserRepository
{
    IReadOnlyList<User> GetAll();
    Task<IReadOnlyList<User>> GetActiveAsync(CancellationToken ct);
}
```

#### 9. `IAsyncEnumerable<T>` for streaming async data

**Tag:** `csharp:async-enumerable`

For async pipelines producing values over time, use `IAsyncEnumerable<T>` with `await foreach`.

```csharp
public async IAsyncEnumerable<LogEntry> StreamLogs([EnumeratorCancellation] CancellationToken ct)
{
    await foreach (var line in ReadLinesAsync(ct))
    {
        if (line.StartsWith("[error]"))
            yield return Parse(line);
    }
}

// At the call site:
await foreach (var entry in service.StreamLogs(ct))
{
    process(entry);
}
```

#### 10. `Span<T>` / `ReadOnlySpan<T>` for zero-alloc slicing

**Tag:** `csharp:span`

In hot paths, `Span<T>` gives you slicing without allocation. Stack-only, bounds-checked, works on arrays, `stackalloc`, and `Memory<T>`.

```csharp
public static bool StartsWith(ReadOnlySpan<char> input, ReadOnlySpan<char> prefix)
{
    return input.Length >= prefix.Length &&
           input[..prefix.Length].SequenceEqual(prefix);
}
```

Don't reach for this outside hot paths — `string` and `List<T>` are fine for 99% of code.

### Async and concurrency

#### 11. `async/await` with Task return type

**Tag:** `csharp:async-await`

Every I/O-bound method should be async and return `Task` or `Task<T>`. The compiler rewrites the method into a state machine; `await` yields to the runtime while waiting.

```csharp
public async Task<User> LoadUserAsync(long id, CancellationToken ct)
{
    var row = await _database.QueryAsync($"SELECT * FROM users WHERE id = {id}", ct);
    return MapRow(row);
}
```

Rule of thumb: if the method does I/O, it should be async. If it composes async calls, it should be async. Sync methods calling async methods via `.Result` is a deadlock trap.

#### 12. `ConfigureAwait(false)` in library code

**Tag:** `csharp:configure-await-false`

In libraries (not application code), call `.ConfigureAwait(false)` after every `await` to avoid capturing the synchronization context. This prevents deadlocks when library code is called from UI-thread-bound contexts.

```csharp
public async Task<string> FetchAsync(string url)
{
    using var response = await _http.GetAsync(url).ConfigureAwait(false);
    return await response.Content.ReadAsStringAsync().ConfigureAwait(false);
}
```

.NET 6+ apps without a sync context (ASP.NET Core, console apps) don't need this, but libraries should apply it defensively.

#### 13. `Task.WhenAll` for parallel awaits

**Tag:** `csharp:task-whenall`

For independent async operations, start them all and `await Task.WhenAll(...)`. Order is preserved in the result array.

```csharp
public async Task<DashboardData> LoadDashboardAsync(long userId, CancellationToken ct)
{
    var userTask = LoadUserAsync(userId, ct);
    var ordersTask = LoadOrdersAsync(userId, ct);
    var notificationsTask = LoadNotificationsAsync(userId, ct);

    await Task.WhenAll(userTask, ordersTask, notificationsTask);

    return new DashboardData(userTask.Result, ordersTask.Result, notificationsTask.Result);
}
```

#### 14. `CancellationToken` propagation

**Tag:** `csharp:cancellation-token`

Accept `CancellationToken` as the last parameter of any async method. Propagate it into every inner `await`. Callers get cooperative cancellation with zero ceremony.

```csharp
public async Task<IReadOnlyList<Order>> LoadOrdersAsync(long userId, CancellationToken ct)
{
    ct.ThrowIfCancellationRequested();
    return await _db.QueryAsync<Order>(
        "SELECT * FROM orders WHERE user_id = @userId",
        new { userId },
        ct);
}
```

### Resource management

#### 15. `using` declarations (C# 8+)

**Tag:** `csharp:using-declaration`

Instead of the traditional `using (...) { ... }` block, use the declaration form — disposal happens at scope end automatically.

```csharp
public async Task<string> ReadFileAsync(string path)
{
    using var reader = new StreamReader(path);
    return await reader.ReadToEndAsync();
}
// reader disposed here
```

Less nesting, same guarantees.

#### 16. `await using` for `IAsyncDisposable`

**Tag:** `csharp:await-using`

Async resources (database connections, HTTP clients, async-aware services) implement `IAsyncDisposable`. Dispose them with `await using`.

```csharp
public async Task<IReadOnlyList<User>> LoadUsersAsync(CancellationToken ct)
{
    await using var connection = new SqlConnection(_connectionString);
    await connection.OpenAsync(ct);
    return await connection.QueryAsync<User>("SELECT * FROM users");
}
```

### Dependency injection

#### 17. Constructor injection with primary constructors (C# 12+)

**Tag:** `csharp:primary-constructor-di`

C# 12 introduces primary constructors for non-record classes. Perfect for DI.

```csharp
public class OrderService(IOrderRepository repo, ILogger<OrderService> logger)
{
    public async Task<Order> GetAsync(long id, CancellationToken ct)
    {
        logger.LogInformation("Loading order {Id}", id);
        return await repo.GetAsync(id, ct);
    }
}
```

Pre-C#-12: classic constructor assigning to `private readonly` fields.

#### 18. `IServiceCollection` registration patterns

**Tag:** `csharp:di-registration`

Use the built-in DI container via `Microsoft.Extensions.DependencyInjection`. Register services in `Program.cs` or a `DependencyInjectionExtensions` static class.

```csharp
services
    .AddSingleton<IClock, SystemClock>()
    .AddScoped<IOrderRepository, SqlOrderRepository>()
    .AddScoped<OrderService>()
    .AddHttpClient<IPaymentClient, PaymentClient>();
```

Prefer constructor injection; never use service locator anti-pattern (resolving manually from `IServiceProvider`).

### Error handling

#### 19. Custom exception classes for domain errors

**Tag:** `csharp:custom-exception`

Define exception subclasses for domain failures. Callers can catch them specifically.

```csharp
public class OrderNotFoundException : Exception
{
    public long OrderId { get; }

    public OrderNotFoundException(long orderId)
        : base($"Order {orderId} not found")
    {
        OrderId = orderId;
    }
}
```

Follow the convention: name ends with `Exception`, inherit from `Exception` (or a framework type like `InvalidOperationException`), provide constructors with message + optional inner exception.

#### 20. Specific catch clauses

**Tag:** `csharp:specific-catch`

Catch the narrowest exception type you can handle. Re-throw unknown exceptions.

```csharp
try
{
    return await LoadConfigAsync(path);
}
catch (FileNotFoundException)
{
    return DefaultConfig;
}
catch (JsonException ex)
{
    _logger.LogError(ex, "Config file {Path} is invalid", path);
    throw new ConfigLoadException(path, ex);
}
```

Never `catch (Exception)` unless you log and re-throw (`throw;` without a variable) — swallowing is a bug.

### Logging

#### 21. Structured logging with message templates

**Tag:** `csharp:structured-logging`

Use `Microsoft.Extensions.Logging` with message templates, not string interpolation. Placeholders become structured log fields.

```csharp
_logger.LogInformation("User {UserId} logged in from {IpAddress}", user.Id, ipAddress);
_logger.LogError(exception, "Failed to save order {OrderId}", order.Id);
```

Never write `_logger.LogInformation($"User {user.Id} logged in from {ipAddress}")` — the interpolation runs eagerly and loses the structured fields.

### Testing

#### 22. xUnit `[Fact]` and `[Theory]`

**Tag:** `csharp:xunit-theory`

xUnit `[Fact]` for single-case tests, `[Theory]` + `[InlineData(...)]` for parameterized tests.

```csharp
public class CalcTests
{
    [Theory]
    [InlineData(0, 0, 0)]
    [InlineData(1, 1, 2)]
    [InlineData(-1, 1, 0)]
    public void Add_returns_sum(int a, int b, int expected)
    {
        Assert.Equal(expected, Calc.Add(a, b));
    }
}
```

Parallel execution by default. Faster feedback loops than NUnit out of the box.

#### 23. FluentAssertions for readable assertions

**Tag:** `csharp:fluent-assertions`

FluentAssertions gives you readable chains with clear failure messages.

```csharp
using FluentAssertions;

result.Should().NotBeNull();
result.Name.Should().Be("Alice");
result.Roles.Should().Contain("admin").And.HaveCount(3);
```

### Immutability and value types

#### 24. `readonly struct` for tiny value types

**Tag:** `csharp:readonly-struct`

When you need a value type (no allocation, copy semantics) that's fully immutable, use `readonly struct`. The compiler enforces immutability and optimizes method calls.

```csharp
public readonly struct Money
{
    public decimal Amount { get; }
    public string Currency { get; }

    public Money(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency;
    }
}
```

Under 16 bytes is the rough threshold where struct beats class on perf; above that, prefer a class or `readonly record struct`.

#### 25. `init`-only setters

**Tag:** `csharp:init-only-setters`

C# 9+ allows `init` setters that can only be assigned during object initialization. Gives you immutability with object initializer syntax.

```csharp
public class Config
{
    public string Host { get; init; } = "localhost";
    public int Port { get; init; } = 8080;
    public TimeSpan Timeout { get; init; } = TimeSpan.FromSeconds(30);
}

var c = new Config { Host = "example.com", Port = 443 };
// c.Host = "other";  // compile error
```

### Performance and time

#### 26. `DateTimeOffset.UtcNow` over `DateTime.Now`

**Tag:** `csharp:datetimeoffset-utcnow`

`DateTime.Now` is ambiguous (local time, no offset). `DateTimeOffset.UtcNow` always gives you unambiguous UTC with an offset. Use it everywhere for timestamps, logging, and persistence.

```csharp
var now = DateTimeOffset.UtcNow;
await _db.InsertAsync(new Event { CreatedAt = now });
```

#### 27. `StringBuilder` for loop-based concatenation

**Tag:** `csharp:stringbuilder`

For building strings in a loop, use `StringBuilder` — avoids the O(n²) allocation pattern of `+=`.

```csharp
var sb = new StringBuilder();
foreach (var part in parts)
{
    sb.Append(part).Append(", ");
}
var result = sb.ToString().TrimEnd(',', ' ');
```

For known-count string joining, prefer `string.Join(", ", parts)` — it's clearer and just as fast.

### Design

#### 28. Sealed classes by default

**Tag:** `csharp:sealed-by-default`

Mark non-abstract classes `sealed` unless you explicitly designed them for inheritance. Prevents unintended subclassing, enables JIT optimizations, and forces callers toward composition.

```csharp
public sealed class OrderService
{
    // ...
}
```

Classes designed for inheritance should have protected members and document the extension points.

#### 29. Top-level statements in `Program.cs`

**Tag:** `csharp:top-level-statements`

.NET 6+ supports top-level statements — no `class Program { static void Main }` boilerplate.

```csharp
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();

var app = builder.Build();
app.MapControllers();
app.Run();
```

Cleaner entry points, especially for microservices and small console apps.

#### 30. `IOptions<T>` for configuration binding

**Tag:** `csharp:ioptions`

Bind configuration sections to strongly-typed classes via `IOptions<T>`. Consume them via constructor injection.

```csharp
public class DatabaseOptions
{
    public required string ConnectionString { get; init; }
    public int MaxRetries { get; init; } = 3;
}

// In Program.cs:
builder.Services.Configure<DatabaseOptions>(builder.Configuration.GetSection("Database"));

// In consumer:
public class Repo(IOptions<DatabaseOptions> options)
{
    private readonly DatabaseOptions _opts = options.Value;
}
```

---

## Common pitfalls (anti-patterns)

Each pitfall has: the bug, why it's bad, the fix, and its tag.

### Async pitfalls

#### 1. `.Result` / `.Wait()` on Tasks

**Tag:** `csharp:task-result-wait`

```csharp
// BUG: deadlocks in UI / ASP.NET (classic) contexts
public string Load()
{
    return LoadAsync().Result;  // Blocks + tries to resume on captured context = deadlock
}
```

**Fix:** propagate async all the way up.

```csharp
public async Task<string> LoadAsync()
{
    return await _service.LoadAsync();
}
```

There is no "safe" way to block on a Task from sync code. Make the caller async.

#### 2. `async void` except for event handlers

**Tag:** `csharp:async-void`

```csharp
// BUG: exceptions can't be awaited and crash the process
public async void ProcessMessage(Message m)
{
    await SaveAsync(m);
    if (m.IsUrgent) throw new InvalidOperationException(); // unhandled → crashes
}
```

**Fix:** return `Task`.

```csharp
public async Task ProcessMessageAsync(Message m)
{
    await SaveAsync(m);
    if (m.IsUrgent) throw new InvalidOperationException();
}
```

The only legitimate `async void` is an event handler (e.g., WPF `Click += async (s, e) => ...`).

#### 3. Missing `ConfigureAwait(false)` in library code

**Tag:** `csharp:missing-configure-await`

Library code that captures the sync context deadlocks when called from UI thread or ASP.NET classic. Even in modern contexts without a sync context, `ConfigureAwait(false)` is free — add it to every `await` in library code.

#### 4. Sequential awaits when parallel would work

**Tag:** `csharp:serial-await`

```csharp
// BUG: three independent calls run one after another
var user = await LoadUserAsync(id);
var orders = await LoadOrdersAsync(id);
var notifications = await LoadNotificationsAsync(id);
```

**Fix:** `Task.WhenAll`.

```csharp
var userTask = LoadUserAsync(id);
var ordersTask = LoadOrdersAsync(id);
var notificationsTask = LoadNotificationsAsync(id);
await Task.WhenAll(userTask, ordersTask, notificationsTask);
var (user, orders, notifications) = (userTask.Result, ordersTask.Result, notificationsTask.Result);
```

#### 5. Ignoring `CancellationToken`

**Tag:** `csharp:missing-cancellation-token`

Async methods that don't accept or propagate a `CancellationToken` can't be canceled. Production systems need cancellation for timeouts, graceful shutdown, and request cancellation. Always accept `CancellationToken` and pass it down.

#### 6. `Task.Run` to "make it async"

**Tag:** `csharp:task-run-wrap`

```csharp
// BUG: wraps sync code in a thread pool task — doesn't help, wastes a thread
public Task<string> LoadAsync()
{
    return Task.Run(() => LoadSync());
}
```

**Fix:** either the underlying call is async (use it), or it's genuinely sync (don't pretend). `Task.Run` is for offloading CPU-bound work from a UI thread, not for "converting" sync I/O to async.

### Resource handling pitfalls

#### 7. Missing `Dispose` call

**Tag:** `csharp:missing-dispose`

```csharp
// BUG: connection never closed if the query throws
var connection = new SqlConnection(_connectionString);
connection.Open();
return connection.QueryAsync<User>("SELECT * FROM users");
```

**Fix:** `using` or `await using`.

```csharp
await using var connection = new SqlConnection(_connectionString);
await connection.OpenAsync(ct);
return await connection.QueryAsync<User>("SELECT * FROM users");
```

#### 8. `HttpClient` as a short-lived instance

**Tag:** `csharp:httpclient-short-lived`

```csharp
// BUG: exhausts sockets under load (TIME_WAIT state)
public async Task<string> FetchAsync(string url)
{
    using var client = new HttpClient();
    return await client.GetStringAsync(url);
}
```

**Fix:** inject a singleton `HttpClient` or use `IHttpClientFactory`.

```csharp
public OrderService(IHttpClientFactory factory) { ... }

var client = factory.CreateClient();
return await client.GetStringAsync(url);
```

### Null pitfalls

#### 9. Nullable reference types disabled

**Tag:** `csharp:nullable-disabled`

Without `#nullable enable`, every `string` is silently nullable. Compile-time null analysis is off. Any new project should enable nullable reference types at the `.csproj` level.

**Fix:** set `<Nullable>enable</Nullable>` in `.csproj`. Fix the wave of warnings by annotating intent.

#### 10. Null-forgiving operator (`!`) everywhere

**Tag:** `csharp:null-forgiving-abuse`

```csharp
// BUG: lies to the compiler; crashes at runtime if the cached value is missing
var user = _cache.Get<User>(key)!;
```

**Fix:** narrow explicitly.

```csharp
var user = _cache.Get<User>(key) ?? throw new InvalidOperationException($"User {key} missing");
```

Reserve `!` for the rare case where you genuinely have a guarantee the compiler can't express.

### String pitfalls

#### 11. String concatenation in loops

**Tag:** `csharp:string-concat-loop`

```csharp
// BUG: quadratic allocation
string result = "";
foreach (var part in parts)
{
    result += part;
}
```

**Fix:** `StringBuilder` or `string.Join`.

```csharp
var result = string.Join("", parts);
// or for more complex logic:
var sb = new StringBuilder();
foreach (var part in parts) sb.Append(part);
var result = sb.ToString();
```

#### 12. String interpolation in logging calls

**Tag:** `csharp:interpolated-log-message`

```csharp
// BUG: interpolation runs even when the level is disabled; loses structured fields
_logger.LogInformation($"User {user.Id} did {action}");
```

**Fix:** use message templates with placeholders.

```csharp
_logger.LogInformation("User {UserId} did {Action}", user.Id, action);
```

### Collection pitfalls

#### 13. Exposing `List<T>` publicly

**Tag:** `csharp:public-list`

```csharp
// BUG: callers can mutate your internal state
public class OrderService
{
    public List<Order> Orders { get; } = new();
}
```

**Fix:** expose read-only views.

```csharp
public class OrderService
{
    private readonly List<Order> _orders = new();
    public IReadOnlyList<Order> Orders => _orders;
}
```

#### 14. Modifying a collection during iteration

**Tag:** `csharp:modify-during-iteration`

```csharp
// BUG: throws InvalidOperationException
foreach (var user in _users)
{
    if (user.IsInactive) _users.Remove(user);
}
```

**Fix:** build a new collection or iterate a snapshot.

```csharp
_users.RemoveAll(u => u.IsInactive);
```

#### 15. Multiple enumerations of `IEnumerable<T>`

**Tag:** `csharp:multiple-enumeration`

```csharp
// BUG: enumerates twice, may hit a database twice
public void Process(IEnumerable<User> users)
{
    if (users.Any())
    {
        foreach (var u in users) Save(u);
    }
}
```

**Fix:** materialize once.

```csharp
public void Process(IEnumerable<User> users)
{
    var list = users.ToList();
    if (list.Count > 0)
    {
        foreach (var u in list) Save(u);
    }
}
```

### DateTime pitfalls

#### 16. `DateTime.Now` for timestamps

**Tag:** `csharp:datetime-now`

```csharp
// BUG: depends on server local time; non-deterministic across deployments
var createdAt = DateTime.Now;
```

**Fix:** `DateTimeOffset.UtcNow` (or an injected `IClock` abstraction for testability).

```csharp
var createdAt = DateTimeOffset.UtcNow;
```

### Concurrency pitfalls

#### 17. Shared mutable state without synchronization

**Tag:** `csharp:unsynchronized-shared`

```csharp
// BUG: two threads can both increment stale values
public class Counter
{
    private int _value;
    public void Increment() => _value++;
    public int Value => _value;
}
```

**Fix:** use `Interlocked`, a `lock`, or a concurrent collection.

```csharp
public class Counter
{
    private int _value;
    public void Increment() => Interlocked.Increment(ref _value);
    public int Value => Volatile.Read(ref _value);
}
```

#### 18. `lock(this)` or `lock(typeof(X))`

**Tag:** `csharp:lock-on-this`

```csharp
// BUG: external code can also lock on this instance → deadlock risk
public class Cache
{
    public void Add(string key, object value)
    {
        lock (this) { /* ... */ }
    }
}
```

**Fix:** lock on a private dedicated object.

```csharp
public class Cache
{
    private readonly object _lock = new();
    public void Add(string key, object value)
    {
        lock (_lock) { /* ... */ }
    }
}
```

### Exception handling pitfalls

#### 19. Catching `Exception` broadly

**Tag:** `csharp:catch-exception`

```csharp
// BUG: swallows OutOfMemoryException, StackOverflowException, bugs
try
{
    DoThing();
}
catch (Exception)
{
    // ignored
}
```

**Fix:** catch specific exceptions.

#### 20. `throw ex` instead of `throw`

**Tag:** `csharp:throw-ex`

```csharp
// BUG: resets the stack trace to this line
try { DoThing(); }
catch (Exception ex)
{
    _logger.LogError(ex, "failed");
    throw ex;  // stack trace now starts here
}
```

**Fix:** bare `throw;`.

```csharp
catch (Exception ex)
{
    _logger.LogError(ex, "failed");
    throw;  // preserves original stack
}
```

### Testing pitfalls

#### 21. Tests that depend on system time

**Tag:** `csharp:test-wall-clock`

Tests using `DateTime.Now` or `DateTimeOffset.UtcNow` directly are non-deterministic. Inject an `IClock` (or `TimeProvider` in .NET 8+) and fake it in tests.

```csharp
public interface IClock { DateTimeOffset UtcNow { get; } }
public class SystemClock : IClock { public DateTimeOffset UtcNow => DateTimeOffset.UtcNow; }
```

#### 22. `Assert.Equal` without context

**Tag:** `csharp:assert-without-context`

```csharp
// BUG: failure message says only "Expected 5, got 4" — no context
Assert.Equal(5, result);
```

**Fix:** use FluentAssertions for readable context, or include a message in Assert when possible.

### Design pitfalls

#### 23. Static service locator

**Tag:** `csharp:static-service-locator`

```csharp
// BUG: hides dependencies, untestable, breaks DI lifecycle rules
public class OrderService
{
    public void Process(Order o)
    {
        var repo = ServiceProvider.GetService<IOrderRepository>();
        repo.Save(o);
    }
}
```

**Fix:** constructor injection.

#### 24. Giant `OrderService` / "God class"

**Tag:** `csharp:god-class`

Classes with 20+ public methods and unrelated responsibilities are hard to test and reason about. Split by responsibility (SRP). If two methods touch entirely different data, they probably belong to different classes.

#### 25. Public setters on DTOs

**Tag:** `csharp:public-setters-on-dto`

```csharp
// BUG: anyone can mutate your entity mid-lifecycle
public class User
{
    public long Id { get; set; }
    public string Name { get; set; }
}
```

**Fix:** use `init` setters or records.

```csharp
public record User(long Id, string Name);
// or
public class User
{
    public required long Id { get; init; }
    public required string Name { get; init; }
}
```

---

## Mental-model deltas (for engineers coming from Java / Go / TypeScript)

Things that work differently in C# than in other mainstream languages. Chiron calls these out when they come up in conversation.

1. **Value types vs reference types.** `struct` is a value type (copied on assignment); `class` is a reference type (passed by reference). Unlike Java where everything is a reference, C# lets you pick.

2. **Nullable is opt-in (for reference types).** Without `#nullable enable`, every `string` can be null with no compiler warning. Enable the feature project-wide; it's free.

3. **Properties are sugar for getter/setter pairs.** `public string Name { get; set; }` compiles to a private backing field plus two methods. Callers use attribute syntax.

4. **`readonly` has multiple meanings.** On a field: can't be reassigned after construction. On a struct: the whole struct is immutable. On a method in a struct: the method doesn't mutate.

5. **Expression-bodied members (`=>`).** `public int Area => Width * Height;` is shorthand for a get-only property returning the expression. Works on properties, methods, constructors.

6. **`var` is not `dynamic`.** `var` is compile-time type inference; the type is fixed at the declaration site. `dynamic` is true runtime typing — avoid it outside COM interop scenarios.

7. **`yield return` builds an iterator.** A method with `yield return` returns an `IEnumerable<T>` that's lazy — values are produced on demand as the caller iterates.

8. **`await` is not `.then()`.** Unlike JavaScript promises, `await` unwraps the value and propagates exceptions synchronously within the calling function. The compiler rewrites the method into a state machine.

9. **`Task` is not a thread.** A `Task<T>` is a future — represents ongoing work. The work might run on a thread, or it might be fully async I/O with no thread at all. `Task.Run` schedules CPU work on the thread pool; plain `async` methods don't use threads unless they need to.

10. **`using` declarations extend the enclosing scope.** `using var x = ...` disposes at the end of the current method/block, not at the next semicolon.

11. **Generics are reified.** Unlike Java's erasure, C# generics know their type arguments at runtime. You can `typeof(T)`, `new T()` (with a constraint), and the JIT specializes per type argument.

12. **Extension methods.** Static methods called with instance syntax. `string.IsNullOrEmpty(s)` vs `s.IsNullOrEmpty()` — the extension method lives in a static class and the first parameter is marked `this string`.

13. **`Equals` vs `==`.** On reference types, `==` is reference equality by default. Override `==` and `Equals` together if you want value semantics. Records do this for you.

14. **`Nullable<T>` is a struct wrapping `T`.** `int?` is `Nullable<int>` — has `.HasValue` and `.Value`. Different from nullable reference types (`string?`).

15. **Events are multicast delegates.** `event EventHandler Click` is a list of subscribers. Unsubscribing is manual (`-=`), and leaked subscriptions leak memory.

16. **LINQ is lazy.** `xs.Where(x => ...)` doesn't execute until you iterate (`ToList`, `foreach`). Side effects in LINQ lambdas are surprising.

17. **`IDisposable` is not GC.** `Dispose` runs immediately when you call it (or at `using` scope end). The GC calls `Finalize` later if at all. Resource cleanup must be explicit.

18. **Primary constructors (C# 12+) differ from records.** Records get positional fields + `Deconstruct`; primary constructors on classes only give you parameters — no auto-generated properties.

19. **`ref` and `out` parameters.** `ref` passes a reference that can be read and written; `out` must be assigned before returning. Used sparingly — prefer returning tuples or rich types.

20. **`unsafe` is opt-in and rare.** Pointer arithmetic, raw memory access. `stackalloc` is a common safe-but-low-level primitive.

21. **Namespaces are separate from assemblies.** A namespace is a logical grouping; an assembly is a deployment unit (`.dll`). A single assembly can contain multiple namespaces and vice versa.

22. **Attributes are runtime metadata.** `[Obsolete]`, `[JsonPropertyName]`, `[Route]` — these annotate code and are read via reflection. Roughly equivalent to Java annotations.

23. **`Task.WhenAll` vs `Parallel.ForEach`.** `Task.WhenAll` awaits a collection of running tasks (I/O-bound). `Parallel.ForEach` partitions work across threads (CPU-bound). Don't confuse them.

24. **`IAsyncEnumerable<T>` uses `await foreach`.** The async equivalent of `IEnumerable<T>`. Each iteration step can be async, and the producer can yield values lazily.

25. **`stackalloc` lives on the stack.** `Span<byte> buffer = stackalloc byte[256];` — no heap allocation, automatic cleanup. Great for short-lived buffers in hot paths.

---

## Challenge seeds

Each seed is a pre-authored drill that `/challenge` pattern-matches against source code.

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

---

## Authoring new seeds

When adding a new seed to this pack:

1. **Name it** `csharp:<idiom-slug>` — consistent with the profile tag format.
2. **Write the Signal** in prose or pseudo-regex — concrete enough that a reader can verify a match by inspection.
3. **Write the Drill** with Task + Constraint — task is what to change, constraint is what makes it bounded (measurable, finite).
4. **Keep it small.** Drills must be ≤20 lines of change, ≤1 function touched, 5–15 minutes of focused work.
5. **Mirror into `.claude/skills/challenge/SKILL.md`.** The runtime source of truth is the command file; this document is the human-readable mirror and the contribution-PR target.
