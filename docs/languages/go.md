---
language: go
last_reviewed_against: "1.26"
upstream_version_source:
  type: endoflife
  product: go
---

# Go language pack

Canonical idioms, common pitfalls, mental-model shifts, and challenge seeds for Go. This file is the **human-readable reference** for chiron's Go knowledge base. The content is mirrored into `.claude/skills/challenge/SKILL.md` at runtime for the `/challenge` command's seeded pass.

**Contributors:** when adding idioms or seeds here, also update the corresponding section in `.claude/skills/challenge/SKILL.md`. See [`CONTRIBUTING-LANGUAGE-PACKS.md`](../CONTRIBUTING-LANGUAGE-PACKS.md) for the authoring guide.

---

## Read this first (stdlib anchors)

Docs chiron points to most often. When introducing any of these primitives during a teach turn, offer the corresponding pointer as a "read this first."

| Primitive | Doc pointer | Used for |
|-----------|-------------|----------|
| `context` | `pkg.go.dev/context` | Cancellation, deadlines, values |
| `errgroup` | `pkg.go.dev/golang.org/x/sync/errgroup` | Worker coordination with cancel-on-first-error |
| `sync` | `pkg.go.dev/sync` | Mutex, WaitGroup, Once, Pool, Map |
| `io` | `pkg.go.dev/io` | Reader/Writer and composition utilities |
| `testing` | `pkg.go.dev/testing` | `t.Run`, `t.Helper`, `t.Cleanup`, table-driven tests |
| `net/http` | `pkg.go.dev/net/http` | Handlers, middleware, graceful shutdown |
| `os/signal` | `pkg.go.dev/os/signal` | `signal.NotifyContext` for clean shutdown |
| `strings` | `pkg.go.dev/strings` | `strings.Builder` for concatenation |
| `encoding/json` | `pkg.go.dev/encoding/json` | Struct tags, custom encoders |
| `time` | `pkg.go.dev/time` | Timers, tickers, deadlines |
| `errors` | `pkg.go.dev/errors` | `errors.Is`, `errors.As`, `errors.Join` |
| `slices` | `pkg.go.dev/slices` | Generic slice operations (Go 1.21+) |

**Meta-resources:**

- **Effective Go** — `go.dev/doc/effective_go` — the canonical style and idiom guide from the Go team
- **Go Proverbs** — `go-proverbs.github.io` — Rob Pike's design principles in one-liners
- **Go Memory Model** — `go.dev/ref/mem` — mandatory reading for anyone writing concurrent code
- **Go Code Review Comments** — `github.com/golang/go/wiki/CodeReviewComments` — the rules Go reviewers enforce

---

## Idioms — canonical patterns worth knowing

Each idiom has: what it is, when to use it, a minimal example, and its tag for profile logging.

### Stdlib primitives

#### 1. `errgroup.WithContext` — cancel siblings on first error

**Tag:** `go:errgroup-with-context`

When you have N concurrent tasks and want "first error cancels the rest," reach for `errgroup.Group` with `WithContext`. The derived context is canceled as soon as any goroutine returns an error, and `g.Wait()` returns the first error.

```go
g, ctx := errgroup.WithContext(ctx)
for _, url := range urls {
    url := url // capture loop variable (pre-Go 1.22)
    g.Go(func() error { return fetch(ctx, url) })
}
if err := g.Wait(); err != nil {
    return fmt.Errorf("fetching: %w", err)
}
```

Background: `pkg.go.dev/golang.org/x/sync/errgroup`.

#### 2. `defer mu.Unlock()` — exception-safe critical sections

**Tag:** `go:defer-unlock`

Always pair `mu.Lock()` with `defer mu.Unlock()` on the next line. Manual unlock is error-prone on early returns and panics.

```go
mu.Lock()
defer mu.Unlock()
// ... critical section; unlocks even if this panics or returns early
```

#### 3. `context.Context` as first parameter — cancellation propagation

**Tag:** `go:context-propagation`

Pass `context.Context` as the first parameter of any function that performs I/O, starts goroutines, or may need to be canceled. The context cascades through the call graph.

```go
func fetch(ctx context.Context, url string) ([]byte, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil { return nil, err }
    // ...
}
```

Never store a context in a struct — pass it explicitly. Never pass `nil` — use `context.TODO()` for placeholders.

#### 4. `sync.Once` — one-time initialization

**Tag:** `go:sync-once`

For lazy initialization that must happen exactly once even under concurrent access.

```go
var (
    once sync.Once
    db   *sql.DB
)
func getDB() *sql.DB {
    once.Do(func() { db = connect() })
    return db
}
```

#### 5. `strings.Builder` — efficient string concatenation

**Tag:** `go:strings-builder`

For concatenating strings in a loop. Avoids the allocation overhead of `s := ""; for ... { s += x }` (which is O(n²)).

```go
var sb strings.Builder
sb.Grow(estimatedSize) // optional: pre-allocate
for _, part := range parts {
    sb.WriteString(part)
}
result := sb.String()
```

#### 6. `t.Run` — subtests for parallelism and clarity

**Tag:** `go:t-run-subtest`

Use `t.Run` for subtests inside a single test function. Gives clear output, parallel execution via `t.Parallel()`, and selective test running via `-run`.

```go
func TestCalc(t *testing.T) {
    cases := []struct {
        name    string
        in, want int
    }{
        {"zero", 0, 0},
        {"positive", 1, 2},
        {"negative", -1, -2},
    }
    for _, tc := range cases {
        tc := tc
        t.Run(tc.name, func(t *testing.T) {
            t.Parallel()
            if got := calc(tc.in); got != tc.want {
                t.Errorf("calc(%d) = %d, want %d", tc.in, got, tc.want)
            }
        })
    }
}
```

#### 7. `sync.WaitGroup` — synchronize a fixed set of goroutines

**Tag:** `go:sync-waitgroup`

Use when you need to wait for N goroutines without caring about errors. For error-aware coordination, prefer `errgroup.Group`.

```go
var wg sync.WaitGroup
for _, item := range items {
    wg.Add(1)  // always Add BEFORE starting the goroutine
    go func(item Item) {
        defer wg.Done()
        process(item)
    }(item)
}
wg.Wait()
```

#### 8. `io.Reader` / `io.Writer` composition

**Tag:** `go:io-composition`

`io.Reader` and `io.Writer` are the lingua franca for streams. Compose them with `io.MultiReader`, `io.TeeReader`, `io.Pipe`, `bufio.Scanner`, `io.LimitReader`. Never write a file-copy loop when `io.Copy` exists.

```go
// Read from src, mirror to log, parse lines:
tee := io.TeeReader(src, log)
scanner := bufio.NewScanner(tee)
for scanner.Scan() {
    line := scanner.Text()
    // ...
}
```

#### 9. `signal.NotifyContext` — graceful shutdown

**Tag:** `go:signal-notify-context`

For server processes that need to clean up on SIGINT/SIGTERM. The returned context is canceled when the signal arrives.

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()

srv := &http.Server{Handler: mux}
go func() {
    <-ctx.Done()
    shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    srv.Shutdown(shutdownCtx)
}()
srv.ListenAndServe()
```

#### 10. `errors.Is` / `errors.As` — wrapped error inspection

**Tag:** `go:errors-is-as`

Prefer `errors.Is(err, io.EOF)` over `err == io.EOF` — it handles wrapped errors correctly.

```go
if errors.Is(err, io.EOF) { /* end of stream */ }

var pathErr *os.PathError
if errors.As(err, &pathErr) { /* handle path error */ }
```

#### 11. `sync.Mutex` with zero value

**Tag:** `go:mutex-zero-value`

`sync.Mutex` is ready to use without initialization. Don't write `mu := sync.NewMutex()` — there's no such function. The zero value is correct.

```go
type Cache struct {
    mu sync.Mutex
    m  map[string]string
}
// No constructor needed — &Cache{m: make(map[string]string)} works.
```

#### 12. `sync.RWMutex` for read-heavy workloads

**Tag:** `go:sync-rwmutex`

Use `sync.RWMutex` when reads vastly outnumber writes (10:1+). Multiple readers can hold the lock simultaneously. Writers still need exclusive access.

```go
var rw sync.RWMutex
func (c *Cache) Get(k string) string {
    rw.RLock()
    defer rw.RUnlock()
    return c.m[k]
}
func (c *Cache) Set(k, v string) {
    rw.Lock()
    defer rw.Unlock()
    c.m[k] = v
}
```

**Caveat:** don't default to RWMutex. For low contention, plain Mutex is faster due to lower overhead.

#### 13. `sync.Pool` for allocation reuse

**Tag:** `go:sync-pool`

Reuse short-lived objects in hot paths to reduce GC pressure. Common for buffers.

```go
var bufPool = sync.Pool{
    New: func() any { return new(bytes.Buffer) },
}
func handle(r *http.Request) {
    buf := bufPool.Get().(*bytes.Buffer)
    defer bufPool.Put(buf)
    buf.Reset()
    // use buf
}
```

Only reach for this if profiling shows allocation pressure. Don't pre-optimize.

#### 14. `t.Cleanup` and `t.Helper`

**Tag:** `go:t-cleanup-helper`

- `t.Cleanup(fn)` runs `fn` at the end of the test (and its subtests). Cleaner than `defer` in test helpers.
- `t.Helper()` at the top of a test helper makes `t.Errorf` line numbers point at the caller, not the helper.

```go
func newTempDB(t *testing.T) *DB {
    t.Helper()
    db := openTestDB()
    t.Cleanup(func() { db.Close() })
    return db
}
```

#### 15. `slices` package for common operations

**Tag:** `go:slices-package`

Go 1.21+ ships `slices` with generic helpers for sort, search, and manipulation. Use instead of hand-rolled loops.

```go
slices.Sort(nums)
slices.Contains(xs, target)
slices.Index(xs, target)
slices.Delete(xs, i, j)
```

### Architectural patterns

#### 16. Worker pool with shared input channel

**Tag:** `go:worker-pool`

Canonical shape: N worker goroutines reading from a shared input channel, writing to a shared output channel (or using `errgroup` for lifecycle). Do NOT range over the input slice inside each goroutine — that makes every worker process every item.

```go
func fanOut(ctx context.Context, inputs []Task) ([]Result, error) {
    in := make(chan Task)
    out := make(chan Result, len(inputs))
    g, ctx := errgroup.WithContext(ctx)

    for i := 0; i < 8; i++ {
        g.Go(func() error {
            for t := range in {
                select {
                case <-ctx.Done():
                    return ctx.Err()
                case out <- process(t):
                }
            }
            return nil
        })
    }

    // feed inputs (could be in its own goroutine if inputs is a channel)
    go func() {
        defer close(in)
        for _, t := range inputs {
            select {
            case <-ctx.Done():
                return
            case in <- t:
            }
        }
    }()

    if err := g.Wait(); err != nil {
        return nil, err
    }
    close(out)
    var results []Result
    for r := range out {
        results = append(results, r)
    }
    return results, nil
}
```

#### 17. Pipeline — stages connected by channels

**Tag:** `go:pipeline`

Break computation into stages, each a goroutine reading from an input channel and writing to an output channel. Use `context.Context` for cancellation at every stage.

```go
func gen(ctx context.Context, nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            select {
            case <-ctx.Done(): return
            case out <- n:
            }
        }
    }()
    return out
}

func sq(ctx context.Context, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            select {
            case <-ctx.Done(): return
            case out <- n * n:
            }
        }
    }()
    return out
}

// Usage: sq(ctx, gen(ctx, 1, 2, 3, 4, 5))
```

#### 18. Functional options — flexible constructor configuration

**Tag:** `go:functional-options`

For types with many optional configuration parameters. Avoids "struct with 20 fields" and gives type-safe defaults.

```go
type Server struct {
    timeout time.Duration
    logger  Logger
    addr    string
}

type Option func(*Server)

func WithTimeout(d time.Duration) Option { return func(s *Server) { s.timeout = d } }
func WithLogger(l Logger) Option          { return func(s *Server) { s.logger = l } }
func WithAddr(a string) Option            { return func(s *Server) { s.addr = a } }

func New(opts ...Option) *Server {
    s := &Server{
        timeout: 30 * time.Second,
        addr:    ":8080",
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// Usage: New(WithTimeout(time.Minute), WithLogger(l))
```

#### 19. Middleware composition (`http.Handler` chains)

**Tag:** `go:http-middleware`

Middleware wraps a `http.Handler` and returns a new one. Compose by nesting.

```go
type middleware func(http.Handler) http.Handler

func logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
    })
}

func chain(h http.Handler, mws ...middleware) http.Handler {
    for i := len(mws) - 1; i >= 0; i-- {
        h = mws[i](h)
    }
    return h
}

// Usage: chain(handler, logging, auth, rateLimit)
```

#### 20. Graceful shutdown cascade

**Tag:** `go:graceful-shutdown`

Signal → context cancel → stop accepting new work → drain in-flight → close resources. Uses `signal.NotifyContext` at the top, context propagation throughout.

```go
func main() {
    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer stop()

    srv := newServer()
    if err := srv.Run(ctx); err != nil {
        log.Fatal(err)
    }
}
```

### Design principles

#### 21. Accept interfaces, return structs

**Tag:** `go:accept-interfaces-return-structs`

Function parameters should be the smallest interface that covers what you need. Return values should be concrete types (or sentinel interfaces from stdlib like `error`, `io.Reader`).

**Rationale:** callers pick their own concrete types; implementation stays flexible.

```go
// Good — accepts anything readable
func Sum(r io.Reader) (int, error) { /* ... */ }

// Unnecessarily constrained
func Sum(f *os.File) (int, error) { /* ... */ }
```

#### 22. Small interfaces

**Tag:** `go:small-interface`

Define interfaces with 1–3 methods where possible. `io.Reader`, `io.Writer`, `fmt.Stringer`, `error` are the gold standard. Large interfaces with 10+ methods usually indicate a design problem.

> "The bigger the interface, the weaker the abstraction." — Rob Pike

#### 23. Error wrapping with `%w`

**Tag:** `go:error-wrap-percent-w`

When adding context to an error, use `fmt.Errorf("context: %w", err)` (not `%v`). The `%w` verb preserves the error chain for `errors.Is` and `errors.As`.

```go
if err := db.Query(...); err != nil {
    return fmt.Errorf("fetching user %d: %w", userID, err)
}
```

#### 24. Make the zero value useful

**Tag:** `go:zero-value-useful`

Design types so that `var x T` is immediately usable. `sync.Mutex`, `bytes.Buffer`, and `strings.Builder` all work correctly from their zero value — no `NewX()` needed.

```go
type Buffer struct {
    data []byte
}
// var b Buffer — usable without initialization
func (b *Buffer) Write(p []byte) (int, error) {
    b.data = append(b.data, p...)
    return len(p), nil
}
```

#### 25. Return early on errors

**Tag:** `go:early-return-error`

Handle the error path first and return. Keeps happy-path code at the base indentation level.

```go
// Good
func process(x int) error {
    if x < 0 {
        return errors.New("negative")
    }
    if x > 100 {
        return errors.New("too big")
    }
    return doThing(x) // happy path at base level
}

// Bad — nested
func process(x int) error {
    if x >= 0 {
        if x <= 100 {
            return doThing(x)
        } else {
            return errors.New("too big")
        }
    } else {
        return errors.New("negative")
    }
}
```

#### 26. Interface at consumption site, not production site

**Tag:** `go:interface-at-consumer`

Define interfaces where they are **used**, not where they are **implemented**. This is the opposite of the Java convention.

```go
// Idiomatic — consumer defines what it needs
package orders

type userStore interface {
    Get(id string) (*User, error) // small, consumer-defined
}

type Service struct {
    users userStore
}

// The production package (e.g., `userdb`) returns a concrete *userdb.Client.
// That type happens to satisfy orders.userStore.
```

#### 27. Explicit dependency injection

**Tag:** `go:explicit-di`

No DI frameworks. No magic. Pass dependencies as constructor parameters or struct fields. If the wiring is complex, use a `main.go` that constructs everything explicitly.

```go
func main() {
    db := openDB()
    cache := newCache()
    svc := orders.NewService(db, cache, log.Default())
    http.ListenAndServe(":8080", svc)
}
```

#### 28. Package by feature, not by layer

**Tag:** `go:package-by-feature`

Organize packages by business domain (`orders`, `billing`, `users`), not by technical layer (`models`, `controllers`, `services`). Each package should be a self-contained unit that could, in principle, be extracted as a separate module.

#### 29. Reduce allocations in hot paths

**Tag:** `go:reduce-hot-path-allocs`

In code that runs millions of times per second, every allocation counts. Profile first, then optimize: preallocate slices with `make([]T, 0, n)`, reuse buffers with `sync.Pool`, avoid `fmt.Sprintf` in hot paths, prefer value receivers for small structs.

Never pre-optimize outside hot paths. Benchmark-driven, not speculation-driven.

#### 30. Composition over inheritance

**Tag:** `go:composition-over-inheritance`

Go has no inheritance. Compose types via struct embedding when you want one type to behave "as if it were" another.

```go
type Logger struct{ prefix string }
func (l *Logger) Log(msg string) { fmt.Println(l.prefix, msg) }

type Server struct {
    Logger // embedded — Server has Log() method for free
    port int
}
```

Composition is explicit. Method resolution is lexical, not virtual — no surprises.

---

## Common pitfalls (anti-patterns)

Each pitfall has: the bug, why it's bad, the fix, and its tag.

### Concurrency pitfalls

#### 1. Ranging over shared data inside a goroutine

**Tag:** `go:shared-input-channel` (anti-case)

```go
// BUG: every worker processes every input
for i := 0; i < 8; i++ {
    go func() {
        for _, item := range inputs {
            process(item)
        }
    }()
}
```

**Fix:** use a shared input channel. Workers read from it; the main goroutine writes and closes. See idiom 16.

#### 2. Goroutine leaks

**Tag:** `go:goroutine-leak`

Starting goroutines without a cancellation mechanism. If the parent returns without signaling, the goroutines run forever.

```go
// BUG: no way to stop this
go func() {
    for range time.Tick(time.Second) {
        doThing()
    }
}()
```

**Fix:** accept a context and select on `ctx.Done()`.

```go
go func() {
    tick := time.NewTicker(time.Second)
    defer tick.Stop()
    for {
        select {
        case <-ctx.Done():
            return
        case <-tick.C:
            doThing()
        }
    }
}()
```

#### 3. Copying a `sync.Mutex`

**Tag:** `go:mutex-copy`

```go
// BUG: value receiver silently copies the mutex
type Counter struct {
    mu sync.Mutex
    n  int
}
func (c Counter) Inc() { // WRONG: c is a copy
    c.mu.Lock()
    defer c.mu.Unlock()
    c.n++
}
```

**Fix:** use pointer receivers when the struct contains a mutex. `go vet` catches this.

#### 4. `wg.Add` inside the goroutine

**Tag:** `go:waitgroup-add-inside`

```go
// BUG: Add may not execute before Wait
var wg sync.WaitGroup
for _, item := range items {
    go func(item Item) {
        wg.Add(1) // WRONG
        defer wg.Done()
        process(item)
    }(item)
}
wg.Wait() // may return before any goroutine Adds
```

**Fix:** `wg.Add(1)` must be called in the caller, before `go`.

#### 5. Unbuffered channel for "fire and forget"

**Tag:** `go:unbuffered-fire-forget`

```go
// BUG: sender blocks if no one is reading
results := make(chan Result)
for _, w := range workers {
    go w.Run(results) // blocks on send if main isn't reading yet
}
```

**Fix:** think about who reads and when. Either use a buffered channel (size chosen deliberately) or start the reader goroutine before the writers.

#### 6. `time.Sleep` for synchronization

**Tag:** `go:time-sleep-sync`

```go
// BUG: race condition
go doThing()
time.Sleep(100 * time.Millisecond) // "surely done by now"
checkResult()
```

**Fix:** use channels, WaitGroup, or context. Sleep is never synchronization.

#### 7. Loop variable capture (pre-Go 1.22)

**Tag:** `go:loop-var-capture`

```go
// BUG in Go <1.22: all goroutines see the final value of i
for i := 0; i < 10; i++ {
    go func() {
        fmt.Println(i) // probably prints 10, 10, 10, ...
    }()
}
```

**Fix (pre-1.22):** shadow the variable with `i := i` at the top of the loop body. In Go 1.22+, loop variables are per-iteration by default.

### Error handling pitfalls

#### 8. `fmt.Errorf` with `%v` when wrapping

**Tag:** `go:errorf-v-instead-of-w`

```go
// BUG: loses wrapping, can't be inspected
return fmt.Errorf("fetch %s: %v", url, err)
```

**Fix:** use `%w`.

```go
return fmt.Errorf("fetch %s: %w", url, err)
```

#### 9. Comparing wrapped errors with `==`

**Tag:** `go:err-equal-instead-of-is`

```go
// BUG: fails if err is wrapped
if err == sql.ErrNoRows { /* ... */ }
```

**Fix:** `errors.Is(err, sql.ErrNoRows)`.

#### 10. `err` shadowing

**Tag:** `go:err-shadow`

```go
// BUG: outer err is never checked
func work() error {
    err := first()
    if err != nil { return err }
    if foo, err := second(); err != nil { // WRONG: shadows outer err
        _ = foo
        return err
    }
    return nil // outer err from first() might actually be non-nil still
}
```

**Fix:** rename the new variable or use `=`. `go vet -shadow` catches many of these.

#### 11. Panic for normal errors

**Tag:** `go:panic-for-normal-error`

Using `panic` for recoverable error conditions (invalid input, missing file, etc.). Panic is for unrecoverable programmer errors, not control flow.

**Fix:** return an `error`. Panic only for "this should never happen" invariants.

#### 12. Ignoring the error return

**Tag:** `go:ignored-error`

```go
// BUG: silently swallows the error
json.Marshal(data)
file.Write(data)
```

**Fix:** always check errors. Use `_ =` explicitly only when you've thought about it and documented why.

### Resource handling pitfalls

#### 13. Missing `defer resp.Body.Close()`

**Tag:** `go:unclosed-response-body`

```go
// BUG: leaks file descriptors
resp, err := http.Get(url)
if err != nil { return err }
data, _ := io.ReadAll(resp.Body) // never closes
```

**Fix:** `defer resp.Body.Close()` right after the error check.

```go
resp, err := http.Get(url)
if err != nil { return err }
defer resp.Body.Close()
```

#### 14. `defer` in a tight loop

**Tag:** `go:defer-in-loop`

```go
// BUG: deferred calls accumulate until function returns
for _, file := range files {
    f, err := os.Open(file)
    if err != nil { return err }
    defer f.Close() // WRONG: all closes happen at function end
    // ...
}
```

**Fix:** extract the body to a helper function where defer has the right scope.

```go
for _, file := range files {
    if err := processOne(file); err != nil { return err }
}

func processOne(file string) error {
    f, err := os.Open(file)
    if err != nil { return err }
    defer f.Close()
    // ...
}
```

#### 15. Slice aliasing via reslicing

**Tag:** `go:slice-aliasing`

```go
// BUG: b shares backing array with a
a := []int{1, 2, 3, 4, 5}
b := a[:2]
b = append(b, 99) // mutates a[2]!
```

**Fix:** copy explicitly if you want independent slices.

```go
b := append([]int(nil), a[:2]...)
// or
b := make([]int, 2, 3)
copy(b, a[:2])
```

#### 16. Forgetting to close channels

**Tag:** `go:unclosed-channel`

Receivers need to know when a stream of values has ended. Forgetting `close(ch)` leaves them blocked on receive forever.

**Rule:** the sender closes the channel, never the receiver. If there are multiple senders, coordinate via `sync.WaitGroup` or a separate "done" signal.

### Type / interface pitfalls

#### 17. `any` / `interface{}` as a lazy escape hatch

**Tag:** `go:any-misuse`

Using `any` instead of a concrete type (or generic type parameter) because it's "more flexible." Actually it's less flexible — loses type safety, forces type assertions, hurts readability.

**Fix:** use the concrete type, or a small interface that captures what you actually need, or a type parameter (Go 1.18+).

#### 18. Large interface defined at production site

**Tag:** `go:large-interface-at-producer`

```go
// BUG: too big, defined on the wrong side
package db
type DB interface {
    Get(id string) (*Row, error)
    Put(id string, r *Row) error
    Delete(id string) error
    Query(q string) ([]*Row, error)
    Count() int
    // ... 15 more methods
}
```

**Fix:** define smaller interfaces at the consumption site.

```go
package orders
type orderStore interface {
    Get(id string) (*Row, error) // just what `orders` needs
}
```

#### 19. Nil map write

**Tag:** `go:nil-map-write`

```go
// BUG: panics at runtime
var m map[string]int
m["x"] = 1
```

**Fix:** initialize with `make(map[string]int)` or a literal `{}`.

### Test pitfalls

#### 20. Table-driven tests without `t.Run`

**Tag:** `go:table-test-without-trun`

```go
// BUG: when a case fails, output doesn't identify which one
for _, tc := range cases {
    if got := f(tc.in); got != tc.want {
        t.Errorf("got %v, want %v", got, tc.want)
    }
}
```

**Fix:** wrap in `t.Run(tc.name, ...)`.

#### 21. Test helper without `t.Helper()`

**Tag:** `go:test-helper-missing`

If a helper function calls `t.Errorf`, it should call `t.Helper()` first so error reports point at the caller line, not the helper line.

```go
func assertEqual(t *testing.T, got, want int) {
    t.Helper()
    if got != want {
        t.Errorf("got %d, want %d", got, want)
    }
}
```

#### 22. Parallel subtests with shared loop variable

**Tag:** `go:parallel-subtest-capture`

```go
for _, tc := range cases {
    t.Run(tc.name, func(t *testing.T) {
        t.Parallel() // BUG (pre-1.22): tc is captured, all subtests see last value
        // ...
    })
}
```

**Fix (pre-1.22):** `tc := tc` inside the loop body.

### Package structure pitfalls

#### 23. Stuttering package names

**Tag:** `go:stuttering-names`

```go
// BUG: "user.UserService" is redundant
package user
type UserService struct{}
```

**Fix:** drop the package prefix in type names.

```go
package user
type Service struct{} // user.Service
```

#### 24. `util` / `common` / `helpers` packages

**Tag:** `go:util-package`

Grab-bag packages are a sign of missing abstraction. Move each function to the package that actually uses it, or create a proper feature package.

#### 25. Package by technical layer

**Tag:** `go:package-by-layer`

Packages named `models`, `controllers`, `services`, `repositories` are a C#/Java smell in Go. Prefer feature packages: `orders`, `billing`, `users`.

---

## Mental-model deltas (for engineers coming from C-family languages)

Things that work differently in Go than in Java/C#/C++. Chiron calls these out when they come up in conversation.

1. **No exceptions.** Errors are values returned from functions. The `error` interface is just a type. Handle errors with `if err != nil`, not `try`/`catch`.

2. **No inheritance.** Composition via struct embedding is the only reuse mechanism. Interfaces express contracts, not hierarchies.

3. **Interfaces are implicitly satisfied.** A type that has all the methods of an interface IS that interface. No `implements` keyword. This enables consumer-defined interfaces.

4. **Zero values are meaningful.** `var x T` gives you a usable `T`. Design types so this works — see `sync.Mutex`, `bytes.Buffer`, `strings.Builder`.

5. **Goroutines are cheap but not free.** Starting 1,000 goroutines is fine. Starting 1,000,000 might cause issues. Always think about supervision and cancellation.

6. **Channels are typed and directional.** `chan int`, `chan<- int` (send-only), `<-chan int` (receive-only). The compiler enforces direction in function signatures.

7. **Closing channels is the sender's job.** The receiver knows via the comma-ok pattern: `v, ok := <-ch`. Never close a channel from the receiver side. Never close a channel with multiple senders without coordination.

8. **Slices are views into arrays.** `b := a[:2]` doesn't copy; it aliases. Mutations through `b` can affect `a`. Use `append` carefully; consider `make([]T, len, cap)` to preallocate.

9. **Maps aren't safe for concurrent use.** Reading + writing from multiple goroutines panics at runtime. Use `sync.Map` only for specific patterns (rarely the right choice); usually guard a regular map with a mutex.

10. **`nil` is a valid value for many types.** Nil slices can be appended to. Nil maps can be read from (but not written). Nil function values panic when called. Handle gracefully.

11. **`defer` runs LIFO on function return.** Not on scope exit — on function return. Deferred calls are a stack.

12. **`go vet` and `gofmt` are part of the language.** Violations are not a style preference — they're bugs. CI must enforce them.

13. **The standard library is the framework.** Go has no Rails, no Spring. `net/http` is your web framework. `database/sql` is your database interface. Embrace it.

14. **Dependencies are explicit in `go.mod`.** No magic classpath, no 2,000-package transitive tree. Keep your dependency list small and intentional.

15. **Generics arrived in 1.18.** Use them when you're writing truly generic algorithms (data structures, numeric helpers). Don't reach for them for "interface-like" flexibility — interfaces usually work better.

16. **Context is explicit, not ambient.** Every function that does I/O or spawns goroutines should take `context.Context` as its first parameter. This is enforced socially, not by the compiler.

17. **Errors wrap with `%w`.** The `%w` verb preserves the error chain for `errors.Is`/`errors.As`. Don't use `%v` when wrapping.

18. **Avoid `init` functions.** `func init()` is often a code smell — hidden side effects at package load. Prefer explicit initialization via `func New() *T`.

19. **No default arguments.** Functions have a fixed signature. Use functional options or a config struct for optional parameters.

20. **No enums (but iota comes close).** Use typed constants with `iota` for enumerations. Add a `String()` method for display.

21. **Pointers are not "by reference."** Go has pointers. Passing a pointer is just passing an address by value. There is no C++-style `&`-reference.

22. **Value receivers copy the receiver.** Modifying fields through a value receiver doesn't persist. Use pointer receivers for mutation.

23. **`panic` is for programmer errors only.** Normal errors return via `error`. Don't use panic for control flow or recoverable conditions.

24. **Packages are directories, not files.** All `.go` files in a directory belong to the same package. There is no `package foo.bar` hierarchy.

25. **`main` is special.** Only `package main` produces an executable. Libraries don't have a `main`.

---

## Challenge seeds

Each seed is a pre-authored drill that `/challenge` pattern-matches against source code. When the seed's `Signal` matches a file, the `Drill` becomes a concrete practice target for the user.

### `go:shared-input-channel`

**Signal:** Inside a function body, one or more goroutines contain a `for _, x := range X` loop where `X` is defined in the enclosing scope (closed over), AND the function appears to be a worker-pool-style fan-out (spawns ≥2 goroutines that all reference the same shared collection).

**Drill:**
- **Task:** change the worker goroutines to read from a shared input channel that the main goroutine writes to and closes.
- **Constraint:** each input must be processed by exactly one worker (not N workers). No allocations inside the worker goroutine body beyond what's strictly needed.

### `go:defer-unlock`

**Signal:** A function contains `mu.Lock()` (or `rw.RLock()`, `rw.Lock()`) but the matching `Unlock` call is either (a) called explicitly without `defer`, OR (b) on only some of the function's return paths.

**Drill:**
- **Task:** convert to `defer mu.Unlock()` immediately after the `Lock` call.
- **Constraint:** no change in lock scope or observable behavior — the function must still hold the lock for the same duration.

### `go:errgroup-with-context`

**Signal:** A function spawns multiple goroutines for concurrent work and uses `sync.WaitGroup` for coordination, with manual error collection (shared error variable, manual error channel, first-error tracking).

**Drill:**
- **Task:** replace the WaitGroup + manual error collection with `errgroup.Group` using `WithContext`.
- **Constraint:** behavior must be equivalent including cancel-on-first-error semantics; no more goroutines than the original.

### `go:errorf-w-instead-of-v`

**Signal:** `fmt.Errorf` call with `%v` verb where the formatted value is an `error`.

**Drill:**
- **Task:** change `%v` to `%w` where the formatted value is the wrapped error.
- **Constraint:** no change in user-visible message format beyond the verb change.

### `go:errors-is-instead-of-equality`

**Signal:** `if err == SomeKnownError` (or `err != SomeKnownError`) where `SomeKnownError` is a package-level sentinel variable and the code path could receive a wrapped error.

**Drill:**
- **Task:** replace `==`/`!=` with `errors.Is`.
- **Constraint:** must still handle the unwrapped case correctly; no behavioral regression.

### `go:strings-builder`

**Signal:** String concatenation (`s += x` or `s = s + x`) inside a `for` loop, where `s` accumulates over iterations.

**Drill:**
- **Task:** rewrite using `strings.Builder`.
- **Constraint:** the function's signature stays the same; no intermediate string allocations should remain.

### `go:early-return-error`

**Signal:** A function has 3+ levels of nested `if err == nil { ... }` blocks, with the happy path buried deep.

**Drill:**
- **Task:** refactor to early-return style — handle each error case first and return, keeping the happy path at the base indentation level.
- **Constraint:** no behavior change; the success path must move to the outermost indentation level.

### `go:defer-in-loop`

**Signal:** A `defer` statement inside a `for` loop that iterates over a collection of unknown size.

**Drill:**
- **Task:** extract the loop body (including the defer) to a helper function where defer has the correct per-iteration scope. Alternatively, call the cleanup explicitly without defer.
- **Constraint:** cleanup must happen at the end of each iteration, not at the end of the outer function.

### `go:goroutine-leak`

**Signal:** A `go func() { for { ... } }()` with no `select` on `ctx.Done()` and no `done` channel — an unstoppable goroutine.

**Drill:**
- **Task:** add a `context.Context` parameter and a `select` that exits when `ctx.Done()` fires.
- **Constraint:** the goroutine must exit promptly after context cancellation (within one loop iteration or one I/O timeout).

### `go:unclosed-response-body`

**Signal:** `http.Get(...)` or `http.Client.Do(...)` result used without a corresponding `defer resp.Body.Close()` within the same function.

**Drill:**
- **Task:** add `defer resp.Body.Close()` immediately after the error check for the HTTP call.
- **Constraint:** close must be deferred (for error-path safety), not called manually.

### `go:mutex-copy`

**Signal:** A struct containing a `sync.Mutex`, `sync.RWMutex`, or other non-copyable type has at least one method with a value receiver.

**Drill:**
- **Task:** change all methods on the struct to use pointer receivers, so the mutex is never copied.
- **Constraint:** no other behavior change. `go vet` should report no copylocks warnings after the change.

### `go:t-run-subtest`

**Signal:** A test function has a `for _, tc := range cases` loop that calls `t.Errorf` / `t.Fatalf` directly without wrapping the body in `t.Run`.

**Drill:**
- **Task:** wrap the table body in `t.Run(tc.name, func(t *testing.T) { ... })`.
- **Constraint:** each case must have a distinct, human-readable name; failures must report which case failed (via `-run` or `-v` output).

### `go:small-interface`

**Signal:** An interface definition with 5+ methods used in only one consumer location (or defined in the same package as its sole implementation).

**Drill:**
- **Task:** at the consumption site, define a smaller interface containing only the subset of methods the consumer actually uses.
- **Constraint:** the new interface has ≤3 methods and is defined where it's used, not where it's implemented.

### `go:accept-interfaces-return-structs`

**Signal:** An exported function takes a concrete type (like `*os.File` or a custom struct) as a parameter, but only calls methods on it that are part of a stdlib interface (`io.Reader`, `io.Writer`, etc.).

**Drill:**
- **Task:** change the parameter type to the smallest interface that covers the function's actual usage.
- **Constraint:** the return type stays the same; existing callers must not need to change.

### `go:context-propagation`

**Signal:** A function that performs I/O (HTTP, DB, file operations) or spawns goroutines but does NOT take a `context.Context` as its first parameter.

**Drill:**
- **Task:** add `ctx context.Context` as the first parameter and propagate it through all I/O calls.
- **Constraint:** no hardcoded timeouts within the function body; use the context's deadline if one is set.

### `go:sync-mutex-zero-value`

**Signal:** Code defining a constructor like `func NewX() *X { return &X{mu: sync.Mutex{}} }` or otherwise initializing a `sync.Mutex` field explicitly.

**Drill:**
- **Task:** remove the explicit mutex initialization — the zero value is already correct.
- **Constraint:** verify the type still works without the constructor (or that the constructor is simpler).

### `go:loop-variable-capture`

**Signal:** In a codebase that might be pre-Go-1.22, a `for` loop captures its loop variable inside a goroutine or closure without shadowing.

**Drill:**
- **Task:** add `i := i` (or `tc := tc`) at the top of the loop body to capture per iteration. Alternatively, pass the variable as a function argument.
- **Constraint:** no behavior change once the bug is fixed; the goroutines/closures must see the per-iteration value.

---

## Authoring new seeds

When adding a new seed to this pack:

1. **Name it** `<lang>:<idiom-slug>` — consistent with the profile tag format.
2. **Write the Signal** in prose or pseudo-regex — concrete enough that a reader can verify a match by inspection.
3. **Write the Drill** with Task + Constraint — task is what to change, constraint is what makes it bounded (measurable, finite).
4. **Keep it small.** Drills must be ≤20 lines of change, ≤1 function touched, 5–15 minutes of focused work.
5. **Mirror into `.claude/skills/challenge/SKILL.md`.** The runtime source of truth is the command file; this document is the human-readable mirror and the contribution-PR target.

See [`../CONTRIBUTING-LANGUAGE-PACKS.md`](../CONTRIBUTING-LANGUAGE-PACKS.md) for the full authoring guide including how the signal is pattern-matched at runtime, how to write a good hero fixture for your language, and how contributors test their pack locally.
