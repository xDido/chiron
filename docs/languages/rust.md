---
language: rust
last_reviewed_against: "1.94"
upstream_version_source:
  type: endoflife
  product: rust
---

# Rust language pack

Canonical idioms, common pitfalls, mental-model shifts, and challenge seeds for Rust. This file is the **human-readable reference** for chiron's Rust knowledge base. The content is mirrored into `.claude/skills/challenge/SKILL.md` at runtime for the `/challenge` command's seeded pass.

**Contributors:** when adding idioms or seeds here, also update the corresponding section in `.claude/skills/challenge/SKILL.md`. See [`CONTRIBUTING-LANGUAGE-PACKS.md`](../CONTRIBUTING-LANGUAGE-PACKS.md) for the authoring guide.

---

## Read this first (stdlib and ecosystem anchors)

Docs chiron points to most often. When introducing any of these primitives during a teach turn, offer the corresponding pointer as a "read this first."

| Primitive | Doc pointer | Used for |
|-----------|-------------|----------|
| `Result<T, E>` | `doc.rust-lang.org/std/result` | Recoverable errors; the `?` operator composes chains |
| `Option<T>` | `doc.rust-lang.org/std/option` | Absence of a value; nullability done right |
| `Iterator` | `doc.rust-lang.org/std/iter/trait.Iterator.html` | Lazy zero-cost iteration, `.map/.filter/.collect` |
| `std::sync` | `doc.rust-lang.org/std/sync` | `Arc`, `Mutex`, `RwLock`, `Once`, atomics |
| `std::thread` | `doc.rust-lang.org/std/thread` | OS threads, scoped threads |
| `tokio` | `docs.rs/tokio` | Async runtime, tasks, channels, `select!` |
| `serde` | `docs.rs/serde` | Serialization derived via `#[derive]` |
| `thiserror` | `docs.rs/thiserror` | Library-grade error enums with `#[derive(Error)]` |
| `anyhow` | `docs.rs/anyhow` | Application-grade error context and ad-hoc chains |
| `clap` | `docs.rs/clap` | CLI argument parsing derived from structs |
| `tracing` | `docs.rs/tracing` | Structured, async-aware logging and spans |
| `cargo` | `doc.rust-lang.org/cargo` | Build, test, workspaces, features |

**Meta-resources:**

- **The Rust Book** — `doc.rust-lang.org/book` — canonical introduction, ownership and lifetimes in depth
- **Rust by Example** — `doc.rust-lang.org/rust-by-example` — runnable examples for every core concept
- **The Rust Reference** — `doc.rust-lang.org/reference` — language semantics when the book isn't precise enough
- **The Rustonomicon** — `doc.rust-lang.org/nomicon` — unsafe code guide; read only when you need it
- **Rust API Guidelines** — `rust-lang.github.io/api-guidelines` — the checklist every library should pass
- **clippy lints** — `rust-lang.github.io/rust-clippy/master` — catalog of automated "taste" checks

---

## Idioms — canonical patterns worth knowing

Each idiom has: what it is, when to use it, a minimal example, and its tag for profile logging.

### Ownership and error handling primitives

#### 1. `?` operator for error propagation

**Tag:** `rust:question-mark-operator`

When a function returns `Result<T, E>`, use `?` to propagate errors without matching. The `From` trait converts errors so long as the destination type implements `From<SourceError>`.

```rust
fn read_config(path: &Path) -> Result<Config, ConfigError> {
    let contents = std::fs::read_to_string(path)?;
    let config: Config = toml::from_str(&contents)?;
    Ok(config)
}
```

Background: `doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html`.

#### 2. `match` on `Option` and `Result` with early return

**Tag:** `rust:match-early-return`

Prefer early-return via `?` or `let ... else` over nested `match`. Reserve `match` for cases where you genuinely need multiple branches for the `Some`/`None` or `Ok`/`Err` outcomes.

```rust
let Some(user) = load_user(id) else {
    return Err(AppError::NotFound);
};

let permissions = match user.role {
    Role::Admin => Permissions::all(),
    Role::Member => Permissions::basic(),
    Role::Guest => return Err(AppError::Forbidden),
};
```

#### 3. `if let` / `while let` for single-pattern matches

**Tag:** `rust:if-let`

When you only care about one variant of an enum, use `if let` instead of a full `match` with a `_ => ()` arm.

```rust
if let Some(name) = config.name.as_ref() {
    println!("hello, {name}");
}

while let Some(event) = rx.recv().await {
    handle(event);
}
```

#### 4. `Iterator` chains instead of hand-rolled loops

**Tag:** `rust:iterator-chains`

Iterators are lazy and fuse into tight loops at compile time. Prefer `.filter/.map/.collect` over `for` loops that build a `Vec` manually.

```rust
let active_names: Vec<String> = users
    .iter()
    .filter(|u| u.active)
    .map(|u| u.name.clone())
    .collect();
```

Background: `doc.rust-lang.org/std/iter/trait.Iterator.html`.

#### 5. `collect::<Result<Vec<_>, _>>()` — fail-fast aggregation

**Tag:** `rust:collect-result`

An iterator of `Result`s can be collected into a `Result<Vec<_>, _>` — the first `Err` short-circuits.

```rust
let parsed: Result<Vec<i32>, _> = lines.iter().map(|s| s.parse::<i32>()).collect();
let parsed = parsed?; // propagate the first parse error
```

#### 6. `From` / `Into` for ergonomic conversions

**Tag:** `rust:from-into`

Implement `From<A> for B` and you get `Into<B> for A` for free. Callers can pass `a.into()` anywhere a `B` is expected; the `?` operator also uses `From` to convert errors.

```rust
impl From<std::io::Error> for MyError {
    fn from(e: std::io::Error) -> Self {
        MyError::Io(e)
    }
}
// Now `?` on any `io::Result` composes into a `Result<_, MyError>`.
```

#### 7. `Default` for zero-value construction

**Tag:** `rust:derive-default`

`#[derive(Default)]` gives you a sensible default constructor for free on structs whose fields all implement `Default`. Use `..Default::default()` in struct literals to fill in unspecified fields.

```rust
#[derive(Default)]
struct Config {
    timeout_ms: u64,
    retries: u32,
    verbose: bool,
}

let c = Config { timeout_ms: 5000, ..Default::default() };
```

#### 8. `#[derive(...)]` the common traits

**Tag:** `rust:derive-common-traits`

Public data types should derive `Debug`, `Clone`, and usually `PartialEq`. Derive `Eq`/`Hash` when the type is a map key. Derive `Serialize`/`Deserialize` when crossing the IO boundary. Deriving is zero-cost and keeps you consistent with ecosystem expectations.

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct UserId(pub u64);
```

### Trait-based design

#### 9. Traits for behavior, structs for data

**Tag:** `rust:traits-for-behavior`

Rust has no inheritance. Express "this type can do X" with a trait; express "this type holds Y" with a struct. Compose behavior by implementing multiple traits on the same type.

```rust
trait Draw { fn draw(&self, surface: &mut Surface); }
trait Bounds { fn bounds(&self) -> Rect; }

struct Circle { radius: f32, center: Point }

impl Draw for Circle { fn draw(&self, s: &mut Surface) { /* ... */ } }
impl Bounds for Circle { fn bounds(&self) -> Rect { /* ... */ } }
```

#### 10. `impl Trait` in return types

**Tag:** `rust:impl-trait-return`

Return `impl Trait` when you want to hide the concrete type (often a complex iterator adapter) without allocating a `Box<dyn Trait>`. The compiler still monomorphizes statically.

```rust
fn evens(xs: &[i32]) -> impl Iterator<Item = i32> + '_ {
    xs.iter().copied().filter(|x| x % 2 == 0)
}
```

#### 11. Generic bounds with `where` clauses

**Tag:** `rust:where-bounds`

Push complex bounds into a `where` clause for readability. Keep the function signature scannable.

```rust
fn merge<K, V, I>(items: I) -> HashMap<K, Vec<V>>
where
    K: Eq + Hash,
    I: IntoIterator<Item = (K, V)>,
{
    // ...
    unimplemented!()
}
```

#### 12. `AsRef<T>` and `Into<T>` for flexible parameters

**Tag:** `rust:asref-into-params`

Accept `impl AsRef<Path>` for file paths and `impl Into<String>` for owned strings — callers pick whatever they already have without allocating extra conversions.

```rust
pub fn open(path: impl AsRef<Path>) -> io::Result<File> {
    File::open(path.as_ref())
}
```

### Error handling patterns

#### 13. `thiserror` for library errors

**Tag:** `rust:thiserror-library`

Libraries should expose an `enum` error type with a `#[derive(thiserror::Error, Debug)]`. Variants describe the error cases; `#[from]` auto-generates conversions.

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("i/o error reading config")] 
    Io(#[from] std::io::Error),
    #[error("invalid toml: {0}")] 
    Parse(#[from] toml::de::Error),
    #[error("missing field: {0}")] 
    Missing(&'static str),
}
```

Background: `docs.rs/thiserror`.

#### 14. `anyhow::Result` and `.context(...)` for applications

**Tag:** `rust:anyhow-context`

Application binaries don't care about structured error types; they care about rich chains of context. Use `anyhow::Result<T>` and chain `.context("what I was doing")` at each layer.

```rust
use anyhow::{Context, Result};

fn load_config(path: &Path) -> Result<Config> {
    let contents = std::fs::read_to_string(path)
        .with_context(|| format!("reading {}", path.display()))?;
    let config: Config = toml::from_str(&contents)
        .with_context(|| format!("parsing {} as TOML", path.display()))?;
    Ok(config)
}
```

#### 15. Custom error enums over `Box<dyn Error>`

**Tag:** `rust:error-enum-over-box-dyn`

For anything public, prefer a named enum over `Box<dyn Error>`. Callers can match on variants; the type survives across crate boundaries.

### Memory and shared state

#### 16. `Arc<Mutex<T>>` only when you actually share

**Tag:** `rust:arc-mutex`

`Arc<Mutex<T>>` is the canonical "shared mutable state across threads" primitive. Reach for it when you have multiple threads that must mutate the same data. Don't reach for it just because you haven't modeled your data flow yet.

```rust
use std::sync::{Arc, Mutex};

let counter = Arc::new(Mutex::new(0_u64));
let c = Arc::clone(&counter);
std::thread::spawn(move || {
    *c.lock().unwrap() += 1;
});
```

#### 17. `Rc<RefCell<T>>` for single-threaded interior mutability

**Tag:** `rust:rc-refcell`

When a graph/tree structure in a single thread needs shared mutation, `Rc<RefCell<T>>` is the escape hatch. Prefer redesigning the data flow first — if you find yourself reaching for this, question whether the problem is actually shared mutation or just borrow checker fight.

#### 18. Scoped threads for short-lived work

**Tag:** `rust:scoped-threads`

`std::thread::scope` gives you threads that can borrow local references — no `'static` requirement, no `Arc` for read-only sharing. Great for parallel work on a stack-allocated slice.

```rust
let data = vec![1, 2, 3, 4, 5];
std::thread::scope(|s| {
    for chunk in data.chunks(2) {
        s.spawn(move || process(chunk));
    }
});
```

### Async

#### 19. `tokio::spawn` + `JoinHandle::await`

**Tag:** `rust:tokio-spawn-await`

The async equivalent of `std::thread::spawn`. Returns a `JoinHandle<T>` you `.await` to collect the result.

```rust
let handle = tokio::spawn(async move { fetch(url).await });
let data = handle.await??;
```

#### 20. `tokio::select!` for concurrent branches

**Tag:** `rust:tokio-select`

For "whichever happens first" — race a timeout against I/O, or combine cancellation with a blocking read.

```rust
tokio::select! {
    result = fetch(url) => result?,
    _ = tokio::time::sleep(Duration::from_secs(5)) => {
        return Err(MyError::Timeout);
    }
}
```

#### 21. `tokio::sync::mpsc` channels for actor-style concurrency

**Tag:** `rust:tokio-mpsc`

Multi-producer, single-consumer channels are the idiomatic way to pass work to a dedicated worker task. Bounded channels apply backpressure; unbounded ones don't.

```rust
let (tx, mut rx) = tokio::sync::mpsc::channel::<Job>(100);
tokio::spawn(async move {
    while let Some(job) = rx.recv().await {
        process(job).await;
    }
});
```

### Build and packaging

#### 22. `#[cfg(test)]` modules alongside code

**Tag:** `rust:cfg-test-module`

Unit tests live inside the crate, in a `mod tests` block gated by `#[cfg(test)]`. They can see private functions of the module they're testing.

```rust
fn internal(x: i32) -> i32 { x + 1 }

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn internal_adds_one() {
        assert_eq!(internal(2), 3);
    }
}
```

#### 23. Integration tests in `tests/`

**Tag:** `rust:tests-dir`

Black-box integration tests live at `tests/<name>.rs`. They can only call public APIs — which is what you want for testing the crate's surface.

#### 24. `Cargo.toml` workspaces for multi-crate projects

**Tag:** `rust:cargo-workspace`

For multi-crate projects, use a root `Cargo.toml` with `[workspace] members = [...]`. Shared dependencies go in `[workspace.dependencies]`; member crates reference them with `workspace = true`.

### Safety and style

#### 25. `clippy` lints as part of CI

**Tag:** `rust:clippy-in-ci`

`cargo clippy -- -D warnings` in CI catches a wide range of style and correctness issues. Treat clippy lints as bugs until you've explicitly justified an `#[allow(...)]`.

#### 26. `rustfmt` as part of CI

**Tag:** `rust:rustfmt-in-ci`

`cargo fmt --check` enforces formatting automatically. Never argue about style.

#### 27. Newtypes for domain invariants

**Tag:** `rust:newtype-invariant`

Wrap primitives in single-field structs so the type system expresses intent. A function that takes a `UserId` cannot be called with a `PostId`, even though both are `u64` underneath.

```rust
pub struct UserId(u64);
pub struct PostId(u64);

fn load(id: UserId) { /* ... */ }
```

#### 28. Builder pattern for optional configuration

**Tag:** `rust:builder-pattern`

For types with many optional fields, provide a builder. Each `with_*` method consumes `self` and returns a new value with the field set. Finalize with `.build()`.

```rust
let client = ClientBuilder::new()
    .with_timeout(Duration::from_secs(10))
    .with_retries(3)
    .build();
```

#### 29. `unsafe` only with a safety comment

**Tag:** `rust:unsafe-safety-comment`

Every `unsafe` block must be preceded by a `// SAFETY:` comment explaining the invariants the caller has verified. `unsafe` without a safety comment fails review.

```rust
// SAFETY: index is checked to be in bounds on the line above.
let item = unsafe { slice.get_unchecked(index) };
```

#### 30. `#[must_use]` on result-returning functions

**Tag:** `rust:must-use`

Annotate methods whose return value must not be ignored — builder `.build()`, `Iterator` adapters, `Result` wrappers. The compiler warns when the value is dropped.

```rust
#[must_use = "the iterator is lazy; call .collect() or .for_each()"]
pub fn filter<P>(self, predicate: P) -> Filter<Self, P> where P: FnMut(&Self::Item) -> bool {
    // ...
    unimplemented!()
}
```

---

## Common pitfalls (anti-patterns)

Each pitfall has: the bug, why it's bad, the fix, and its tag.

### Error handling pitfalls

#### 1. `.unwrap()` in production code

**Tag:** `rust:unwrap-everywhere`

```rust
// BUG: panics on any error, no context
let config = std::fs::read_to_string("config.toml").unwrap();
let parsed: Config = toml::from_str(&config).unwrap();
```

**Fix:** propagate with `?`, add context.

```rust
let config = std::fs::read_to_string("config.toml")
    .context("reading config.toml")?;
let parsed: Config = toml::from_str(&config)
    .context("parsing config.toml")?;
```

`.unwrap()` is fine in tests, examples, and provably infallible cases — document the last one.

#### 2. `.expect("...")` as a lazy replacement for unwrap

**Tag:** `rust:expect-as-todo`

Better than `.unwrap()` (it has a message), but often used as a placeholder that ships to prod. Treat every `.expect` like a `TODO: handle this properly`.

**Fix:** return the error up the call stack. Reserve `.expect` for invariants the type system can't express.

#### 3. Swallowing errors with `let _ =`

**Tag:** `rust:ignored-error-let-underscore`

```rust
// BUG: the error is silently dropped
let _ = file.write_all(b"hello");
```

**Fix:** propagate with `?`, or at minimum log the error.

#### 4. Over-wide error types

**Tag:** `rust:error-type-too-wide`

A public function returning `Result<T, Box<dyn Error + Send + Sync>>` is giving the caller no useful information. Define a named enum that describes the failures the caller should care about.

### Borrow checker pitfalls

#### 5. `.clone()` as a universal borrow fix

**Tag:** `rust:clone-to-appease-borrow-checker`

```rust
// BUG: cloning a big Vec to quiet the borrow checker instead of restructuring
fn process(items: &Vec<BigItem>) {
    let copy = items.clone(); // expensive
    // ...
}
```

**Fix:** accept `&[BigItem]` and borrow. If you need ownership, take `Vec<BigItem>` directly (the caller's problem to decide).

#### 6. `String` where `&str` would do

**Tag:** `rust:string-vs-str`

```rust
// BUG: forces the caller to allocate
fn greet(name: String) { println!("hello, {name}"); }
```

**Fix:** take `&str`.

```rust
fn greet(name: &str) { println!("hello, {name}"); }
```

Same rule for `Vec<T>` vs `&[T]` and `PathBuf` vs `&Path`: take the borrowed form unless you genuinely need ownership.

#### 7. `Vec<T>` parameter instead of `&[T]`

**Tag:** `rust:vec-vs-slice`

```rust
// BUG: forces the caller to have a Vec
fn sum(xs: Vec<i32>) -> i32 { xs.iter().sum() }
```

**Fix:**

```rust
fn sum(xs: &[i32]) -> i32 { xs.iter().sum() }
```

Now the function works on any slice view, whether the caller has a `Vec`, an array, or a `&[i32]` from somewhere else.

#### 8. Nested `Rc<RefCell<T>>` instead of redesigning

**Tag:** `rust:rc-refcell-graph`

Deeply-nested `Rc<RefCell<Option<Rc<RefCell<T>>>>>` usually indicates the data model should be a `Vec<T>` with indices as "pointers". Fight the borrow checker by restructuring, not by adding more wrappers.

#### 9. Lifetime annotations everywhere

**Tag:** `rust:lifetime-noise`

Explicit lifetime annotations on every function are usually unnecessary. The compiler applies lifetime elision rules that cover the common cases. Remove annotations and let the compiler tell you which ones are actually required.

### Iterator pitfalls

#### 10. Hand-rolled loop instead of an iterator adapter

**Tag:** `rust:hand-rolled-loop`

```rust
// BUG: noisy and easy to get wrong
let mut result = Vec::new();
for x in xs {
    if x.active {
        result.push(x.id);
    }
}
```

**Fix:**

```rust
let result: Vec<_> = xs.iter().filter(|x| x.active).map(|x| x.id).collect();
```

#### 11. `.unwrap()` on `.next()` instead of handling the empty case

**Tag:** `rust:iterator-next-unwrap`

```rust
// BUG: panics on empty iterator
let first = items.iter().next().unwrap();
```

**Fix:** use `?`-propagation or match explicitly.

```rust
let first = items.iter().next().ok_or(MyError::Empty)?;
```

#### 12. Collecting only to iterate again

**Tag:** `rust:collect-then-iterate`

```rust
// BUG: allocates a throwaway Vec
let names: Vec<_> = users.iter().map(|u| u.name.clone()).collect();
for name in &names { println!("{name}"); }
```

**Fix:** iterate the adapter directly.

```rust
for name in users.iter().map(|u| &u.name) {
    println!("{name}");
}
```

### Concurrency pitfalls

#### 13. `.lock().unwrap()` without handling poison

**Tag:** `rust:mutex-poison-unwrap`

`.lock().unwrap()` is idiomatic in most cases — a poisoned mutex usually means unrecoverable state. But don't use it in libraries that should survive a thread panic. Handle `PoisonError` explicitly there.

#### 14. Holding a lock across an `.await`

**Tag:** `rust:lock-across-await`

```rust
// BUG: holds the lock for the entire await; deadlock risk
let mut guard = shared.lock().unwrap();
some_async_op().await;
guard.value += 1;
```

**Fix:** drop the guard before the `.await`, or use `tokio::sync::Mutex` which is async-aware.

```rust
{
    let mut guard = shared.lock().unwrap();
    guard.value += 1;
} // guard dropped here
some_async_op().await;
```

#### 15. `std::sync::Mutex` inside async code

**Tag:** `rust:sync-mutex-in-async`

Blocking synchronous locks starve the async runtime. Use `tokio::sync::Mutex` (or `parking_lot::Mutex` if the critical section is tiny and known-fast) in async contexts.

### Async pitfalls

#### 16. Blocking calls inside async functions

**Tag:** `rust:blocking-call-in-async`

```rust
// BUG: blocks the async runtime thread
async fn read_file(path: &Path) -> io::Result<String> {
    std::fs::read_to_string(path) // sync!
}
```

**Fix:** use `tokio::fs::read_to_string(path).await`, or wrap in `tokio::task::spawn_blocking` if no async alternative exists.

#### 17. Forgetting `.await`

**Tag:** `rust:forgot-to-await`

```rust
// BUG: the future is constructed but never polled
let _ = fetch(url);
```

**Fix:** `fetch(url).await?;`. Rust's `#[must_use]` catches most of these but not all.

### Type system pitfalls

#### 18. `as` casts that silently truncate

**Tag:** `rust:as-cast-truncation`

```rust
// BUG: silently truncates if n > u8::MAX
let byte = n as u8;
```

**Fix:** use `u8::try_from(n)?` or explicit range checks.

```rust
let byte: u8 = n.try_into().context("n doesn't fit in u8")?;
```

#### 19. `panic!` for unexpected input

**Tag:** `rust:panic-on-bad-input`

Panicking on input you didn't anticipate is closer to throwing `RuntimeException`. Return a `Result` and let the caller handle it.

#### 20. `#[allow(dead_code)]` as a quiet warning muter

**Tag:** `rust:allow-dead-code-blanket`

`#[allow(dead_code)]` at the module or crate level hides real problems. Use it per-item when you have a documented reason, not as a blanket silence.

### Testing pitfalls

#### 21. Tests in their own crate instead of `#[cfg(test)]`

**Tag:** `rust:test-in-own-crate`

Putting unit tests in a separate crate means they can't see private functions. Use `#[cfg(test)] mod tests { ... }` inside the same file.

#### 22. `unwrap()` in tests without context

**Tag:** `rust:unwrap-in-tests`

Tests with raw `.unwrap()` produce terrible failure messages. Use `.expect("what I was doing")`, or propagate with `?` if the test function returns `Result`.

```rust
#[test]
fn parse_config() -> anyhow::Result<()> {
    let config: Config = toml::from_str(EXAMPLE).context("parsing example config")?;
    assert_eq!(config.version, 1);
    Ok(())
}
```

### Unsafe pitfalls

#### 23. `unsafe` without a `SAFETY:` comment

**Tag:** `rust:unsafe-no-safety-comment`

An `unsafe` block that doesn't explain *why* it's sound is a bug waiting to happen.

**Fix:** always preface `unsafe` with a `// SAFETY:` comment naming the invariants.

#### 24. Transmuting across types

**Tag:** `rust:transmute-abuse`

`std::mem::transmute` is almost always the wrong tool. Use safe alternatives: `as` casts for numerics, `from_ne_bytes`/`to_ne_bytes` for byte representations, `bytemuck` for trait-bounded reinterpretation.

### Ecosystem pitfalls

#### 25. Not running `cargo clippy`

**Tag:** `rust:no-clippy`

Clippy catches a large class of real bugs (needless clones, lossy casts, unnecessary allocations, `println!` in library code). Treat it as part of the language.

---

## Mental-model deltas (for engineers coming from GC languages)

Things that work differently in Rust than in Java/C#/Python/JavaScript. Chiron calls these out when they come up in conversation.

1. **Ownership is a compile-time concept.** Every value has exactly one owner. When the owner goes out of scope, the value is dropped. No GC, no refcounting by default.

2. **Borrowing is just "temporary loan."** A `&T` borrow is a read-only loan; `&mut T` is an exclusive loan. You cannot have a mutable borrow while any other borrow is live. The compiler enforces this at compile time.

3. **Lifetimes describe "how long a reference is valid."** They are not runtime data; they're constraints the compiler checks. Most of the time, elision rules fill them in for you.

4. **No null.** Absence is modeled with `Option<T>`. `Some(value)` or `None` — the type system forces you to handle both.

5. **No exceptions.** Recoverable errors use `Result<T, E>`. Unrecoverable bugs `panic!` and unwind the stack (or abort).

6. **Traits are not interfaces.** A trait can have default method implementations, associated types, and generic bounds. Types opt in via `impl Trait for Type`, not inheritance.

7. **No inheritance.** Behavior composition happens via trait bounds and generics, not class hierarchies.

8. **Generics are monomorphized.** `fn f<T>(x: T)` becomes a separate compiled function per concrete `T`. Zero cost at runtime; pays in compile time and binary size.

9. **`String` and `&str` are different types.** `String` owns its bytes (on the heap). `&str` is a borrowed view into some bytes (on the stack, or part of a `String`, or part of a static). Function parameters almost always want `&str`.

10. **`Vec<T>` and `&[T]` are different types.** Same relationship as `String`/`&str`. Functions take `&[T]` unless they genuinely need to own or grow the vector.

11. **Cloning is explicit.** `x.clone()` is a visible cost. There is no implicit copy for non-trivial types — if you want two copies, you call `.clone()`.

12. **`Copy` types copy implicitly.** Primitives (`i32`, `bool`, `char`) and small structs marked `#[derive(Copy, Clone)]` are duplicated on assignment. The point is: you opt in explicitly by deriving `Copy`.

13. **`Drop` runs deterministically.** When a value goes out of scope, its `Drop` impl runs immediately. This is how RAII works — files, locks, sockets all clean up without explicit calls.

14. **Iterators are zero-cost.** `.filter(...).map(...).collect()` compiles to the same machine code as a hand-rolled loop. Use them without guilt.

15. **`match` is exhaustive.** Missing an enum variant is a compile error, not a warning. This is the single biggest refactoring safety net.

16. **Enums can hold data.** `Option`, `Result`, and user-defined enums are sum types with per-variant payloads. Nothing like Java enums.

17. **`Box<T>` puts a single value on the heap.** Used for recursive types (`Box<Node>`), trait objects (`Box<dyn Trait>`), and explicit heap allocation. Not a replacement for `Vec`.

18. **`Arc<T>` is atomic refcount; `Rc<T>` is single-threaded refcount.** Reach for `Rc` only in single-threaded code — it's faster but not `Send`.

19. **`Send` and `Sync` are auto-traits.** The compiler tracks which types can cross thread boundaries (`Send`) and which can be shared by reference across threads (`Sync`). You almost never implement them manually.

20. **Macros are metaprogramming, not functions.** `println!`, `vec!`, `format!` are macros (note the `!`). They expand at compile time. `macro_rules!` is the declarative form; `proc_macro` is the procedural form.

21. **Crates are the unit of compilation.** One crate compiles to one artifact (library or binary). Workspaces let you manage many crates together via a root `Cargo.toml`.

22. **`Cargo.toml` is the source of truth.** Dependencies, features, build config, metadata. `Cargo.lock` pins exact versions for reproducible builds.

23. **Features are conditional compilation.** `#[cfg(feature = "foo")]` enables code when a feature is active. Used for optional dependencies and platform-specific code.

24. **`unsafe` is opt-in, not opt-out.** Most Rust code is safe by default. `unsafe` blocks mark the spots where the compiler trusts you to uphold invariants manually.

25. **Async is cooperative, not preemptive.** `.await` is the only place a task can yield to the runtime. Blocking code inside async is a bug — it starves the scheduler.

---

## Challenge seeds

Each seed is a pre-authored drill that `/challenge` pattern-matches against source code. When the seed's `Signal` matches a file, the `Drill` becomes a concrete practice target for the user.

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

---

## Authoring new seeds

When adding a new seed to this pack:

1. **Name it** `rust:<idiom-slug>` — consistent with the profile tag format.
2. **Write the Signal** in prose or pseudo-regex — concrete enough that a reader can verify a match by inspection.
3. **Write the Drill** with Task + Constraint — task is what to change, constraint is what makes it bounded (measurable, finite).
4. **Keep it small.** Drills must be ≤20 lines of change, ≤1 function touched, 5–15 minutes of focused work.
5. **Mirror into `.claude/skills/challenge/SKILL.md`.** The runtime source of truth is the command file; this document is the human-readable mirror and the contribution-PR target.
