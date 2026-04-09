---
description: Generate idiom drills grounded in specific lines of a source file. Seeded patterns first, model eyeball fallback on no match. Grades user attempts /10 and writes outcomes to ~/.chiron/profile.json.
argument-hint: path to file, or leave empty for the current file in focus
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

Before anything else, check `CLAUDE.md` and `AGENTS.md`. If user instructions conflict with this command's behavior — e.g., *"just fix my code directly, don't drill me"* — follow the user. Switch to a direct fix-and-explain mode, skip drill generation, and don't write to the profile file.

---

## Step 1 — Target resolution

From `$ARGUMENTS`, determine the target file:

- **Empty arguments** → use the file currently in focus in the conversation. If there's no file in focus, respond: *"No file in focus. Run `/challenge path/to/file.ext` with a file path."* and stop.
- **Arguments look like a path** (contain `/` or `\` or a file extension) → treat as a file path and read it.
- **Arguments look like a function name** (identifier only, no slashes, no extension) → locate the function in the current file and drill on just that function.

If the target file cannot be read, respond with a clear error message (include the path you tried) and stop. Do not generate drills speculatively.

## Step 2 — Language detection

Detect the language from the file extension:

- `.go` → Go (supported in v0.1)
- `.rs`, `.ts`, `.tsx`, `.py`, `.zig`, other → respond:

  > chiron v0.1 only ships with a Go language pack. Community contributions for other languages are welcomed — see `docs/CONTRIBUTING-LANGUAGE-PACKS.md`.

  Then stop.

## Step 3 — Language pack is inlined below

The Go language pack (idiom tag list + challenge seeds) lives in the **"Go language pack (inlined)"** section at the bottom of this file. Use it as the reference for steps 4–5 below. Do NOT try to read `docs/languages/go.md` at runtime — that file is a human-readable mirror for contributors, not a runtime dependency.

Each challenge seed in the inlined section has this shape:

```markdown
### <tag in language:idiom format>
**Signal:** <regex, structural description, or prose pattern to look for>
**Drill:**
- Task: <what the user should change>
- Constraint: <what makes this a drill, not a rewrite>
```

For languages other than Go, the inlined pack is empty — step 2 routes non-Go files to a "community contribution" response and stops before this step is reached.

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

Present each drill in this exact format:

```
## Drill 1/3 — [idiom tag]

**Location:** <file>:<line-range>
**Current shape:** <one-sentence description of what's there now>
**Task:** <what the user should do>
**Constraint:** <what makes this a drill, not a rewrite>
```

**Drill sizing requirements (enforce strictly):**

- **≤20 lines of change** per drill
- **≤1 function touched** per drill
- **5–15 minutes of focused engineering work**
- **Expressible in one sentence** — if the task can't be stated in a single sentence, the drill is too big; narrow it or split it

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

The full voice rules from `commands/chiron.md` apply. Key points below.

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

The full voice, anti-patterns, and failure-mode rules from `commands/chiron.md` apply here too. In particular: never refuse to ship when the user asks for the answer directly, never moralize, never pollute artifacts.

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

**Signal:** A function spawns multiple goroutines for concurrent work and uses `sync.WaitGroup` for coordination, with manual error collection (shared error variable under a mutex, manual error channel, first-error tracking).

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
- **Constraint:** each case must have a distinct, human-readable name; failures must report which case failed.

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
