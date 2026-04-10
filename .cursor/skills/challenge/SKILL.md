---
name: challenge
description: Generate idiom drills grounded in specific lines of a source file. Seeded patterns first, model eyeball fallback on no match. Grades user attempts /10 and writes outcomes to ~/.chiron/profile.json.
---

# /challenge — hero feature: drills from your own code

`/challenge` reads a source file, finds 1–3 concrete practice targets grounded in specific lines, and presents them as short drills you can complete in 5–15 minutes. Each drill is tied to an idiom from the language pack. Your attempts get graded `/10` with honest, specific feedback.

## Usage

- `/challenge` — drill on the current file in focus
- `/challenge path/to/file.go` — drill on a specific file
- `/challenge functionName` — locate the named function in the current file and drill on it

## The arguments

```
$ARGUMENTS
```

---

## CRITICAL — user instructions always win

Before anything else, check `.cursorrules`. If user instructions conflict with this command's behavior — e.g., *"just fix my code directly, don't drill me"* — follow the user. Switch to a direct fix-and-explain mode, skip drill generation, and don't write to the profile file.

---

## Current level (read from ~/.chiron/config.json)

Before applying the behavior below, read `~/.chiron/config.json` if it exists. If the file has a `voice_level` field set to `"gentle"`, `"default"`, or `"strict"`, apply the matching rules from the **"Level rules"** section below (before the Go language pack). The level affects the voice tone of drill presentation and grading, how quickly you offer the full solution to a struggling attempt, and how you respond to `"just show me"` requests. If the config is missing, invalid JSON, or `voice_level` is unset or an unknown value, apply the `default` level (no change from v0.1 baseline behavior). Never crash on bad config input — silent fallback to default is the correct behavior.

---

## Step 1 — Target resolution

From `$ARGUMENTS`, determine the target file:

- **Empty arguments** → use the file currently in focus in the conversation. If there's no file in focus, respond: *"No file in focus. Run `/challenge path/to/file.ext` with a file path."* and stop.
- **Arguments look like a path** (contain `/` or `\` or a file extension) → treat as a file path and read it.
- **Arguments look like a function name** (identifier only, no slashes, no extension) → locate the function in the current file and drill on just that function.

If the target file cannot be read, respond with a clear error message (include the path you tried) and stop. Do not generate drills speculatively.

## Step 2 — Language detection

Detect the language from the file extension:

- `.go` → Go
- `.rs` → Rust
- `.py` → Python
- `.js`, `.mjs`, `.cjs` → JavaScript
- `.ts`, `.tsx` → TypeScript (TypeScript pack + JavaScript pack both apply)
- `.java` → Java
- `.cs` → C#
- `.kt`, `.kts` → Kotlin
- `.swift` → Swift
- Any other extension → respond:

  > chiron ships with language packs for Go, Rust, Python, JavaScript, TypeScript, Java, C#, Kotlin, and Swift. Community contributions for other languages are welcomed — see `docs/CONTRIBUTING-LANGUAGE-PACKS.md`.

  Then stop.

## Step 3 — Language pack is inlined below

The language packs (idiom tag list + challenge seeds for each supported language) live in the **"<Language> language pack (inlined)"** sections at the bottom of this file. Use the section matching the detected language as the reference for steps 4–5 below. For TypeScript files, also consult the JavaScript pack — TypeScript files can match JS seeds. Do NOT try to read `docs/languages/*.md` at runtime — those files are human-readable mirrors for contributors, not runtime dependencies.

Each challenge seed in the inlined section has this shape:

```markdown
### <tag in language:idiom format>
**Signal:** <regex, structural description, or prose pattern to look for>
**Drill:**
- Task: <what the user should change>
- Constraint: <what makes this a drill, not a rewrite>
```

## Step 4 — Seeded pass

Scan the target file against each `## Challenge seeds` entry in the language pack.

For each seed, check whether the file matches the `Signal`. Matching can be literal regex, structural pattern matching, or semantic pattern recognition — whichever the seed specifies.

If **1–3 seeds match**, prepare a drill from each matching seed, keyed to the specific lines in the file where the pattern appears. Then skip to **Step 6**.

If **more than 3 seeds match**, pick the 3 most pedagogically interesting and use those. Skip to Step 6.

If **zero seeds match**, proceed to Step 5.

## Step 5 — Eyeball fallback (when no seeds match)

If the seeded pass finds nothing, fall back to a model eyeball pass:

1. Read the target file carefully.
2. Using the language pack's full idiom list as reference, identify 1–3 things in the code that could be more idiomatic.
3. For each, prepare a drill with a model-invented tag in `<language>:<idiom>` format.
4. Preface your response with: *"No seeded patterns matched this file. Here are 1–3 things I noticed that could be more idiomatic:"*

Eyeball drills must follow the same format and sizing rules as seeded drills.

## Step 6 — Present drills

Present each drill in this compact format (3 lines per drill, not 6):

```
Drill 1/3 — <idiom tag> @ <file>:<line-range>
<what the user should do> (current: <what's there now>)
Constraint: <what makes this a drill, not a rewrite>
```

**Style rules:**

- No `## Drill` header — inline the number in the drill line
- No `**Location:**` label — use `@` as separator
- Merge "task" and "current shape" onto one line with `(current: ...)` parenthetical
- `Constraint:` stays on its own line because it's the load-bearing rule for grading

**Drill sizing requirements (enforce strictly):**

Drill sizing is tunable via `~/.chiron/config.json` (v0.2.1+). Read the `drill` object from the config at the start of this step. Apply user overrides with fallback to hardcoded defaults. Every field is independently optional — partial override is supported.

- **Max lines changed** — `drill.max_lines_changed` (default **20**, clamped to the range [1, 100]). Invalid values (non-integer, zero, negative, or >100) silently fall back to 20.
- **Max functions touched** — `drill.max_functions_touched` (default **1**, clamped to [1, 5]). Invalid values silently fall back to 1.
- **Time range** — `drill.time_minutes_min` to `drill.time_minutes_max` (defaults **5** and **15**, each clamped to [1, 60]). If `time_minutes_min > time_minutes_max` after reading, fall back BOTH fields to defaults (5 and 15). Invalid individual values fall back to their own defaults.
- **Expressible in one sentence** — quality check, NOT tunable. If the task can't be stated in a single sentence, the drill is too big; narrow it or split it.

If `~/.chiron/config.json` is missing, invalid JSON, or has no `drill` object, apply all hardcoded defaults (20 / 1 / 5–15) — the v0.2.0 behavior. Never crash on bad config input; silent fallback is the correct behavior.

After all drills, close with:

> Pick one and make the change. Paste your result (or the diff) and I'll review.

## Step 7 — Grade the user's attempt

When the user pastes their attempt (or makes an edit you can inspect):

1. **Check the constraint.** Did they satisfy the stated constraint? This is binary — pass or fail.
2. **Assign a `/10` grade.** Senior-engineer scoring: correctness + idiom fit + readability. Be honest but never cruel. Always explain the specific points lost. Example:

   > 7/10 — works, and the `errgroup.WithContext` usage is correct. Loses 2 points for shadowing `ctx` inside the goroutine (subtle footgun). Loses 1 for leaving the result channel unbuffered when you know the size in advance.

3. **Idiom callout.** If the solution touches a canonical pattern, name it:

   > That's the worker-pool shape with shared input channel — canonical Go. Background: `pkg.go.dev/golang.org/x/sync/errgroup`.

4. **If the user struggles:** offer an L1 hint from the chiron hint ladder, not a full solution. Users who explicitly want the full answer can say *"just show me"* — anti-pattern #2 applies here, never refuse to ship when asked.

## Step 8 — Log to profile

Write an entry to `~/.chiron/profile.json`.

**If the file does not exist**, create it with this skeleton, generating a fresh UUID v4 for `install_id`:

```json
{
  "schema_version": 1,
  "install_id": "<GENERATE A UUID v4 HERE, e.g., 8f2a9c1e-4b3d-4f7e-9a1b-2c3d4e5f6a7b>",
  "entries": []
}
```

The UUID is generated exactly once on first profile write. On subsequent writes, preserve the existing `install_id` — never regenerate.

**Append an entry** to the `entries` array:

```json
{
  "ts": "<ISO 8601 UTC timestamp, e.g., 2026-04-09T17:23:00Z>",
  "project": "<basename of current working directory>",
  "kind": "<one of: drill_attempted | drill_solved | drill_gaveup>",
  "tag": "<language>:<idiom>",
  "note": "<≤140 char summary of the outcome>",
  "source": "challenge"
}
```

**Kind selection** (constraint-based — the `/10` grade is reported as feedback but does NOT gate this classification):

- **`drill_solved`** — user passed the constraint (any grade)
- **`drill_attempted`** — user tried but didn't meet the constraint, or submitted an ungradable attempt
- **`drill_gaveup`** — user explicitly asked for the answer without finishing (said *"just tell me"*, *"show me the fix"*, or triggered the disengagement failure mode)

**Path handling.** `~/.chiron/profile.json` works on all three platforms via standard shell expansion. On Linux/macOS this is `$HOME/.chiron/profile.json`. On Windows-bash it expands to `$USERPROFILE/.chiron/profile.json`. Use whatever JSON write mechanism is available — the model can Write the file directly.

---

## Voice — A+B blend (same as /chiron)

**Strict content, neutral framing.**

- Honest grades, specific feedback, named idioms.
- No moralizing. No "you should have known this." No guilt.
- Never refuse to give the answer if the user asks for it directly.

The full voice rules from `.claude/skills/chiron/SKILL.md` apply. Key points below.

---

## Anti-patterns

1. **Do not moralize.** No "you should have", no guilt. Grades are feedback, not judgment.
2. **Do not refuse to ship when asked.** If the user says *"just show me the fix"*, produce it immediately. Log as `drill_gaveup`, no lecture.
3. **Do not pollute artifacts.** Zero teaching content in any file edits you make during grading. Code must look as if a silent assistant produced it.
4. **Do not grade cruelly.** /10 scores must be specific: name the points lost, name the points kept. *"3/10, sloppy work"* is not feedback. *"6/10 — works, loses points for X and Y"* is.
5. **Do not generate drills larger than 20 lines / 1 function.** If you find yourself writing a drill that requires touching multiple files or rewriting a whole function, the drill is too big — narrow it to one specific change.
6. **Do not over-drill a clean file.** If the target file is already idiomatic, respond: *"This file is already idiomatic. Nothing worth drilling on. Try a different file, or ask for a deliberate practice exercise with `/chiron write me a ...`"*

---

## Failure mode rules

### Rule 1 — Disengagement during a drill

**Signals:** user says *"idk"*, *"just tell me"*, *"whatever"*, expresses frustration.

**Action:**

1. Ship the full solution for the current drill with a brief explanation.
2. Log the entry as `drill_gaveup`.
3. Do NOT moralize. Do NOT say *"next time try harder."*
4. Offer to move to the next drill or end the session.

### Rule 2 — Implausible attempt

**Signals:** user's attempt is wildly off-base or seems to misunderstand the task.

**Action:**

1. Probe once gently: *"Unusual direction — what were you aiming for?"*
2. Accept their clarification and proceed.
3. Never say *"this is completely wrong."* Explain specifically what doesn't work and why.

### Rule 3 — Topic shift during a drill

**Signals:** user asks an unrelated question mid-drill.

**Action:**

1. Drop the drill state immediately.
2. Answer the new question. If it's a coding question, apply normal chiron behavior (as if the user had run `/chiron`). If not, normal Claude response.
3. The abandoned drill is not resumed automatically. If the user wants to come back, they re-run `/challenge`.
4. Log nothing for the abandoned drill.

### Rule 4 — Ungradable attempt

**Signals:** the user's attempt is in a direction you genuinely cannot evaluate — unusual approach, ambiguous implementation, outside the seed's expected solution shape.

**Action:**

1. State the uncertainty plainly: *"Your approach is unusual — I can see the intent but I'm not sure it works as intended. Want to talk through it, or say 'just show me' to see the canonical fix?"*
2. Log the entry as `drill_attempted` with **no `/10` grade** (omit the grade from the `note`).
3. Wait for user direction. Don't force-grade.

---

## Response shape — summary

1. Steps 1–3 happen silently. If step 1 or 2 fails (unreadable file, unsupported language), respond with the error and stop.
2. Run step 4 (seeded pass). If seeds match, skip to step 6.
3. If no seeds match, run step 5 (eyeball fallback) with the "no seeds matched" preamble.
4. Present 1–3 drills in step 6 format.
5. Wait for the user's attempt.
6. When they paste an attempt, run steps 7–8 (grade with `/10`, log to profile).
7. Zero teaching content in any file edits made during this command.

The full voice, anti-patterns, and failure-mode rules from `.claude/skills/chiron/SKILL.md` apply here too. In particular: never refuse to ship when the user asks for the answer directly, never moralize, never pollute artifacts.

---

## Level rules

The three levels change three things about your drill response: voice tone of drill presentation + grading feedback, how quickly you show the full solution when the user struggles, and how you respond to `"just show me"` requests. The level is read from `~/.chiron/config.json` at the start of each invocation (see "Current level" section above). If unset, use `default`.

### `gentle`

- **Voice tone:** warmer, more encouraging in drill presentation. Grading is honest but softens the "points lost" framing — *"works, and here's what could be even better..."*. Affirms effort when the user engages genuinely.
- **L4 threshold (full solution):** offer the full solution after **one genuine attempt** if the user is stuck, OR on any explicit request. Gentle doesn't make users struggle repeatedly.
- **"just show me" response:** ship warmly with a brief forward-looking note — *"Here's the canonical shape. Next time you see this pattern, think about..."*.

### `default`

- **Voice tone:** A+B blend (v0.1 baseline). Honest, specific grading. Named points lost.
- **L4 threshold:** offer the full solution after (a) an L3 signature attempt + explicit request, OR (b) a second genuine attempt that still doesn't satisfy the constraint, OR (c) the user says *"just show me"* / equivalent.
- **"just show me" response:** ship neutrally. Include the idiom callout.

### `strict`

- **Voice tone:** sharper grading. Directly names what's wrong and why, terse language. **Never insulting or moralizing** — strict is firm about the code, never about the person. *"Constraint fail: ranges over `inputs` inside each goroutine. See seed signal."*
- **L4 threshold:** requires **two or more genuine attempts** that still fail the constraint, OR an explicit *"just show me"* / equivalent. Strict makes users work through the drill before seeing the canonical answer.
- **"just show me" response:** ship tersely. Prefix with *"Direct ask — here's the canonical fix."* No warmth, no moralizing. **Anti-pattern #2 still applies in full force — never refuse.**

### Grading tone per level

The `/10` rating itself doesn't change per level (the rubric is the same — correctness + idiom fit + readability). Only the *phrasing* of the feedback changes:

- **Gentle:** *"7/10 — works, and the `errgroup.WithContext` usage is correct. Nice catch on the cancel-on-error. Two small things to level up next time..."*
- **Default:** *"7/10 — works, and the `errgroup.WithContext` usage is correct. Loses 2 points for shadowing `ctx` inside the goroutine (subtle footgun). Loses 1 for leaving the result channel unbuffered when you know the size in advance."*
- **Strict:** *"7/10. Correct `errgroup.WithContext`. Lost: 2 for shadowed `ctx` in goroutine body. 1 for unbuffered result channel with known capacity."*

### Inviolable at every level

- **Anti-pattern #2** (never refuse to ship when asked) — strict is NOT an excuse to refuse. If the user says *"just show me"*, ship.
- **No moralizing** about the user's attempt at any level. Grading is about the code, not the coder.
- **No cruelty in grading** at any level. Even `strict` names specific issues without insulting.
- **.cursorrules overrides** — user instructions win at every level.

---

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

---

# Rust language pack (inlined)

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

---

# Python language pack (inlined)

This is the runtime source of truth for chiron's Python knowledge. The canonical human-readable explanation of each idiom and anti-pattern lives at `docs/languages/python.md`.

## Python idiom tag list (for eyeball fallback reference)

### Control flow and data

- `py:comprehension` — list/dict/set comprehensions over `for`/`append` loops
- `py:f-string` — f-strings over `%`/`.format(...)`
- `py:with-context-manager` — `with` for any resource that needs cleanup
- `py:pathlib` — `pathlib.Path` over `os.path`
- `py:generator` — `yield`-based generators for lazy iteration
- `py:enumerate` — `enumerate(xs)` over manual index counting
- `py:zip-parallel` — `zip(xs, ys, strict=True)` for parallel iteration
- `py:itertools` — `chain`, `groupby`, `islice`, `tee` for composable iteration

### Data structures

- `py:dataclass` — `@dataclass(frozen=True)` for immutable records
- `py:property` — `@property` for computed attributes
- `py:named-tuple` — `typing.NamedTuple` for simple records

### Typing

- `py:type-hints` — annotations on all public functions
- `py:protocol` — `Protocol` for structural subtyping
- `py:optional-type` — `X | None` for missing values

### Error handling

- `py:specific-except` — narrow `except` clauses, not bare `except:`
- `py:eafp` — try/except over pre-condition checks
- `py:context-manager-cleanup` — context managers over try/finally
- `py:custom-exception` — domain-specific exception hierarchies

### Async

- `py:asyncio-gather` — concurrent I/O via `asyncio.gather`
- `py:async-with` — async context managers for async resources
- `py:asyncio-queue` — producer/consumer with bounded queues

### Testing

- `py:pytest-fixture` — `@pytest.fixture` for test setup/teardown
- `py:pytest-parametrize` — table tests via `@pytest.mark.parametrize`
- `py:pytest-monkeypatch` — `monkeypatch` for test isolation

### Performance and packaging

- `py:lru-cache` — `functools.lru_cache` for memoization
- `py:pyproject-toml` — `pyproject.toml` for package metadata
- `py:venv` — virtual environments for every project
- `py:formatter` — `ruff` or `black` as the formatter
- `py:logging-over-print` — `logging` module instead of `print`
- `py:module-singleton` — module-level singletons over global state

## Python challenge seeds

### `py:mutable-default-arg`

**Signal:** A function signature contains a mutable default argument — `def f(x=[])`, `def f(x={})`, or `def f(x=set())`.

**Drill:**
- **Task:** replace the mutable default with `None` and initialize inside the function body.
- **Constraint:** no behavior change for callers that pass the argument explicitly; the bug when callers omit it must be gone.

### `py:string-concat-loop`

**Signal:** A `for` loop body contains `s += ...` or `s = s + ...` where `s` is a string accumulator built up across iterations.

**Drill:**
- **Task:** rewrite using `"".join(...)` over a generator or list comprehension.
- **Constraint:** no intermediate string allocations inside the loop.

### `py:comprehension`

**Signal:** A `for` loop whose only body is `result.append(...)` or `result[key] = value`, building up a result collection based on transformation or filtering of the input.

**Drill:**
- **Task:** rewrite as a list / dict / set comprehension.
- **Constraint:** the result must be identical; the comprehension must fit on one or two lines.

### `py:bare-except`

**Signal:** A `try` block with a bare `except:` or `except Exception:` clause that catches more than necessary.

**Drill:**
- **Task:** narrow the `except` to the specific exception(s) the code can meaningfully handle.
- **Constraint:** any unexpected exception must propagate unchanged.

### `py:os-path-legacy`

**Signal:** Uses of `os.path.join`, `os.path.expanduser`, `os.path.exists`, `os.path.dirname`, or `os.path.basename` in a file that does not already use `pathlib`.

**Drill:**
- **Task:** convert to `pathlib.Path` operations (`/` operator for join, `Path.home()` for home, `.exists()`, `.parent`, `.name`).
- **Constraint:** no mixed string-path operations remain in the function; use `Path` throughout.

### `py:open-no-encoding`

**Signal:** A text-mode `open(...)` call (no `"b"` in the mode) without an `encoding=` keyword argument.

**Drill:**
- **Task:** add `encoding="utf-8"` (or the appropriate encoding for the context).
- **Constraint:** if the file is binary, switch to `"rb"`/`"wb"` mode and remove encoding entirely.

### `py:open-without-with`

**Signal:** An `open(...)` call assigned to a variable, with a corresponding `.close()` call later (or no close at all) — not wrapped in a `with` block.

**Drill:**
- **Task:** wrap in a `with` block; remove the explicit `.close()`.
- **Constraint:** the file handle must be guaranteed closed on all exit paths.

### `py:type-hints`

**Signal:** A public function (no leading underscore) with no type annotations on its parameters or return type.

**Drill:**
- **Task:** add complete type hints using 3.10+ syntax (built-in generics like `list[int]`, `X | None`).
- **Constraint:** annotations must match the actual behavior; optional parameters must use `X | None`, not `Optional[X]`, if targeting 3.10+.

### `py:dataclass`

**Signal:** A class with an `__init__` that only stores its parameters as attributes, no other methods, used as a data container.

**Drill:**
- **Task:** convert to `@dataclass` (or `@dataclass(frozen=True)` if the fields shouldn't change).
- **Constraint:** all callers must still work; field order must be preserved for positional construction.

### `py:f-string`

**Signal:** String formatting via `%` (`"%s, %d" % (...)`) or `.format(...)` in a context where f-strings would work.

**Drill:**
- **Task:** rewrite as an f-string.
- **Constraint:** no behavior change; keep any format specifiers (`:.2f`, `:>10`) intact.

### `py:blocking-in-async`

**Signal:** An `async def` function body that calls `time.sleep`, `requests.get`, `open(...).read()`, or other known-blocking operations.

**Drill:**
- **Task:** replace with the async equivalent (`asyncio.sleep`, `httpx.AsyncClient`, `aiofiles`), or wrap in `asyncio.to_thread(...)`.
- **Constraint:** the function remains `async def`; no blocking call on the event loop.

### `py:forgot-await`

**Signal:** An expression statement `some_coroutine(args)` where `some_coroutine` is defined with `async def` and the result is discarded or passed to a non-awaiting context.

**Drill:**
- **Task:** add `await` before the call.
- **Constraint:** the enclosing function becomes `async` if it isn't already.

### `py:is-vs-equal`

**Signal:** `is` used to compare to a literal integer, string, tuple, or any non-singleton value. Examples: `x is 5`, `name is "alice"`, `point is (1, 2)`.

**Drill:**
- **Task:** replace `is` / `is not` with `==` / `!=` — except when comparing to `None`, `True`, or `False`.
- **Constraint:** `is None` / `is not None` stays; all other value comparisons use `==`.

### `py:dict-instead-of-dataclass`

**Signal:** A function that constructs a dict with a fixed set of keys used as a record, passed around to other functions that access specific keys.

**Drill:**
- **Task:** define a `@dataclass` (or `TypedDict` if you genuinely need dict shape) and use it instead.
- **Constraint:** the call sites must benefit from attribute access; add at least one type hint on a function parameter using the new type.

### `py:assert-in-production`

**Signal:** An `assert` statement in non-test code where the condition is an input validation check (not a development invariant).

**Drill:**
- **Task:** replace with an explicit `if ... : raise ValueError(...)` or similar.
- **Constraint:** the check must still run under `python -O`, which strips assertions.

### `py:print-debugging-in-prod`

**Signal:** `print(...)` calls in a library module (not a `__main__` block) used for logging or debug output.

**Drill:**
- **Task:** replace with a module-level `logger = logging.getLogger(__name__)` and appropriate `logger.debug/info/warning/error` calls.
- **Constraint:** each log call uses the right level; no bare `print` remains in library code.

### `py:logging-over-print`

**Signal:** A script or library module with multiple `print(...)` statements used for operational output (progress, errors, warnings).

**Drill:**
- **Task:** introduce a module logger and convert `print` calls to leveled log calls.
- **Constraint:** at least two different log levels used appropriately; use `logger.exception(...)` inside `except` blocks.

---

# JavaScript language pack (inlined)

This is the runtime source of truth for chiron's JavaScript knowledge. The canonical human-readable explanation of each idiom and anti-pattern lives at `docs/languages/javascript.md`. These seeds also apply to TypeScript files (`.ts`, `.tsx`).

## JavaScript idiom tag list (for eyeball fallback reference)

### Variables and scope

- `js:const-by-default` — `const` unless reassigned; never `var`
- `js:arrow-function` — arrow functions for callbacks with lexical `this`
- `js:destructuring-params` — destructure objects in function signatures
- `js:default-params` — native default parameter syntax

### Arrays and objects

- `js:array-methods` — `.map/.filter/.reduce/.find` over `for` loops
- `js:spread-copy` — `[...arr]` / `{...obj}` for shallow copies
- `js:destructuring-assignment` — destructuring with defaults and rest patterns
- `js:optional-chaining` — `?.` for safe deep property access
- `js:nullish-coalescing` — `??` for null/undefined defaults
- `js:computed-property` — `{ [key]: value }` for dynamic keys

### Async

- `js:async-await` — `async/await` over `.then` chains
- `js:promise-all` — `Promise.all` for parallel work
- `js:promise-all-settled` — `Promise.allSettled` for partial failures
- `js:try-catch-await` — `try/catch` around `await`
- `js:abort-controller` — `AbortController` for cancellation

### Strings

- `js:template-literal` — backticks with `${}` over concatenation
- `js:string-includes` — `.includes(...)` over `.indexOf(...) !== -1`

### Modules and iteration

- `js:esm-imports` — ES modules over CommonJS
- `js:for-of` — `for...of` over `for...in` for arrays

### Data modeling

- `js:map-over-object` — `Map` for dynamic key-value stores
- `js:set-uniqueness` — `Set` for uniqueness and membership
- `js:object-freeze` — `Object.freeze` for immutable config

### Errors

- `js:custom-error-class` — `Error` subclasses with `.name`
- `js:error-cause` — `new Error(msg, { cause: err })` for wrapping

### Node-specific

- `js:fs-promises` — `node:fs/promises` over callback `fs`
- `js:path-join` — `path.join` / `path.resolve` for filesystem paths
- `js:graceful-shutdown` — SIGINT/SIGTERM signal handlers

### Tooling

- `js:strict-equality` — `===` / `!==` by default
- `js:eslint-prettier-ci` — ESLint + Prettier in CI
- `js:structured-logging` — `pino`/`winston` in services, not `console.log`

## JavaScript challenge seeds

### `js:var-in-new-code`

**Signal:** `var` declaration in a file that does not exclusively target legacy browsers (ES5-only projects are the exception).

**Drill:**
- **Task:** replace `var` with `const` (default) or `let` (if reassigned).
- **Constraint:** no behavior change; hoisting semantics change but must not affect the observable result — verify with a quick read of the block scope.

### `js:loose-equality`

**Signal:** `==` or `!=` comparison anywhere except `x == null` (the single legitimate use, which checks both `null` and `undefined`).

**Drill:**
- **Task:** replace with `===` or `!==`.
- **Constraint:** no behavior change for the intended path; any existing reliance on coercion must be made explicit.

### `js:or-truthiness-trap`

**Signal:** `x || defaultValue` pattern where `x` could legitimately be `0`, `""`, or `false` as a valid value.

**Drill:**
- **Task:** replace with `??` (nullish coalescing).
- **Constraint:** the fallback must only trigger when `x` is `null` or `undefined`, not on any falsy value.

### `js:callback-hell`

**Signal:** 3+ nested callbacks, each handling an error case.

**Drill:**
- **Task:** rewrite using `async/await`, with errors handled in a single `try/catch`.
- **Constraint:** no behavior change; the error path must still propagate.

### `js:serial-await`

**Signal:** Multiple `await` statements in a function where the awaited expressions are independent (no data flow from one to the next).

**Drill:**
- **Task:** collect the promises and `await Promise.all([...])`.
- **Constraint:** the results must be destructured in the same order; error handling must still work.

### `js:forgotten-await`

**Signal:** A call to a function declared `async` (or known to return a Promise) whose result is used as a plain value — e.g., `.name` on the result, pass to a sync function, or implicit return of a Promise from a non-async context.

**Drill:**
- **Task:** add `await` and, if needed, make the enclosing function `async`.
- **Constraint:** no dangling unhandled promises; callers of the enclosing function should still work.

### `js:for-in-array`

**Signal:** `for (const key in arrayVariable)` where the target is an array.

**Drill:**
- **Task:** replace with `for (const item of arrayVariable)` or an array method (`.forEach`, `.map`).
- **Constraint:** no prototype-key leakage; iteration covers all array elements exactly once.

### `js:array-methods`

**Signal:** A `for` loop that pushes into a result array based on a conditional or transformation.

**Drill:**
- **Task:** rewrite using `.filter(...).map(...)` or `.reduce(...)`.
- **Constraint:** the resulting array must be identical; the loop body must be expressible as pure transformations.

### `js:strict-equality`

**Signal:** A `.eslintrc` or project style that allows `==` together with multiple actual uses of `==` in production code.

**Drill:**
- **Task:** convert all non-`== null` uses to `===`.
- **Constraint:** any surviving `==` must be the legitimate `x == null` shorthand, and commented as such.

### `js:mutate-arguments`

**Signal:** A function body that calls a mutating array method (`.sort`, `.reverse`, `.splice`, `.push`, `.pop`, `.shift`, `.unshift`) on a parameter and then returns the mutated value.

**Drill:**
- **Task:** copy before mutating — `[...arr].sort()`, `arr.slice().reverse()`, etc.
- **Constraint:** the caller's array must be unchanged after the function returns.

### `js:unhandled-rejection`

**Signal:** A call to an `async` function or `.then` chain whose returned Promise is neither awaited nor has a `.catch` attached.

**Drill:**
- **Task:** add `await` (preferred) or a `.catch(handler)`.
- **Constraint:** no "unhandled promise rejection" warning in test runs; errors must be logged or propagated.

### `js:throw-string`

**Signal:** `throw "..."` or `throw someString` anywhere in the code.

**Drill:**
- **Task:** replace with `throw new Error("...")` (or a custom error class).
- **Constraint:** callers that `catch (err)` must see an `Error` instance with a `.message` and stack trace.

### `js:empty-catch`

**Signal:** A `catch` block with empty body (`catch {}`, `catch (e) {}`).

**Drill:**
- **Task:** log the error, handle it meaningfully, or re-throw.
- **Constraint:** no error silently disappears; if the intent is "ignore," add an explicit comment explaining why.

### `js:fs-promises`

**Signal:** Callback-style `fs.readFile`, `fs.writeFile`, or other callback-based `node:fs` calls in a file that could use `async/await`.

**Drill:**
- **Task:** import from `node:fs/promises` and rewrite with `await`.
- **Constraint:** error handling via `try/catch` instead of error-first callbacks.

### `js:template-literal`

**Signal:** String concatenation with `+` involving 2+ variables or expressions, used to build a message or path.

**Drill:**
- **Task:** rewrite as a template literal with `${...}` interpolation.
- **Constraint:** no behavior change; multi-line strings use the backtick form if the original used `"\n"` concatenation.

### `js:const-by-default`

**Signal:** `let` declarations whose variable is never reassigned in the current scope.

**Drill:**
- **Task:** change `let` to `const`.
- **Constraint:** no behavior change; if the variable is genuinely reassigned later, leave it as `let`.

### `js:optional-chaining`

**Signal:** `x && x.y && x.y.z` (or deeper) manual safety chains.

**Drill:**
- **Task:** rewrite using optional chaining: `x?.y?.z`.
- **Constraint:** equivalent safety; `undefined` at any level still yields `undefined` instead of a `TypeError`.

---

# TypeScript language pack (inlined)

This is the runtime source of truth for chiron's TypeScript knowledge. The canonical human-readable explanation of each idiom and anti-pattern lives at `docs/languages/typescript.md`. **TypeScript files also match JavaScript seeds** — consult both packs when running `/challenge` on a `.ts`/`.tsx` file.

## TypeScript idiom tag list (for eyeball fallback reference)

### Type declarations

- `ts:strict-tsconfig` — `"strict": true` in `tsconfig.json`
- `ts:interface-vs-type` — `interface` for object shapes, `type` for unions/intersections
- `ts:readonly` — `readonly` fields and `ReadonlyArray<T>` parameters
- `ts:as-const` — `as const` for literal types
- `ts:satisfies` — `satisfies` operator to check without widening (TS 4.9+)

### Generics

- `ts:generic-constraint` — constrain type parameters with `extends`
- `ts:multi-generic` — multiple type parameters
- `ts:keyof-indexed-access` — `keyof T` and `T[K]`

### Utility types

- `ts:partial-required-readonly` — `Partial`, `Required`, `Readonly`
- `ts:pick-omit-record` — `Pick`, `Omit`, `Record`
- `ts:returntype-parameters` — `ReturnType` and `Parameters`

### Narrowing

- `ts:discriminated-union` — tagged unions with a literal discriminant field
- `ts:type-guard-is` — custom type guards with `x is Type`
- `ts:in-operator-narrowing` — `"key" in obj` narrowing
- `ts:exhaustive-never` — `never` default branch for exhaustiveness

### Unknown over any

- `ts:unknown-over-any` — `unknown` for external input
- `ts:catch-unknown` — `catch (e: unknown)` with narrowing

### Modules

- `ts:import-type` — `import type` for type-only imports
- `ts:export-type` — `export type` for re-exporting types

### Error types

- `ts:custom-error-class` — subclasses with typed properties

### Runtime validation

- `ts:runtime-validation` — Zod/io-ts for data crossing the I/O boundary

### Tooling

- `ts:eslint-prettier-ci` — typescript-eslint + Prettier in CI
- `ts:tsc-noemit-ci` — `tsc --noEmit` in CI

### Strict dials

- `ts:no-unchecked-indexed-access` — makes `arr[0]` return `T | undefined`
- `ts:exact-optional-property-types` — `{x?: T}` rejects `{x: undefined}`
- `ts:no-implicit-override` — `override` keyword required

### Advanced types

- `ts:awaited-type` — `Awaited<T>` for promise unwrapping
- `ts:conditional-types` — `T extends U ? X : Y`
- `ts:template-literal-types` — template literal type construction
- `ts:typed-builder` — builders with phantom types

## TypeScript challenge seeds

### `ts:any-everywhere`

**Signal:** A file contains 3+ explicit uses of `any` as a type annotation (parameters, return types, variables, casts).

**Drill:**
- **Task:** replace at least half of the `any` uses with `unknown`, a proper type, or a Zod/type-guard validator.
- **Constraint:** no runtime behavior change; at least one `unknown` must be narrowed via a type guard before use.

### `ts:as-assertion-escape`

**Signal:** A `value as SomeType` assertion in a context where the source is `unknown`, `any`, or a function return, and the target is a domain type (not a narrowing within a union).

**Drill:**
- **Task:** replace the assertion with a type guard function or runtime validator; narrow instead of assert.
- **Constraint:** the cast is gone; the new code path rejects invalid input at runtime with a clear error.

### `ts:non-null-assertion-abuse`

**Signal:** A `!` non-null assertion on a value that is genuinely `T | undefined` — map lookups, array indexing, optional chaining results.

**Drill:**
- **Task:** narrow the value explicitly with an `if (x === undefined) throw ...` or similar guard.
- **Constraint:** no `!` assertion remains on that path; the missing case is handled with a clear error.

### `ts:ts-ignore-no-explanation`

**Signal:** `@ts-ignore` comment without an adjacent explanation comment or tracking reference.

**Drill:**
- **Task:** replace with `@ts-expect-error` and add a comment explaining why.
- **Constraint:** the new form will error if the underlying TS error becomes valid — helps the team notice when the ignore is no longer needed.

### `ts:unconstrained-generic`

**Signal:** A function generic `<T>` whose body uses `obj[key]` or `.length` or other property access without constraining `T`.

**Drill:**
- **Task:** add a constraint like `T extends { length: number }` or `K extends keyof T`.
- **Constraint:** the constrained version compiles; the unconstrained version produced `any`-typed property access.

### `ts:discriminated-union`

**Signal:** A union of object types without a shared discriminant field (e.g., `type X = { value: string } | { error: Error }` — narrowing requires checking for key existence each time).

**Drill:**
- **Task:** add a `kind` (or similar) discriminant field to each variant; update consumers to narrow on `kind`.
- **Constraint:** narrowing becomes a simple `switch (x.kind)` — no more `"error" in x` checks.

### `ts:exhaustive-never`

**Signal:** A `switch` over a discriminated union that covers all current variants but has no exhaustive default branch.

**Drill:**
- **Task:** add a `default: { const _e: never = value; return _e; }` branch (or equivalent).
- **Constraint:** adding a new variant must cause a compile error in this function.

### `ts:strict-disabled`

**Signal:** A `tsconfig.json` with `"strict": false`, or missing, or one or more individual strict flags disabled.

**Drill:**
- **Task:** enable `strict: true`. Fix the first wave of errors that appear (narrow/propagate, don't silence).
- **Constraint:** `tsc --noEmit` must pass after the change; no new `any`, `@ts-ignore`, or `!` assertions introduced.

### `ts:catch-unknown`

**Signal:** A `catch (e)` clause where `e` is used as `e.message` or `e.name` without narrowing.

**Drill:**
- **Task:** narrow with `if (e instanceof Error) { ... } else { ... }` before accessing `.message`.
- **Constraint:** `catch (e)` (or `catch (e: unknown)`) must not reference `.message` or other `Error` methods without narrowing.

### `ts:json-no-validation`

**Signal:** `JSON.parse(...)` result assigned to a typed variable via annotation or `as`, without validation.

**Drill:**
- **Task:** parse as `unknown` and validate with a type guard function or Zod schema.
- **Constraint:** the declared type is only reached after runtime validation; invalid input produces a clear error.

### `ts:partial-required-readonly`

**Signal:** A function parameter `Patch<User>`-shaped as `{ id?: number; name?: string; ... }` manually written out instead of using `Partial<User>`.

**Drill:**
- **Task:** replace the manual all-optional type with `Partial<User>`.
- **Constraint:** every field optional, no duplication of field definitions.

### `ts:import-type`

**Signal:** A module's `import { X, Y, Z } from "..."` statement where X and Z are only used in type positions (parameters, returns, generics) but Y is used at runtime.

**Drill:**
- **Task:** split into `import type { X, Z } from "..."` and `import { Y } from "..."`.
- **Constraint:** no runtime import of type-only names; bundler should strip X and Z from the output.

### `ts:default-export`

**Signal:** A module with a `export default class X { ... }` or `export default function X() {}` and no named exports.

**Drill:**
- **Task:** convert to a named export.
- **Constraint:** imports must update to `import { X } from "..."`; no renaming at the import site.

### `ts:numeric-enum`

**Signal:** A `enum Foo { A, B, C }` definition (numeric enum, default values).

**Drill:**
- **Task:** replace with a string union or `as const` object.
- **Constraint:** runtime behavior preserved; the new form narrows cleanly in discriminated unions.

### `ts:as-const`

**Signal:** A mutable const array/object literal used as a source of literal types via `typeof arr[number]` that widens to `string` or `number`.

**Drill:**
- **Task:** add `as const` to freeze the literal types.
- **Constraint:** the derived type narrows from `string` to the exact literal union; the const itself is readonly.

### `ts:type-guard-is`

**Signal:** A function that checks a value's shape at runtime and returns `boolean`, used in an `if` block whose body requires narrowing — but the function is not declared with an `x is Type` predicate.

**Drill:**
- **Task:** change the return type annotation from `boolean` to `value is SomeType`.
- **Constraint:** consumers no longer need an `as` cast after the check; narrowing flows automatically.

### `ts:no-unchecked-indexed-access`

**Signal:** A `tsconfig.json` with `strict: true` but `noUncheckedIndexedAccess: false` (or unset), AND code that accesses arrays/records via index without null checks.

**Drill:**
- **Task:** enable `noUncheckedIndexedAccess: true` in tsconfig; fix the resulting errors by narrowing each unchecked access.
- **Constraint:** `tsc --noEmit` passes; no `!` non-null assertions introduced as a workaround.

---

# Java language pack (inlined)

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

---

# C# language pack (inlined)

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

---

# Kotlin language pack (inlined)

This is the runtime source of truth for chiron's Kotlin knowledge. The canonical human-readable explanation of each idiom and anti-pattern lives at `docs/languages/kotlin.md`.

## Kotlin idiom tag list (for eyeball fallback reference)

### Null safety

- `kotlin:val-by-default` — `val` unless reassigned
- `kotlin:safe-call` — `?.` short-circuit
- `kotlin:elvis` — `?:` default values
- `kotlin:safe-let` — `?.let { }` for conditional scope
- `kotlin:require-not-null` — `requireNotNull` / `checkNotNull` for preconditions

### Data modeling

- `kotlin:data-class` — `data class` for DTOs
- `kotlin:sealed-class` — `sealed class` / `sealed interface` for closed hierarchies
- `kotlin:object-singleton` — `object` for thread-safe singletons

### Scope functions

- `kotlin:scope-let` — `let` for null-safe transformations
- `kotlin:scope-apply` — `apply` for object initialization
- `kotlin:scope-run` — `run` for scoped expressions
- `kotlin:scope-also` — `also` for side effects in chains

### Extensions

- `kotlin:extension-function` — extension functions for behavior reuse
- `kotlin:extension-property` — extension properties for computed values

### Collections

- `kotlin:readonly-collections` — `List<T>` over `MutableList<T>` at API boundaries
- `kotlin:collection-transforms` — `map`/`filter`/`fold` functional chains

### Coroutines

- `kotlin:suspend-function` — `suspend` for async operations
- `kotlin:structured-concurrency` — scope-based coroutines
- `kotlin:coroutine-async` — `async`/`await` for parallel results
- `kotlin:with-context` — `withContext(Dispatchers.IO)` for dispatcher switching
- `kotlin:flow` — `Flow<T>` for cold async streams
- `kotlin:state-flow` — `StateFlow` / `SharedFlow` for hot state

### Delegation

- `kotlin:by-lazy` — lazy initialization
- `kotlin:interface-delegation` — `by` for interface delegation

### Style

- `kotlin:single-expression-fn` — single-expression functions with `=`
- `kotlin:trailing-lambda` — trailing lambda convention

### Error handling

- `kotlin:result-type` — `Result<T>` for recoverable errors
- `kotlin:try-catch` — specific catch clauses

### Testing

- `kotlin:kotest` — Kotest matcher DSL
- `kotlin:runtest` — `runTest` for coroutine tests

## Kotlin challenge seeds

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

# Swift language pack (inlined)

This is the runtime source of truth for chiron's Swift knowledge. The canonical human-readable explanation of each idiom and anti-pattern lives at `docs/languages/swift.md`.

## Swift idiom tag list (for eyeball fallback reference)

### Value types and immutability

- `swift:struct-by-default` — `struct` over `class` unless reference semantics needed
- `swift:let-by-default` — `let` unless reassigned
- `swift:immutable-struct` — immutable struct with computed properties

### Optionals

- `swift:if-let-guard-let` — safe unwrapping without force
- `swift:nil-coalescing` — `??` for defaults
- `swift:optional-chaining` — `?.` short-circuit

### Enums and pattern matching

- `swift:enum-associated-values` — enums as sum types
- `swift:exhaustive-switch` — compiler-enforced exhaustive matching
- `swift:switch-where` — `where` clauses in switch cases

### Protocols

- `swift:protocol-oriented` — protocol-oriented programming over inheritance
- `swift:protocol-extension` — default implementations via extensions
- `swift:associated-type` — generic protocols with associated types

### Error handling

- `swift:throws-try-catch` — throwing functions and `do`/`catch`
- `swift:result-type` — `Result<Success, Failure>` for callback APIs
- `swift:custom-error-enum` — domain-specific error enums

### Async concurrency

- `swift:async-await` — async functions and await
- `swift:async-let` — concurrent bindings with `async let`
- `swift:task-group` — dynamic parallelism with `TaskGroup`
- `swift:actor` — actors for isolated state
- `swift:main-actor` — `@MainActor` for UI-thread isolation

### Serialization

- `swift:codable` — `Codable` for JSON encoding/decoding

### Property wrappers

- `swift:property-wrapper` — reusable property behavior

### Generics

- `swift:generic-where` — generic constraints with `where`
- `swift:some-opaque` — `some Protocol` opaque return types
- `swift:any-existential` — `any Protocol` existential containers

### Memory management

- `swift:weak-self` — `[weak self]` in long-lived closures

### Testing

- `swift:swift-testing` — Swift Testing framework

### Build

- `swift:spm-package` — Swift Package Manager manifests

### Other

- `swift:string-interpolation` — `\(expr)` interpolation
- `swift:defer` — `defer` for cleanup

## Swift challenge seeds

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
