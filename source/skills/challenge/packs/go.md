# Go language pack (inlined)

This is the runtime source of truth for chiron's Go knowledge. The canonical human-readable explanation of each idiom and anti-pattern lives at `docs/languages/go.md` — contributors maintain both files together.

## Go idiom tag list (for eyeball fallback reference)

When no seed matches the target file, the step 5 eyeball fallback looks for instances of these named idioms:

### Stdlib primitives

- `go:errgroup-with-context` — cancel siblings on first error via `errgroup.Group` + `WithContext`
- `go:defer-unlock` — exception-safe `mu.Lock()` / `defer mu.Unlock()` pairing
- `go:context-propagation` — `context.Context` as first parameter of I/O and goroutine-spawning functions
- `go:sync-once` — one-time initialization via `sync.Once`
- `go:strings-builder` — efficient string concatenation via `strings.Builder`
- `go:t-run-subtest` — table-driven tests with `t.Run(tc.name, ...)` for clear output and parallelism
- `go:sync-waitgroup` — synchronizing a fixed set of goroutines
- `go:io-composition` — `io.Reader` / `io.Writer` composition via `io.Copy`, `io.MultiReader`, `io.TeeReader`, `io.Pipe`
- `go:signal-notify-context` — graceful shutdown via `signal.NotifyContext`
- `go:errors-is-as` — wrapped error inspection via `errors.Is` and `errors.As`
- `go:mutex-zero-value` — using `sync.Mutex` directly without a constructor
- `go:sync-rwmutex` — `sync.RWMutex` for read-heavy workloads
- `go:sync-pool` — allocation reuse in hot paths via `sync.Pool`
- `go:t-cleanup-helper` — `t.Cleanup` and `t.Helper` in test helpers
- `go:slices-package` — `slices.Sort`, `slices.Contains`, etc. (Go 1.21+)

### Architectural patterns

- `go:worker-pool` — fan-out with a shared input channel
- `go:pipeline` — stages connected by channels with per-stage cancellation
- `go:functional-options` — `WithX` configuration options for flexible constructors
- `go:http-middleware` — `http.Handler` wrapper composition
- `go:graceful-shutdown` — signal → context cancel cascade

### Design principles

- `go:accept-interfaces-return-structs`
- `go:small-interface` — interfaces of 1–3 methods
- `go:error-wrap-percent-w` — `fmt.Errorf("context: %w", err)`
- `go:zero-value-useful` — types usable from `var x T`
- `go:early-return-error` — handle errors first, keep happy path at base indent
- `go:interface-at-consumer` — interfaces defined where they're used, not where implemented
- `go:explicit-di` — dependency injection via constructor parameters, no framework
- `go:package-by-feature` — packages organized by domain, not technical layer
- `go:reduce-hot-path-allocs` — minimize allocations in benchmark-proven hot paths (profile first)
- `go:composition-over-inheritance` — struct embedding instead of inheritance

## Go challenge seeds

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

