# Rust language pack

This is the runtime source of truth for chiron's Rust knowledge. The canonical human-readable explanation of each idiom and anti-pattern lives at `docs/languages/rust.md`.

## Rust idiom tag list (for eyeball fallback reference)

### Ownership and error handling

- `rust:question-mark-operator` — `?` for error propagation through `Result`/`Option`
- `rust:match-early-return` — `?` or `let ... else` over nested `match`
- `rust:if-let` — single-pattern match via `if let` / `while let`
- `rust:iterator-chains` — `.filter/.map/.collect` over hand-rolled loops
- `rust:collect-result` — `collect::<Result<Vec<_>, _>>()` for fail-fast aggregation
- `rust:from-into` — `From`/`Into` for ergonomic conversions
- `rust:derive-default` — `#[derive(Default)]` for zero-value construction
- `rust:derive-common-traits` — derive `Debug`, `Clone`, `PartialEq`, etc. on public types

### Trait-based design

- `rust:traits-for-behavior` — traits express behavior; structs hold data
- `rust:impl-trait-return` — `impl Trait` to hide concrete return types
- `rust:where-bounds` — complex generic bounds in `where` clauses
- `rust:asref-into-params` — `AsRef<Path>`, `Into<String>` for flexible parameters

### Error handling

- `rust:thiserror-library` — `#[derive(thiserror::Error)]` enums for libraries
- `rust:anyhow-context` — `anyhow::Result` + `.context(...)` for applications
- `rust:error-enum-over-box-dyn` — named enums over `Box<dyn Error>` for public APIs

### Memory and shared state

- `rust:arc-mutex` — `Arc<Mutex<T>>` for shared mutable state across threads
- `rust:rc-refcell` — `Rc<RefCell<T>>` for single-threaded interior mutability
- `rust:scoped-threads` — `std::thread::scope` for borrow-based parallelism

### Async

- `rust:tokio-spawn-await` — tokio tasks and `JoinHandle::await`
- `rust:tokio-select` — `tokio::select!` for concurrent branches
- `rust:tokio-mpsc` — `tokio::sync::mpsc` channels for actor-style concurrency

### Build and style

- `rust:cfg-test-module` — `#[cfg(test)] mod tests { ... }`
- `rust:tests-dir` — integration tests in `tests/`
- `rust:cargo-workspace` — workspace `Cargo.toml` for multi-crate projects
- `rust:clippy-in-ci` — `cargo clippy -- -D warnings` in CI
- `rust:rustfmt-in-ci` — `cargo fmt --check` in CI
- `rust:newtype-invariant` — newtype wrapper structs for domain invariants
- `rust:builder-pattern` — builder for optional configuration
- `rust:unsafe-safety-comment` — `// SAFETY:` comment on every `unsafe` block
- `rust:must-use` — `#[must_use]` on result-returning functions

## Rust challenge seeds

### `rust:unwrap-everywhere`

**Signal:** Multiple `.unwrap()` calls in non-test code on `Result` or `Option` values that could reasonably fail (I/O, parsing, network, map lookups).

**Drill:**
- **Task:** replace `.unwrap()` with `?` propagation and add context via `thiserror` variants or `.context(...)`.
- **Constraint:** no new `.unwrap()` or `.expect(...)` introduced; the function must return `Result<T, E>` for some `E` that can describe each failure site.

### `rust:question-mark-operator`

**Signal:** Nested `match` expressions on `Result`/`Option` where every non-happy arm returns an error early.

**Drill:**
- **Task:** replace the nested match with `?` propagation.
- **Constraint:** no behavior change; the happy path must move to the base indentation level.

### `rust:string-vs-str`

**Signal:** A function parameter typed `String` whose body only uses it via `.as_str()`, `.chars()`, `.len()`, `.contains(...)`, or similar non-owning methods.

**Drill:**
- **Task:** change the parameter type to `&str`.
- **Constraint:** callers that currently pass a `String` should still work without modification (via deref coercion).

### `rust:vec-vs-slice`

**Signal:** A function parameter typed `Vec<T>` (or `&Vec<T>`) whose body only reads from the collection (`.iter()`, `.len()`, indexing).

**Drill:**
- **Task:** change the parameter type to `&[T]`.
- **Constraint:** the function must work on arrays, vectors, and slice views; no loss of functionality.

### `rust:iterator-chains`

**Signal:** A `for` loop that builds a `Vec` with `.push(...)` based on a conditional or transformation.

**Drill:**
- **Task:** rewrite using `.iter().filter(...).map(...).collect()`.
- **Constraint:** no intermediate `Vec` allocations beyond the final result.

### `rust:collect-result`

**Signal:** A loop that iterates over items, calls a fallible operation on each, and accumulates results in a `Vec` while tracking errors manually.

**Drill:**
- **Task:** rewrite as `let results: Result<Vec<_>, _> = xs.iter().map(f).collect();`.
- **Constraint:** the first error must short-circuit the collection, matching the manual version's behavior.

### `rust:clone-to-appease-borrow-checker`

**Signal:** A function with multiple `.clone()` calls on large types (`Vec<_>`, `String`, user structs) where the cloned value is only read immediately after.

**Drill:**
- **Task:** restructure to borrow instead of clone.
- **Constraint:** remove at least one `.clone()` call without introducing lifetime annotations more complex than the elision rules handle.

### `rust:thiserror-library`

**Signal:** A library-style module (not a `main.rs`) uses `Box<dyn Error>`, `anyhow::Error`, or ad-hoc `String` errors in public function signatures.

**Drill:**
- **Task:** define an error enum with `#[derive(thiserror::Error, Debug)]` describing the concrete failure cases, and update the function signatures to return `Result<T, YourError>`.
- **Constraint:** at least two variants, each with a `#[error("...")]` message; `#[from]` used where conversion is free.

### `rust:lock-across-await`

**Signal:** An `.await` call inside a scope where a `std::sync::MutexGuard` or `RwLockGuard` is still held.

**Drill:**
- **Task:** restructure so the guard is dropped before the `.await`, OR migrate to `tokio::sync::Mutex` if the guarded section genuinely spans the async operation.
- **Constraint:** no change in observable behavior; no new deadlock risk.

### `rust:blocking-call-in-async`

**Signal:** An `async fn` body that calls `std::fs::*`, `std::net::*`, or `std::thread::sleep`, or invokes a known-blocking library.

**Drill:**
- **Task:** replace with the async equivalent (`tokio::fs`, `tokio::net`, `tokio::time::sleep`), or wrap the blocking call in `tokio::task::spawn_blocking`.
- **Constraint:** the function remains `async fn`; no blocking call on the async runtime thread.

### `rust:forgot-to-await`

**Signal:** An expression statement `foo_async_fn(args);` where `foo_async_fn` returns a future and its result isn't awaited or stored.

**Drill:**
- **Task:** add `.await` (and `?` if the result is a `Result`).
- **Constraint:** no new behavior; the future was supposed to run and produce a side effect.

### `rust:early-return-let-else`

**Signal:** A `match` expression with a happy arm that continues execution and a single fallback arm that returns early.

**Drill:**
- **Task:** rewrite using `let ... else` for the early-return case.
- **Constraint:** no behavior change; the happy path must move to the base indentation level.

### `rust:derive-default`

**Signal:** A struct with a manually-implemented `fn new() -> Self` that initializes every field to its own type's zero/default value.

**Drill:**
- **Task:** remove the `new` method and add `#[derive(Default)]`, then use `Struct::default()` or `..Default::default()` at construction sites.
- **Constraint:** all fields must have `Default` implementations; no behavior change at call sites.

### `rust:arc-mutex-overuse`

**Signal:** A single-threaded program (no `std::thread::spawn`, no `tokio::spawn`) that wraps state in `Arc<Mutex<T>>`.

**Drill:**
- **Task:** replace with owned state (`&mut T`) or `Rc<RefCell<T>>` if shared mutation is genuinely needed.
- **Constraint:** no behavior change; the code must still compile and run correctly.

### `rust:iterator-next-unwrap`

**Signal:** `iter.next().unwrap()` where `iter` could reasonably be empty.

**Drill:**
- **Task:** replace with `.ok_or(...)?` or pattern-match explicitly.
- **Constraint:** the function returns an error (or `Option`) instead of panicking on the empty case.

### `rust:as-cast-truncation`

**Signal:** An `as` cast between integer types where the source has a wider range than the destination (e.g., `usize as u32`, `i64 as i32`, `u32 as u8`).

**Drill:**
- **Task:** replace with `try_from(...)?` or explicit range checks.
- **Constraint:** no silent truncation; oversized values produce an error.

### `rust:newtype-invariant`

**Signal:** Multiple function parameters of the same primitive type (`u64`, `String`) representing different conceptual entities (user ID, post ID, email, name).

**Drill:**
- **Task:** wrap at least two of them in distinct newtypes.
- **Constraint:** the types must be distinct at the type level (a `UserId` cannot be passed where a `PostId` is expected).

