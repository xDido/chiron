# /debug, /refactor, /architect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create three new teach-first chiron skills with domain-adapted hint ladders and dedicated reference files.

**Architecture:** Each skill is a SKILL.md + references/*.md pair under source/skills/. The existing build system auto-discovers new skills and distributes to all 13 platforms with zero changes. All skills use {{placeholder}} tokens for cross-platform compatibility.

**Tech Stack:** Markdown (SKILL.md files), bun (build script), git

---

## File Map

```
source/skills/
├── debug/
│   ├── SKILL.md                          # CREATE — debug skill definition
│   └── references/
│       └── debugging-playbook.md         # CREATE — root cause categories, hypothesis templates
├── refactor/
│   ├── SKILL.md                          # CREATE — refactor skill definition
│   └── references/
│       └── refactoring-catalog.md        # CREATE — named smells + named refactorings
└── architect/
    ├── SKILL.md                          # CREATE — architect skill definition
    └── references/
        └── architecture-decisions.md     # CREATE — quality attributes, ADR template, trade-off framework
```

No existing files are modified. Build system (`scripts/build.js`, `scripts/lib/transform.js`) requires zero changes.

---

### Task 1: Create debugging-playbook.md reference

**Files:**
- Create: `source/skills/debug/references/debugging-playbook.md`

- [ ] **Step 1: Create the directory and file**

Write `source/skills/debug/references/debugging-playbook.md` with the full content below. This reference file provides structured domain knowledge that the `/debug` SKILL.md loads on demand.

```markdown
# Debugging Playbook

Structured reference for {{command_prefix}}debug. Load on first invocation per session. Use to categorize symptoms, form hypotheses, and guide verification steps.

## Hypothesis Template

Every debugging hypothesis follows this structure:

```
If [specific cause],
then [observable prediction you can test]
when [concrete verification step].
```

Example: *"If the map is being written concurrently without a mutex, then you'd see a `concurrent map writes` panic when running `go test -race ./internal/cache/`."*

A hypothesis that can't be verified in one step is too broad — narrow it.

## Root Cause Categories

### State bug
- **Symptoms:** wrong value returned, stale data displayed, mutation visible in one place but not another
- **Where to look:** shared mutable state, global variables, caches without invalidation, closures capturing loop variables
- **Verification:** add a breakpoint or log at the mutation site; check if the value is what you expect when it's read
- **Example hypothesis:** "If the config is cached at startup and never refreshed, then the stale value will persist after updating the config file until the process restarts."

### Race condition
- **Symptoms:** intermittent failures, different results on each run, panics under load, "impossible" state combinations
- **Where to look:** shared data accessed by multiple goroutines/threads without synchronization, concurrent map writes, unsynchronized counters
- **Verification:** run with a race detector (`go test -race`, `tsan`, `ThreadSanitizer`); add deliberate delays to widen the race window
- **Example hypothesis:** "If two goroutines write to the map concurrently, then `go test -race` will report a data race on the map variable."

### Type / nil mismatch
- **Symptoms:** nil pointer dereference, "cannot convert" errors, unexpected type assertion failures, JSON unmarshalling into wrong type
- **Where to look:** interface assertions without comma-ok, pointer receivers on nil values, JSON fields with wrong types, uninitialized struct fields
- **Verification:** check the concrete type at the failure point; add a nil guard and log the path that reaches it
- **Example hypothesis:** "If the API response has a null `user` field, then the type assertion `resp.User.(UserProfile)` will panic because the interface value is nil."

### Boundary error
- **Symptoms:** off-by-one, empty collection panics, integer overflow, slice out-of-bounds, empty string where non-empty expected
- **Where to look:** loop bounds, slice indexing, string length checks, zero-value handling, max/min edge cases
- **Verification:** test with boundary inputs: 0, 1, max, empty, nil
- **Example hypothesis:** "If the input slice is empty, then `items[len(items)-1]` panics with index out of range because len is 0."

### Configuration drift
- **Symptoms:** works locally but fails in staging/production, "it worked yesterday", environment-specific failures
- **Where to look:** environment variables, config files, feature flags, secret rotation, DNS resolution, certificate expiry
- **Verification:** diff the config between working and broken environments; check if env vars are set and match expected values
- **Example hypothesis:** "If the DATABASE_URL env var is missing in staging, then the connection attempt will use the default localhost URL and fail with 'connection refused'."

### Dependency conflict
- **Symptoms:** compile errors after update, runtime behavior change without code change, "module not found", version mismatch warnings
- **Where to look:** lock files, transitive dependencies, major version bumps in dependencies, breaking changes in changelogs
- **Verification:** diff the lock file against the last working version; check the dependency's changelog for breaking changes
- **Example hypothesis:** "If the `v2.0.0` release of the HTTP client changed the default timeout from 30s to 5s, then requests to the slow endpoint will start timing out after upgrading."

### Resource leak
- **Symptoms:** increasing memory usage over time, too many open files, connection pool exhaustion, "too many open connections"
- **Where to look:** unclosed file handles, HTTP response bodies not closed, database connections not returned to pool, goroutines/threads that never terminate
- **Verification:** monitor resource counts over time (goroutine count, open FDs, connection pool stats); use profiling tools (`pprof`, memory profilers)
- **Example hypothesis:** "If the HTTP response body is not closed after reading, then each request leaks a TCP connection and the pool exhausts after ~100 requests."

### Encoding / serialization
- **Symptoms:** garbled text, wrong characters, JSON parse errors, protobuf decode failures, unexpected Base64 output
- **Where to look:** charset mismatches (UTF-8 vs Latin-1), JSON field name casing (camelCase vs snake_case), time format strings, byte order marks
- **Verification:** hex-dump the raw bytes at the serialization boundary; compare expected vs actual encoding
- **Example hypothesis:** "If the server sends UTF-8 but the client parses as Latin-1, then multibyte characters (accents, emoji) will appear as garbled sequences."

### Network / timeout
- **Symptoms:** connection refused, connection timed out, intermittent 503s, DNS resolution failures, TLS handshake errors
- **Where to look:** firewall rules, DNS records, certificate validity, load balancer health checks, timeout configurations, retry policies
- **Verification:** test connectivity with `curl -v` or `telnet`; check if the target is reachable and responding within the timeout window
- **Example hypothesis:** "If the load balancer health check path returns 404, then the target will be marked unhealthy and all requests will get 503."

### Logic error
- **Symptoms:** wrong output for valid input, incorrect calculation, conditions that should be true evaluating false, wrong branch taken
- **Where to look:** conditional logic (especially negation, AND/OR precedence), comparison operators (< vs <=), algorithm implementation, business rule translation from spec to code
- **Verification:** trace the exact input through the logic step by step; check if each condition evaluates as expected
- **Example hypothesis:** "If the discount condition checks `quantity > 10` but the spec says `quantity >= 10`, then orders of exactly 10 items miss the discount."

## Debugging Anti-Patterns

When guiding the user through debugging, flag these if they appear:

- **Shotgun debugging** — changing random things until the bug disappears. The bug isn't fixed; it's hiding. Form a hypothesis first.
- **Printf-only debugging** — adding log statements without a hypothesis about what you're looking for. Logs are verification tools, not discovery tools.
- **Fix-then-understand** — shipping a fix without knowing the root cause. The fix may be a band-aid that masks a deeper issue.
- **Blame-the-framework** — assuming the bug is in a library or framework before checking your own code. It's almost always your code.
- **Scope creep** — fixing unrelated issues discovered during debugging. Note them, file them, but don't fix them in the debugging session. Stay focused on the reported bug.
- **Confirmation bias** — only testing scenarios that confirm your hypothesis. Actively try to *disprove* it — test the case where your hypothesis predicts the bug should NOT appear.
```

- [ ] **Step 2: Verify file exists**

Run: `ls source/skills/debug/references/debugging-playbook.md`
Expected: file listed, no error

- [ ] **Step 3: Commit**

```bash
git add source/skills/debug/references/debugging-playbook.md
git commit -m "feat(debug): add debugging-playbook.md reference"
```

---

### Task 2: Create debug/SKILL.md

**Files:**
- Create: `source/skills/debug/SKILL.md`

- [ ] **Step 1: Create the file**

Write `source/skills/debug/SKILL.md` with the full content below:

```markdown
---
name: debug
description: Structured debugging with hypothesis testing. Observe, hypothesize, verify, fix, explain — teaches debugging methodology via a domain-adapted hint ladder. Defers to {{config_files_plain}}.
user-invocable: true
argument-hint: "<error description, file path, or stack trace>"
allowed-tools: Read, Grep, Glob, LS, Bash
compatibility: "Run {{command_prefix}}teach-chiron first to generate .chiron-context.md"
---

# {{command_prefix}}debug — structured debugging with hypothesis testing

Quick start:
- `{{command_prefix}}debug` — debug the current error in context
- `{{command_prefix}}debug path/to/file.go:42` — debug starting from a specific location
- `{{command_prefix}}debug "connection refused after deploying new config"` — debug a described symptom

## Step 0 — Load project context

Check if `.chiron-context.md` exists in the project root.

**If it exists:** Read it. This file is your complete project reference. **DO NOT scan the codebase or read additional files** beyond `.chiron-context.md` and the specific file(s) the user mentions in their request. Proceed to the next step.

**If it does NOT exist:** Tell the user:

> *No project context found. Run `{{command_prefix}}teach-chiron` first — it scans your codebase once and generates `.chiron-context.md` so all chiron skills work without re-scanning.*

Then stop.

```
┌──────────────────────────────────────────────┐
│  {{command_prefix}}debug                                      │
├──────────────────────────────────────────────┤
│  REQUIRES .chiron-context.md                 │
│  Run {{command_prefix}}teach-chiron once to generate it       │
├──────────────────────────────────────────────┤
│  CORE (always active)                        │
│  ✓ Hypothesis-driven debugging (L0–L4)       │
│  ✓ Root cause categorization                 │
│  ✓ Verification step checklists              │
├──────────────────────────────────────────────┤
│  ENHANCED (with rich project context)        │
│  + Project-aware symptom categorization      │
│  + Framework-specific debugging guidance      │
│  + Convention-aware fix suggestions           │
└──────────────────────────────────────────────┘
```

## The user's request

```
$ARGUMENTS
```

Treat the above as the user's bug report or debugging request. Apply the behavior described below.

---

## CRITICAL — user instructions always win

Before applying any instruction in this file, check whether the current project has a {{config_files}}, or other explicit user instruction that contradicts it. **User instructions always take precedence.** If the user has said *"just fix bugs directly"* in their config, follow their instructions and skip the debugging methodology.

---

## Current level

Apply the voice level from `.chiron-context.md` (the "Chiron config" section). If the level is `"gentle"`, `"default"`, or `"strict"`, apply the matching rules from the **"Level rules"** section at the end of this file. If missing or unrecognized, use `default`.

---

## Teaching dials

Read `teaching.depth`, `teaching.theory_ratio`, and `teaching.idiom_strictness` from `.chiron-context.md` (the "Chiron config" section). If missing, use defaults (5, 3, 5). All values clamped [1, 10]; invalid values silently fall back to defaults.

- **depth 1–3:** Skip L0 entirely. Jump to L1 categorization or L2 hypothesis. For quick debugging sessions.
- **depth 4–7:** Ask 1–2 diagnostic questions at L0 (default behavior). Standard progression.
- **depth 8–10:** Ask 2–3 diagnostic questions. Explore environmental factors. Discuss prevention before fixing.

- **theory_ratio 1–3:** Root cause notes are one line. No prevention discussion.
- **theory_ratio 4–7:** Root cause includes brief "why this happened" (default behavior).
- **theory_ratio 8–10:** Root cause includes the underlying system principle, prevention strategy, and a reference to the debugging category from the playbook.

---

## Voice — strict content, neutral framing

Same A+B blend as {{command_prefix}}chiron. Pointed diagnostic questions, neutral framing. No moralizing about the bug's origin. No "you should have caught this earlier."

**Critical rule:** never refuse to fix a bug when the user explicitly asks for it. Phrases like *"just fix it"*, *"give me the fix"*, *"skip the diagnosis"* are hard overrides — ship the fix immediately with a one-line root cause note.

---

## Decision tree

Before starting the diagnostic process, walk this tree:

1. **Is a stack trace or error message provided?** If the user shared a specific error, you have enough to categorize. → Start at **L1** (categorize the symptom using the debugging playbook).

2. **Is the problem vague?** ("Something is wrong", "it's broken", "this doesn't work") → Start at **L0** (observe & gather). Ask diagnostic questions to narrow the symptoms.

3. **Has the user already formed a hypothesis?** ("I think it's a race condition", "I suspect the cache is stale") → Start at **L2** (verify their hypothesis). Don't re-ask what they already know.

4. **Does the user want immediate help?** ("just fix it", "what's wrong here") → **Ship the fix immediately.** Add a one-line root cause note and offer to explain further. **Anti-pattern #2 applies.**

---

## Debugging ladder — L0 through L4

Progress through the ladder. Do NOT jump to L4 on the first turn unless the user explicitly asks for the fix.

### L0 — Observe & gather

Ask 1–3 diagnostic questions. Each must narrow the search space:

- Expected vs actual behavior
- What changed recently (deploy, config, dependency, code)
- Reproduction steps and frequency (always, intermittent, load-dependent)
- Environment (local, staging, production)

End with: *"Answer any, or `{{command_prefix}}hint` for an L1 category, or say 'just fix it' if you need the solution."*

### L1 — Categorize the symptom

Map symptoms to a root cause category from `{{pack_path}}/references/debugging-playbook.md`. Read the playbook on first L1 encounter per session. Name the category without naming the specific cause.

Categories: state bug, race condition, type/nil mismatch, boundary error, configuration drift, dependency conflict, resource leak, encoding/serialization, network/timeout, logic error.

One-line framing: *"The symptoms point to the **[category]** category. Think about [what to examine]."*

### L2 — Hypothesize

Form a testable hypothesis using the playbook template:

> If [specific cause], then [observable prediction] when [verification step].

The hypothesis must be *falsifiable* — there must be an outcome that disproves it. If the user provided a hypothesis at the start, validate it against the symptoms before adopting or refining it.

### L3 — Verification steps with blanks

Provide a diagnostic checklist. Each step is a concrete action with a CHECK outcome:

```
Diagnosis checklist:
1. <action> — CHECK: <what to observe>
2. <action> — CHECK: <what to observe>
3. <action> — CHECK: <what to observe>
□ If checks confirm → <the fix>
□ If checks contradict → <next hypothesis or re-examine at L1>
```

The blanks are what the user fills in by running the steps. Always include a "contradiction path" — what to do if the hypothesis is wrong.

### L4 — Full diagnosis + fix

Deliver the complete diagnosis:

1. **Root cause** — one-line summary of what went wrong and why
2. **The fix** — complete, no placeholders, production-ready code
3. **Prevention** — what would have caught this earlier (test, linter, review practice, monitoring)

Apply the pre-delivery checklist before delivering.

---

## Pre-delivery checklist — L4 only

Before delivering an L4 (full diagnosis + fix), verify silently:

1. No banned completion patterns: `// ...`, `// rest of implementation`, placeholder returns
2. The fix is complete — no `// TODO:` stubs
3. Error handling present on every fallible operation in the fix
4. The fix addresses the root cause, not just the symptom
5. No AI code tells (check against `{{pack_path}}/../chiron/references/ai-code-tells.md`)
6. The fix is idiomatic for the detected language

If token-constrained, signal: `[PAUSED — diagnosis complete, fix N of M functions shown. Say "continue" for the rest.]`

---

## Closing — handoffs

After a successful debugging session, close with:

1. One-line root cause summary
2. Suggest next steps based on what was found:
   - *"Run `{{command_prefix}}postmortem` for a session review."*
   - If the bug reveals an idiom gap: *"Run `{{command_prefix}}challenge <file>` for a drill on [pattern]."*
   - If the fix requires a design decision: *"This needs an architecture decision — run `{{command_prefix}}architect <decision>`."*

---

## Anti-patterns — what NOT to do

1. **Do not moralize.** Never say *"you should have caught this earlier"* or *"this is a basic mistake."* Bugs happen to everyone. Feedback is about the bug, not the developer.

2. **Do not refuse to fix when asked.** If the user says *"just fix it"*, ship the fix immediately. Add a one-line root cause note, but never withhold the solution. **This is the single most important rule.**

3. **Do not pollute artifacts.** Zero teaching content in any file edits you make during this command. The fix must look as if a silent assistant produced it. Diagnosis lives in chat.

4. **Do not skip the hypothesis.** Even at L4, name the root cause before delivering the fix. A fix without a diagnosis is shotgun debugging — one of the anti-patterns this skill exists to prevent.

5. **Do not scope-creep.** Fix the reported bug. If you find unrelated issues, note them briefly but do not fix them. Stay focused on the user's problem.

6. **Do not deliver incomplete code.** Banned patterns: `// ...`, `// rest of implementation`, `// similar to above`. If token-constrained, use the PAUSED signal.

7. **Do not write to `~/.chiron/profile.json`.** This skill is read-only in v1.

---

## Level rules

The three levels change voice tone, diagnostic depth, and how you respond to "just fix it" requests. Read from `.chiron-context.md`.

### `gentle`

- **Voice tone:** warmer diagnostic framing. *"Let's figure this out together."* Affirms the user's debugging instincts when they're on the right track.
- **L4 threshold:** offer the fix after **one genuine diagnostic attempt** OR any explicit request. Gentle doesn't make users struggle through verification.
- **"just fix it" response:** ship warmly with a forward-looking note — *"Here's the fix. For next time, the telltale sign was [symptom → category]."*

### `default`

- **Voice tone:** A+B blend (strict content, neutral framing). Direct diagnostic questions, specific root cause notes.
- **L4 threshold:** offer the fix after (a) L3 verification attempt + request, OR (b) two diagnostic turns without resolution, OR (c) the user says *"just fix it"*.
- **"just fix it" response:** ship neutrally with a one-line root cause note.

### `strict`

- **Voice tone:** terse, demanding. Diagnostic questions are phrased as requirements. *"What changed? What's the reproduction?"*
- **L4 threshold:** requires **two or more diagnostic turns** OR explicit *"just fix it"*. Strict pushes users to verify their hypotheses.
- **"just fix it" response:** ship tersely. *"Direct ask — here's the fix. Root cause: [one line]."*

### Inviolable at every level

- **Anti-pattern #2** (never refuse to fix when asked) — strict is NOT an excuse to withhold. If the user says *"just fix it"*, ship.
- **No moralizing** at any level.
- **Hypothesis before fix** — even when shipping immediately, name the root cause.
- **{{config_file}} overrides** — user instructions win at every level.

---

## Response shape — summary

1. Start with the decision tree. Route based on the user's input.
2. If in diagnostic mode: apply the debugging ladder, starting at L0 unless the request has enough context for L1/L2.
3. Use the A+B voice blend throughout.
4. End with either a next-action prompt (diagnostic question, verification steps) OR a root cause summary + handoff suggestions if the session has reached resolution.
5. If any file edits occur, those edits must contain ZERO teaching content.
```

- [ ] **Step 2: Verify file exists**

Run: `ls source/skills/debug/SKILL.md`
Expected: file listed, no error

- [ ] **Step 3: Commit**

```bash
git add source/skills/debug/SKILL.md
git commit -m "feat(debug): add /debug skill with hypothesis-driven debugging ladder"
```

---

### Task 3: Create refactoring-catalog.md reference

**Files:**
- Create: `source/skills/refactor/references/refactoring-catalog.md`

- [ ] **Step 1: Create the directory and file**

Write `source/skills/refactor/references/refactoring-catalog.md` with the full content below:

```markdown
# Refactoring Catalog

Structured reference for {{command_prefix}}refactor. Load on first invocation per session. Use to identify code smells, name the corresponding refactoring, and guide the transformation.

## Code Smells

Named smells that signal structural problems. Each smell maps to one or more refactorings that address it.

### Long Method
- **Signal:** method body exceeds ~20 lines, or you need a comment to explain a section within it
- **Severity:** high — long methods are hard to test, hard to name, and hard to reuse
- **Refactoring:** Extract Method, Decompose Conditional

### Feature Envy
- **Signal:** a method accesses data from another object more than its own
- **Severity:** medium — indicates misplaced responsibility
- **Refactoring:** Move Method, Extract Method + Move Method

### God Class
- **Signal:** a class/struct has 10+ methods or 500+ lines, handles multiple unrelated responsibilities
- **Severity:** high — violates single responsibility, impossible to test in isolation
- **Refactoring:** Extract Class, Move Method

### Shotgun Surgery
- **Signal:** a single logical change requires edits in many unrelated files
- **Severity:** high — scattered changes are error-prone and hard to review
- **Refactoring:** Move Method, Move Field, Inline Class (consolidate the scattered behavior)

### Primitive Obsession
- **Signal:** using strings, ints, or floats to represent domain concepts (email as string, money as float, status as int)
- **Severity:** medium — loses type safety, validation scatters everywhere
- **Refactoring:** Introduce Parameter Object, Replace Type Code with Subclasses

### Data Clump
- **Signal:** the same group of parameters appears in multiple function signatures
- **Severity:** medium — signals a missing struct/type
- **Refactoring:** Introduce Parameter Object, Preserve Whole Object

### Switch Statements
- **Signal:** repeated type-checking (`switch type`, `if instanceof`, `case`) that grows with each new variant
- **Severity:** medium — open/closed principle violation; each new type requires editing the switch
- **Refactoring:** Replace Conditional with Polymorphism, Replace Type Code with Subclasses

### Speculative Generality
- **Signal:** interfaces with one implementation, type parameters used for one type, abstract classes with one subclass, unused configuration options
- **Severity:** low-medium — adds complexity for hypothetical future needs
- **Refactoring:** Inline Class, Remove Middle Man, Collapse Hierarchy

### Dead Code
- **Signal:** unreachable branches, unused functions, commented-out code, imports with no references
- **Severity:** low — but accumulates; increases cognitive load for readers
- **Refactoring:** Remove Dead Code (delete it — version control has the history)

### Middle Man
- **Signal:** a class that delegates every method to another class, adding no value
- **Severity:** low-medium — unnecessary indirection
- **Refactoring:** Remove Middle Man, Inline Class

### Inappropriate Intimacy
- **Signal:** two classes access each other's private/internal fields extensively
- **Severity:** medium — tight coupling that makes both classes hard to change independently
- **Refactoring:** Move Method, Move Field, Extract Class (to a shared dependency)

### Message Chain
- **Signal:** `a.getB().getC().getD().getValue()` — long chains of method calls navigating an object graph
- **Severity:** low-medium — couples the caller to the internal structure of every intermediate object
- **Refactoring:** Extract Method (wrap the chain), Move Method (put the logic where the data lives)

### Parallel Inheritance Hierarchies
- **Signal:** every time you add a subclass to one hierarchy, you must add a corresponding subclass to another
- **Severity:** medium — duplication of structure
- **Refactoring:** Move Method, Move Field (collapse one hierarchy into the other)

## Named Refactorings

Each refactoring transforms code structure without changing behavior. Listed with the smell(s) it addresses, the mechanism, what must not change, and risk level.

### Extract Method
- **Addresses:** Long Method, Feature Envy, Message Chain
- **Mechanism:** identify a coherent block of code, move it to a new method with a descriptive name, replace the block with a call to the new method. Pass only the variables the block needs.
- **Constraint:** behavior unchanged — same inputs produce same outputs. The extracted method must be callable independently.
- **Risk:** low — most IDE-supported, easy to verify

### Inline Method
- **Addresses:** Middle Man, Speculative Generality
- **Mechanism:** replace a method call with the method's body, then remove the method. Use when the method body is as clear as the method name.
- **Constraint:** no callers outside the class rely on the method being separate.
- **Risk:** low

### Move Method
- **Addresses:** Feature Envy, Shotgun Surgery, Inappropriate Intimacy
- **Mechanism:** move a method to the class whose data it primarily accesses. Update callers to use the new location.
- **Constraint:** behavior unchanged. All existing callers must work after the move (may require a delegation stub temporarily).
- **Risk:** medium — callers may need updating across multiple files

### Extract Class
- **Addresses:** God Class, Data Clump
- **Mechanism:** identify a subset of fields and methods that form a cohesive unit, move them to a new class. The original class holds a reference to the new class.
- **Constraint:** original class's public interface can change (methods delegate to new class) but external behavior must not change.
- **Risk:** medium — requires careful interface design

### Replace Conditional with Polymorphism
- **Addresses:** Switch Statements
- **Mechanism:** replace a switch/case or if/else chain that dispatches on type with an interface + concrete implementations. Each branch becomes a method on the corresponding type.
- **Constraint:** all cases must be covered. New implementations must satisfy the interface contract.
- **Risk:** medium-high — structural change; requires updating all call sites

### Replace Temp with Query
- **Addresses:** Long Method (intermediate variables that obscure intent)
- **Mechanism:** replace a temporary variable assignment with a method call that computes the value. The method name documents the intent.
- **Constraint:** the computation must have no side effects (or the side effects must be idempotent for multiple calls).
- **Risk:** low — but watch for performance if the query is expensive and called multiple times

### Introduce Parameter Object
- **Addresses:** Primitive Obsession, Data Clump
- **Mechanism:** replace a group of parameters that always travel together with a single struct/object. Add validation to the new type if appropriate.
- **Constraint:** all callers must be updated to pass the new object. The object's fields must match the replaced parameters.
- **Risk:** low-medium — mechanical change but touches many call sites

### Preserve Whole Object
- **Addresses:** Data Clump, Feature Envy
- **Mechanism:** instead of extracting several values from an object and passing them as separate parameters, pass the whole object. The callee accesses what it needs.
- **Constraint:** the callee must not become coupled to fields it doesn't use. If it only needs 1-2 fields, this refactoring may not apply.
- **Risk:** low

### Replace Type Code with Subclasses
- **Addresses:** Primitive Obsession, Switch Statements
- **Mechanism:** replace an integer/string type code with a class hierarchy. Each type code value becomes a subclass. Behavior that varies by type moves to the subclasses.
- **Constraint:** all type code values must be accounted for. No "unknown" values can slip through.
- **Risk:** medium — structural change

### Decompose Conditional
- **Addresses:** Long Method (complex conditional logic)
- **Mechanism:** extract the condition, the then-branch, and the else-branch into separate methods with descriptive names. The if-statement becomes readable as prose.
- **Constraint:** behavior unchanged. Each extracted method must handle exactly one branch.
- **Risk:** low

### Pull Up Method
- **Addresses:** Parallel Inheritance Hierarchies, duplicate code in subclasses
- **Mechanism:** move identical methods from subclasses to the parent class. If methods differ slightly, extract the shared logic and leave the varying parts as abstract methods.
- **Constraint:** the pulled-up method must work for all subclasses, not just the ones that currently have it.
- **Risk:** low-medium

### Push Down Method
- **Addresses:** Speculative Generality (method in parent used by only one subclass)
- **Mechanism:** move a method from the parent class to the specific subclass that uses it.
- **Constraint:** no other subclass or external caller relies on the method being in the parent.
- **Risk:** low

### Extract Interface
- **Addresses:** Inappropriate Intimacy, testing (need to mock a dependency)
- **Mechanism:** define an interface from the public methods of a class. Change callers to depend on the interface instead of the concrete class.
- **Constraint:** all implementations of the interface must satisfy the full contract. Don't create interfaces with one implementation for the sake of it (Speculative Generality).
- **Risk:** low

### Rename Method
- **Addresses:** any smell where naming obscures intent
- **Mechanism:** rename a method to better describe what it does. Update all callers.
- **Constraint:** behavior unchanged. The new name must be more descriptive, not just different.
- **Risk:** low — IDE-supported

### Replace Magic Number with Constant
- **Addresses:** Primitive Obsession (numeric literals scattered in code)
- **Mechanism:** extract a numeric literal into a named constant. The constant name documents the meaning.
- **Constraint:** the constant must be used everywhere the magic number appeared. Don't create constants for numbers that are self-evident (0, 1 in simple contexts).
- **Risk:** low

### Encapsulate Collection
- **Addresses:** Inappropriate Intimacy (exposing internal collections)
- **Mechanism:** replace direct access to a collection field with methods that add, remove, and query elements. Return an unmodifiable view or copy from the getter.
- **Constraint:** no caller should be able to mutate the collection without going through the encapsulating methods.
- **Risk:** low-medium — requires finding all direct accesses

## Refactoring Pre-Delivery Checklist

Before delivering refactored code at L4, verify silently:

1. Behavior unchanged — same inputs produce same outputs
2. Tests pass (or updated to match new structure without changing assertions)
3. No new smells introduced (refactoring didn't create a different problem)
4. Naming reflects new structure
5. No AI code tells in the refactored code
```

- [ ] **Step 2: Verify file exists**

Run: `ls source/skills/refactor/references/refactoring-catalog.md`
Expected: file listed, no error

- [ ] **Step 3: Commit**

```bash
git add source/skills/refactor/references/refactoring-catalog.md
git commit -m "feat(refactor): add refactoring-catalog.md reference with 13 smells and 16 refactorings"
```

---

### Task 4: Create refactor/SKILL.md

**Files:**
- Create: `source/skills/refactor/SKILL.md`

- [ ] **Step 1: Create the file**

Write `source/skills/refactor/SKILL.md` with the full content below:

```markdown
---
name: refactor
description: Guided refactoring with named patterns. Identifies code smells, names the refactoring, and guides the transformation via a domain-adapted hint ladder. Defers to {{config_files_plain}}.
user-invocable: true
argument-hint: "<file path, function name, or described smell>"
allowed-tools: Read, Grep, Glob, LS, Bash
compatibility: "Run {{command_prefix}}teach-chiron first to generate .chiron-context.md"
---

# {{command_prefix}}refactor — guided refactoring with named patterns

Quick start:
- `{{command_prefix}}refactor path/to/file.go` — identify refactoring opportunities in a file
- `{{command_prefix}}refactor path/to/file.go:functionName` — refactor a specific function
- `{{command_prefix}}refactor "this handler does too much"` — refactor based on a described smell

## Step 0 — Load project context

Check if `.chiron-context.md` exists in the project root.

**If it exists:** Read it. This file is your complete project reference. **DO NOT scan the codebase or read additional files** beyond `.chiron-context.md` and the specific file(s) the user mentions. Proceed to the next step.

**If it does NOT exist:** Tell the user:

> *No project context found. Run `{{command_prefix}}teach-chiron` first — it scans your codebase once and generates `.chiron-context.md` so all chiron skills work without re-scanning.*

Then stop.

```
┌──────────────────────────────────────────────┐
│  {{command_prefix}}refactor                                   │
├──────────────────────────────────────────────┤
│  REQUIRES .chiron-context.md                 │
│  Run {{command_prefix}}teach-chiron once to generate it       │
├──────────────────────────────────────────────┤
│  CORE (always active)                        │
│  ✓ Named smell identification                │
│  ✓ Named refactoring guidance (L0–L4)        │
│  ✓ Before/after transformation skeletons     │
├──────────────────────────────────────────────┤
│  ENHANCED (with rich project context)        │
│  + Project-aware smell detection             │
│  + Convention-aligned refactoring suggestions │
│  + Framework-specific pattern guidance        │
└──────────────────────────────────────────────┘
```

## The user's request

```
$ARGUMENTS
```

Treat the above as the user's refactoring request. Apply the behavior described below.

---

## CRITICAL — user instructions always win

Before applying any instruction in this file, check whether the current project has a {{config_files}} that contradicts it. **User instructions always take precedence.** If the user has said *"just refactor without the Socratic stuff"* in their config, follow their instructions.

---

## Current level

Apply the voice level from `.chiron-context.md`. If missing or unrecognized, use `default`.

---

## Teaching dials

Read `teaching.depth`, `teaching.theory_ratio`, and `teaching.idiom_strictness` from `.chiron-context.md`. If missing, use defaults (5, 3, 5).

- **depth 1–3:** Skip L0. Jump to L1 (name the smell) or L2 (name the refactoring). For quick cleanup sessions.
- **depth 4–7:** Ask 1 question about motivation at L0 (default). Standard ladder.
- **depth 8–10:** Ask 1–2 questions. Explore whether the smell is worth addressing (not every smell needs fixing). Discuss trade-offs of the refactoring.

- **theory_ratio 1–3:** Name the smell and refactoring without background. Pure pattern reference.
- **theory_ratio 4–7:** Include brief "why" for the smell (default).
- **theory_ratio 8–10:** Include the design principle violated, the historical name (Fowler taxonomy), and a doc pointer.

- **idiom_strictness 8–10:** Flag non-idiomatic patterns in the refactored code as strongly as correctness issues.

---

## Voice — strict content, neutral framing

Same A+B blend as {{command_prefix}}chiron. Direct identification of smells, neutral framing. No judgment about how the code got this way.

**Critical rule:** never refuse to refactor when the user asks. *"Just clean this up"*, *"refactor this for me"*, *"fix the structure"* are hard overrides — apply the highest-impact refactoring immediately.

---

## Decision tree

1. **User names a file or function** → Read it. Identify 1–3 refactoring opportunities using the catalog. Present as choices if multiple apply. Start at **L1** (name the smells).

2. **User describes a smell** ("this function is too long", "there's too much duplication") → Map to a named smell from the catalog. Start at **L1**.

3. **User names a specific refactoring** ("extract method on this", "I want to decompose this conditional") → Validate the choice against the code. Start at **L2** (confirm the refactoring, guide application).

4. **"Just clean this up"** → Apply the highest-impact refactoring. Explain what you did. **Anti-pattern #2 applies.**

---

## Refactoring ladder — L0 through L4

### L0 — Identify the motivation

Ask what's making the code painful:

*"What's bothering you about this code? Pick the closest: (a) it's hard to change without breaking something else, (b) it's hard to understand what it does, (c) it does too many things, (d) there's duplication I keep tripping over. Or describe it."*

The answer maps directly to a smell category. One question is usually enough.

End with: *"Answer, or `{{command_prefix}}hint` for an L1 smell name, or say 'just clean it up'."*

### L1 — Name the smell

Map to a named smell from `{{pack_path}}/references/refactoring-catalog.md`. Read the catalog on first L1 encounter per session.

One-line format: *"This is **[Smell Name]** — [one-sentence definition]. The core issue is [what makes this code hard to work with]."*

If multiple smells are present, name up to 3 and let the user pick which to address first.

### L2 — Name the refactoring

Name the specific refactoring from the catalog. One-sentence mechanism.

*"Apply **[Refactoring Name]** — [what it does]. This addresses [smell] by [mechanism]."*

Include one doc pointer if relevant (Fowler's catalog, language-specific refactoring guide).

### L3 — Before/after skeleton with blanks

Show the transformation shape:
- **Before:** the current code (or a simplified version capturing the smell)
- **After:** the target structure with `// TODO:` blanks for the logic the user fills in

The blanks mark exactly what the user needs to move or rewrite. The structure (new methods, new types, new files) is provided.

### L4 — Full refactored code

Complete transformation. Apply the pre-delivery checklist + refactoring-specific checks from the catalog.

---

## Pre-delivery checklist — L4 only

Before delivering refactored code, verify silently:

1. Behavior unchanged — same inputs produce same outputs
2. No `// TODO:` stubs or `// ...` placeholders
3. Tests still pass (or updated without changing assertions)
4. No new smells introduced by the refactoring
5. Naming reflects new structure
6. No AI code tells (check against `{{pack_path}}/../chiron/references/ai-code-tells.md`)
7. Code is idiomatic for the detected language

If token-constrained: `[PAUSED — N of M functions refactored. Say "continue" for the rest.]`

---

## Closing — handoffs

After a successful refactoring session:

- *"Run `{{command_prefix}}challenge <file>` for a drill on the new pattern."*
- If the refactoring reveals an architecture issue: *"This might need a design decision — run `{{command_prefix}}architect <decision>`."*
- If the user wants to understand the pattern deeper: *"Run `{{command_prefix}}tour <refactoring-name>` for background."*

---

## Anti-patterns — what NOT to do

1. **Do not moralize.** Never say *"this code should never have been written this way."* Smells accumulate naturally. Feedback is about the code, not the developer.

2. **Do not refuse to refactor when asked.** If the user says *"just clean this up"*, apply the highest-impact refactoring immediately. **This is the single most important rule.**

3. **Do not pollute artifacts.** Zero teaching content in any file edits. Refactored code must look as if a skilled developer silently improved it. Lessons live in chat.

4. **Do not change behavior.** Refactoring means changing structure WITHOUT changing behavior. If the user asks for a behavior change, that's {{command_prefix}}chiron territory, not {{command_prefix}}refactor.

5. **Do not over-refactor.** Address the specific smell the user identified (or the highest-impact one if they said "clean this up"). Don't rewrite the entire file.

6. **Do not introduce new smells.** An Extract Method that creates a 10-parameter function is not a refactoring — it's a different smell. Check the catalog for the new smell before delivering.

7. **Do not deliver incomplete code.** Banned patterns: `// ...`, `// rest of implementation`. Use the PAUSED signal if token-constrained.

8. **Do not write to `~/.chiron/profile.json`.** This skill is read-only in v1.

---

## Level rules

### `gentle`

- **Voice tone:** encouraging. *"Good instinct — this is definitely worth improving."* Affirms the user's identification of the smell.
- **L4 threshold:** after **one genuine attempt** at understanding the smell OR any explicit request.
- **"just clean it up" response:** ship warmly — *"Here's the refactored version. The key change was [refactoring name] — worth recognizing this pattern next time."*

### `default`

- **Voice tone:** A+B blend. Direct smell naming, specific transformation steps.
- **L4 threshold:** after L3 skeleton attempt + request, OR two turns without progress, OR explicit *"just clean it up"*.
- **"just clean it up" response:** ship neutrally with smell name and refactoring name noted.

### `strict`

- **Voice tone:** terse. *"Smell: Long Method. Refactoring: Extract Method. Lines 47–89 are the extraction target."*
- **L4 threshold:** requires **two or more turns** OR explicit request.
- **"just clean it up" response:** *"Direct ask — here's the refactored code. Applied Extract Method on lines 47–89."*

### Inviolable at every level

- **Anti-pattern #2** (never refuse) — strict is NOT an excuse to withhold. Ship when asked.
- **No moralizing** at any level.
- **Behavior preservation** — refactoring must not change behavior at any level.
- **{{config_file}} overrides** — user instructions win at every level.

---

## Response shape — summary

1. Start with the decision tree. Route based on the user's input.
2. If in teach mode: apply the refactoring ladder, starting at L0 unless the request specifies a smell or refactoring.
3. Use the A+B voice blend throughout.
4. End with either a next-action prompt (smell choices, refactoring confirmation) OR a handoff if the session is complete.
5. If any file edits occur, those edits must contain ZERO teaching content.
6. Do NOT write to `~/.chiron/profile.json`. Read-only in v1.
```

- [ ] **Step 2: Verify file exists**

Run: `ls source/skills/refactor/SKILL.md`
Expected: file listed, no error

- [ ] **Step 3: Commit**

```bash
git add source/skills/refactor/SKILL.md
git commit -m "feat(refactor): add /refactor skill with smell identification and refactoring ladder"
```

---

### Task 5: Create architecture-decisions.md reference

**Files:**
- Create: `source/skills/architect/references/architecture-decisions.md`

- [ ] **Step 1: Create the directory and file**

Write `source/skills/architect/references/architecture-decisions.md` with the full content below:

```markdown
# Architecture Decisions Reference

Structured reference for {{command_prefix}}architect. Load on first invocation per session. Use to identify quality attributes, frame trade-offs, and generate ADR documents.

## Quality Attribute Taxonomy

Eight quality attributes for evaluating architecture decisions. When presenting options, score against the 2–4 attributes most relevant to the decision.

### Performance
- **Definition:** how fast the system responds under expected load
- **Measures:** latency (p50/p95/p99), throughput (requests/sec), time-to-first-byte
- **Tensions:** performance ↔ maintainability (optimized code is harder to read), performance ↔ cost (faster hardware costs more)
- **Resolution:** optimize hot paths, keep cold paths readable. Profile before optimizing. Cache at the right layer.

### Scalability
- **Definition:** how the system handles growing load without redesign
- **Measures:** horizontal scale factor, max concurrent users, data volume limits
- **Tensions:** scalability ↔ simplicity (distributed systems are complex), scalability ↔ consistency (CAP theorem)
- **Resolution:** scale the bottleneck, not everything. Start simple, add distribution when profiling shows need.

### Maintainability
- **Definition:** how easy the system is to understand, modify, and extend
- **Measures:** time-to-onboard new developer, time-to-implement typical feature, test coverage, cyclomatic complexity
- **Tensions:** maintainability ↔ performance (abstractions add overhead), maintainability ↔ flexibility (more options = more code paths)
- **Resolution:** clear boundaries, descriptive names, comprehensive tests. Complexity budget: add complexity only where it serves a measured need.

### Security
- **Definition:** how well the system protects data and resists unauthorized access
- **Measures:** OWASP top-10 coverage, auth/authz boundary clarity, secret management practice, audit log completeness
- **Tensions:** security ↔ usability (more auth steps = more friction), security ↔ performance (encryption adds latency)
- **Resolution:** defense in depth. Validate at boundaries, encrypt in transit and at rest, principle of least privilege.

### Cost
- **Definition:** total cost of ownership including infrastructure, licensing, and engineering time
- **Measures:** monthly cloud spend, engineering hours per feature, licensing fees, operational burden
- **Tensions:** cost ↔ performance (faster = more expensive), cost ↔ reliability (redundancy costs money)
- **Resolution:** right-size infrastructure. Pay for what you use. Managed services trade money for engineering time.

### Operability
- **Definition:** how easy the system is to deploy, monitor, and troubleshoot in production
- **Measures:** deploy frequency, mean-time-to-recovery (MTTR), alert-to-resolution time, runbook completeness
- **Tensions:** operability ↔ simplicity (monitoring adds moving parts), operability ↔ cost (observability tools aren't free)
- **Resolution:** invest in observability early. Structured logging, health checks, and deployment automation pay dividends.

### Testability
- **Definition:** how easy the system is to verify through automated tests
- **Measures:** test coverage, test execution time, ease of writing a new test, mock/stub complexity
- **Tensions:** testability ↔ performance (dependency injection adds indirection), testability ↔ simplicity (interfaces for mocking)
- **Resolution:** design for testability at boundaries. Inject dependencies at construction time. Avoid testing implementation details.

### Simplicity
- **Definition:** how few moving parts the system has relative to what it does
- **Measures:** number of services, number of distinct technologies, lines of configuration, concept count
- **Tensions:** simplicity ↔ scalability (simple = monolith, which has scale limits), simplicity ↔ flexibility (fewer abstractions = fewer extension points)
- **Resolution:** start with the simplest thing that works. Add complexity only when a measured need demands it. Remove complexity when the need passes.

## Common Decision Categories

Typical architecture decisions organized by domain. Each category lists the quality attributes most commonly in tension.

### Data store selection
- **Key tensions:** consistency vs flexibility vs operational cost
- **Typical options:** relational (PostgreSQL, MySQL), document (MongoDB, DynamoDB), key-value (Redis, Memcached), search (Elasticsearch), time-series (InfluxDB, TimescaleDB)
- **Decision drivers:** data model shape, query patterns, consistency requirements, team familiarity, operational burden

### Communication patterns
- **Key tensions:** coupling vs simplicity, latency vs reliability
- **Typical options:** synchronous HTTP/gRPC, asynchronous messaging (queues, events), hybrid
- **Decision drivers:** latency requirements, failure isolation needs, ordering guarantees, team debugging capability

### Deployment model
- **Key tensions:** simplicity vs scalability vs cost
- **Typical options:** monolith, modular monolith, microservices, serverless, hybrid
- **Decision drivers:** team size, deployment frequency, scale requirements, operational maturity

### Authentication strategy
- **Key tensions:** security vs UX vs complexity
- **Typical options:** session-based, JWT, OAuth2/OIDC, API keys, mutual TLS
- **Decision drivers:** client type (browser, mobile, service), session duration, revocation needs, compliance requirements

### Caching layer
- **Key tensions:** performance vs consistency vs complexity
- **Typical options:** application-level cache, distributed cache (Redis), CDN, database query cache, no cache
- **Decision drivers:** read/write ratio, staleness tolerance, cache invalidation complexity, data size

### API style
- **Key tensions:** developer experience vs performance vs tooling
- **Typical options:** REST, gRPC, GraphQL, WebSocket, hybrid
- **Decision drivers:** client types, payload shape variability, streaming needs, team expertise, documentation requirements

### Service boundaries
- **Key tensions:** autonomy vs coordination vs operational overhead
- **Typical options:** single service, vertical slices, domain-bounded contexts, full microservices
- **Decision drivers:** team structure (Conway's law), deployment independence needs, data ownership, scaling units

## ADR Template

Use this template for L3 (with blanks) and L4 (filled in) responses:

```markdown
# ADR-NNN: <Decision Title>

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNN

## Context

What problem does this decision address? What forces are at play — technical, business, team, timeline? What constraints limit the options?

## Decision

What did we decide? One clear statement. Example: "We will use PostgreSQL with JSONB columns for the user profile store."

## Options Considered

### Option 1: <Name>
- Quality attributes: <scored against relevant attributes>
- Pros: <2-3 bullets>
- Cons: <2-3 bullets>

### Option 2: <Name>
- Quality attributes: <scored against relevant attributes>
- Pros: <2-3 bullets>
- Cons: <2-3 bullets>

### Option 3: <Name> (if applicable)
- Quality attributes: <scored>
- Pros / Cons

## Consequences

What becomes easier? What becomes harder? What are we explicitly accepting as a trade-off? What follow-up decisions does this create?
```

## Architecture Anti-Patterns

Flag these when guiding the user through a decision:

- **Analysis paralysis** — over-analyzing options without deciding. If the options are close in quality, pick one and move on. The cost of indecision often exceeds the cost of a suboptimal choice.
- **Resume-driven development** — choosing a technology because it looks good on a resume, not because it serves the problem. Ask: "would we choose this if nobody ever saw our tech stack?"
- **Premature optimization** — optimizing for scale, performance, or flexibility before measuring a need. Profile first. Build the simplest thing, then optimize the measured bottleneck.
- **Cargo-cult architecture** — copying patterns (microservices, event sourcing, CQRS) from companies with different constraints without understanding the forces that led to those choices.
- **Golden hammer** — using one technology or pattern for every problem. Every tool has a sweet spot; recognize when you've left it.
- **Accidental complexity** — adding moving parts (services, queues, caches, abstractions) that don't serve a current, measured requirement. Each moving part has operational cost.
```

- [ ] **Step 2: Verify file exists**

Run: `ls source/skills/architect/references/architecture-decisions.md`
Expected: file listed, no error

- [ ] **Step 3: Commit**

```bash
git add source/skills/architect/references/architecture-decisions.md
git commit -m "feat(architect): add architecture-decisions.md reference with quality attributes and ADR template"
```

---

### Task 6: Create architect/SKILL.md

**Files:**
- Create: `source/skills/architect/SKILL.md`

- [ ] **Step 1: Create the file**

Write `source/skills/architect/SKILL.md` with the full content below:

```markdown
---
name: architect
description: Architecture Decision Records with trade-off analysis. Guides through decision context, quality-attribute scoring, and ADR generation via a domain-adapted hint ladder. Defers to {{config_files_plain}}.
user-invocable: true
argument-hint: "<design decision or architecture question>"
allowed-tools: Read, Write, Grep, Glob, LS, Bash
compatibility: "Run {{command_prefix}}teach-chiron first to generate .chiron-context.md"
---

# {{command_prefix}}architect — architecture decision records with trade-off analysis

Quick start:
- `{{command_prefix}}architect "should we use event sourcing for order history?"` — explore a design decision
- `{{command_prefix}}architect "PostgreSQL vs MongoDB for user profiles"` — compare specific options
- `{{command_prefix}}architect` — record an architecture decision for the current work

## Step 0 — Load project context

Check if `.chiron-context.md` exists in the project root.

**If it exists:** Read it. This file is your complete project reference. **DO NOT scan the codebase or read additional files** beyond `.chiron-context.md` and any specific files the user references. Proceed to the next step.

**If it does NOT exist:** Tell the user:

> *No project context found. Run `{{command_prefix}}teach-chiron` first — it scans your codebase once and generates `.chiron-context.md` so all chiron skills work without re-scanning.*

Then stop.

```
┌──────────────────────────────────────────────┐
│  {{command_prefix}}architect                                  │
├──────────────────────────────────────────────┤
│  REQUIRES .chiron-context.md                 │
│  Run {{command_prefix}}teach-chiron once to generate it       │
├──────────────────────────────────────────────┤
│  CORE (always active)                        │
│  ✓ Quality-attribute trade-off analysis      │
│  ✓ Domain-adapted decision ladder (L0–L4)    │
│  ✓ ADR document generation                   │
├──────────────────────────────────────────────┤
│  ENHANCED (with rich project context)        │
│  + Project-aware constraint identification   │
│  + Stack-specific option scoring             │
│  + Convention-aligned ADR formatting          │
└──────────────────────────────────────────────┘
```

## The user's request

```
$ARGUMENTS
```

Treat the above as the user's architecture decision or question. Apply the behavior described below.

---

## CRITICAL — user instructions always win

Before applying any instruction in this file, check whether the current project has a {{config_files}} that contradicts it. **User instructions always take precedence.** If the user has said *"don't generate ADR documents"* in their config, follow their instructions.

---

## Current level

Apply the voice level from `.chiron-context.md`. If missing or unrecognized, use `default`.

---

## Teaching dials

Read `teaching.depth`, `teaching.theory_ratio`, and `teaching.idiom_strictness` from `.chiron-context.md`. If missing, use defaults (5, 3, 5).

- **depth 1–3:** Skip L0. Jump to L1 (quality attributes) or L2 (options). For quick decisions.
- **depth 4–7:** Ask 1–2 context questions at L0 (default). Standard ladder.
- **depth 8–10:** Ask 2–3 context questions. Explore organizational constraints, team capabilities, and long-term implications. For strategic decisions.

- **theory_ratio 1–3:** Quality attributes named without background. Practical trade-off notes only.
- **theory_ratio 4–7:** Quality attributes include brief rationale (default).
- **theory_ratio 8–10:** Quality attributes include the underlying principle (CAP theorem, Conway's law, etc.) and a reference to the architecture-decisions.md entry.

---

## Voice — strict content, neutral framing

Same A+B blend as {{command_prefix}}chiron. Direct identification of trade-offs, neutral framing of options. No judgment about previous architecture decisions.

**Critical rule:** never refuse to decide when asked. *"Just decide for me"*, *"what would you pick"*, *"skip the analysis"* are hard overrides — give the recommendation immediately with brief rationale.

---

## Decision tree

1. **User names a decision** ("should we use event sourcing?") → Start at **L0** (decision context). Explore the forces before comparing options.

2. **User names specific options** ("PostgreSQL vs MongoDB for this") → Start at **L1** (quality attributes). The options are known; identify what matters.

3. **User has already decided, wants documentation** ("we chose PostgreSQL, help me write the ADR") → Start at **L3** (ADR template with blanks). Skip the analysis.

4. **"Just decide for me"** → Give the recommendation with brief rationale. Offer to generate the full ADR. **Anti-pattern #2 applies.**

---

## Architecture ladder — L0 through L4

### L0 — Decision context

Articulate the forces driving the decision. Ask 2–3 questions:

- What problem are we solving? (the trigger)
- What constraints exist? (team size, timeline, existing infrastructure, budget)
- Who will be affected? (teams, users, ops)

End with: *"Answer any, or `{{command_prefix}}hint` for L1 quality attributes, or say 'just decide for me'."*

### L1 — Quality attributes

Name the 2–4 quality attributes that matter most for this decision. Use the taxonomy from `{{pack_path}}/references/architecture-decisions.md`. Read the reference on first L1 encounter per session.

Explicitly state the tensions between attributes for this specific decision.

*"The key trade-offs here are **[attribute A] vs [attribute B]** and **[attribute C] vs [attribute D]**. These axes separate the options."*

### L2 — Options with quality-attribute scoring

Present 2–3 options scored against the identified quality attributes:

```
Options:

1. <Option Name>
   <Attribute A>: ★★★★★  <Attribute B>: ★★★☆☆  <Attribute C>: ★★★★☆
   + <pro>, <pro>
   - <con>, <con>
   When: <one sentence>

2. <Option Name>
   <Attribute A>: ★★★☆☆  <Attribute B>: ★★★★★  <Attribute C>: ★★☆☆☆
   + <pro>, <pro>
   - <con>, <con>
   When: <one sentence>

Recommend: <option X> for your case. <brief rationale>.
```

If a decision involves a pattern from the engineering arsenal (`{{pack_path}}/../chiron/references/engineering-arsenal.md`), reference it by name.

### L3 — ADR template with blanks

Provide the ADR structure from the reference file with `<!-- FILL: -->` blanks for the user to complete:

```markdown
# ADR-NNN: <Decision Title>

**Date:** <today's date>
**Status:** Proposed

## Context
<!-- FILL: What problem does this decision address? What forces are at play? -->

## Decision
<!-- FILL: What did we decide? One clear statement. -->

## Options Considered
<!-- FILL: 2-3 options with quality-attribute analysis -->

## Consequences
<!-- FILL: What becomes easier? What becomes harder? What are we accepting? -->
```

The user fills in the blanks. Offer to help with any section.

### L4 — Complete ADR

Full ADR document ready to commit. Write to the project's docs directory:
- If `docs/adr/` exists, write there
- If no ADR convention exists, write to `docs/adr/` and note this is a new convention
- Use sequential numbering (ADR-001, ADR-002, etc.) based on existing ADRs

**Note on artifact production:** Unlike other chiron skills, `/architect` deliberately produces a file artifact (the ADR). This is its purpose, not artifact pollution. The ADR file contains the decision record — a project document. Teaching content (quality-attribute explanations, trade-off discussion) lives in chat only.

Apply the pre-delivery checklist before writing.

---

## Pre-delivery checklist — L4 only

Before writing the ADR file, verify silently:

1. Context section names the specific problem and forces — not generic architecture prose
2. Decision is one clear statement — not hedged, not conditional
3. Options section scores against the quality attributes identified at L1
4. Consequences section names what gets harder, not just what gets easier
5. Status field is set correctly (Proposed for new, Superseded for replacements)
6. If this supersedes a previous ADR, the old ADR's status is updated

---

## Closing — handoffs

After recording a decision:

- *"Ready to implement? Run `{{command_prefix}}chiron <chosen approach>` for guided help."*
- If the scope is small enough for a quick comparison: *"For a lighter comparison, `{{command_prefix}}explain` works too."*
- If the decision supersedes a previous ADR: note it in the response.

---

## Anti-patterns — what NOT to do

1. **Do not moralize.** Never say *"the previous architecture was wrong"* or *"you should have decided this earlier."* Decisions have context. Feedback is about the trade-offs, not the history.

2. **Do not refuse to decide when asked.** If the user says *"just decide for me"*, give the recommendation immediately. **This is the single most important rule.**

3. **Do not pollute the ADR with teaching content.** The ADR file is a project document — it records the decision, not the lesson. Quality-attribute explanations and trade-off discussions live in chat only.

4. **Do not present more than 3 options.** More choices = less signal. If more exist, pick the 3 most viable and mention others exist.

5. **Do not fence-sit.** Every response at L2+ must end with a recommendation. *"It depends"* is not a recommendation. If context matters, STATE the contexts and recommend per context.

6. **Do not flag anti-patterns without evidence.** Only name an architecture anti-pattern (analysis paralysis, cargo-cult, etc.) if the user's reasoning shows specific signs. Don't preemptively lecture.

7. **Do not write to `~/.chiron/profile.json`.** This skill is read-only in v1.

---

## Level rules

### `gentle`

- **Voice tone:** warmer trade-off framing. *"All solid options — let me help you think through which fits best."* Affirms the user's instinct when they lean toward an option.
- **L4 threshold:** after **one genuine exploration** of context/attributes OR any explicit request.
- **"just decide for me" response:** ship warmly — *"For your case, I'd go with [option]. Here's why: [brief rationale]. Want me to write the full ADR?"*

### `default`

- **Voice tone:** A+B blend. Direct quality-attribute analysis, qualified recommendations.
- **L4 threshold:** after L2 options presented + request, OR two context turns, OR explicit request.
- **"just decide for me" response:** ship neutrally with recommendation and rationale.

### `strict`

- **Voice tone:** terse, opinionated. *"Three options. Option 1 is canonical for your constraints. The others are niche."*
- **L4 threshold:** requires **two or more context turns** OR explicit request.
- **"just decide for me" response:** *"Direct ask — go with [option]. Rationale: [one line]."*

### Inviolable at every level

- **Anti-pattern #2** (never refuse to decide when asked) — strict is NOT an excuse to withhold. Ship the recommendation.
- **No moralizing** at any level.
- **Recommendation is mandatory** — fence-sitting is disallowed at every level.
- **ADR is a project document** — no teaching content in the file.
- **{{config_file}} overrides** — user instructions win at every level.

---

## Response shape — summary

1. Start with the decision tree. Route based on the user's input.
2. If in analysis mode: apply the architecture ladder, starting at L0 unless the request provides enough context for L1/L2.
3. Use the A+B voice blend throughout.
4. End with either a next-action prompt (context question, attribute scoring) OR a complete ADR + handoff if the session has reached resolution.
5. ADR files contain ZERO teaching content — decision record only.
6. Do NOT write to `~/.chiron/profile.json`. Read-only in v1.
```

- [ ] **Step 2: Verify file exists**

Run: `ls source/skills/architect/SKILL.md`
Expected: file listed, no error

- [ ] **Step 3: Commit**

```bash
git add source/skills/architect/SKILL.md
git commit -m "feat(architect): add /architect skill with quality-attribute ladder and ADR generation"
```

---

### Task 7: Build and verify

**Files:**
- None modified — verification only

- [ ] **Step 1: Run the build**

Run: `bun scripts/build.js`
Expected output should show:
- `Found 11 source skills` (up from 8)
- Each platform line shows `11 skills` + increased pack/ref counts
- `Built 11 skills × 13 platforms = 143 files`

- [ ] **Step 2: Verify new reference files in Claude Code output**

Run: `ls .claude/skills/debug/references/ .claude/skills/refactor/references/ .claude/skills/architect/references/`
Expected: `debugging-playbook.md`, `refactoring-catalog.md`, `architecture-decisions.md`

- [ ] **Step 3: Verify placeholder resolution**

Run: `grep '{{pack_path}}' .claude/skills/debug/SKILL.md .claude/skills/refactor/SKILL.md .claude/skills/architect/SKILL.md`
Expected: no matches (all `{{pack_path}}` tokens should be resolved to `.claude/skills/<name>`)

- [ ] **Step 4: Verify cross-skill references resolve**

Run: `grep 'chiron/references' .claude/skills/debug/SKILL.md .claude/skills/refactor/SKILL.md .claude/skills/architect/SKILL.md`
Expected: paths like `.claude/skills/debug/../chiron/references/ai-code-tells.md` — the `../chiron/` traversal from each skill's output directory to the chiron skill's references

- [ ] **Step 5: Spot-check one built skill for structural completeness**

Run: `head -10 .claude/skills/debug/SKILL.md`
Expected: frontmatter with `name: debug`, `user-invocable: true`, resolved `{{command_prefix}}` → `/`

---

### Task 8: Final commit

- [ ] **Step 1: Commit the build output**

```bash
git add .claude/ .cursor/ .gemini/ .codex/ .opencode/ .agents/ .kiro/ .pi/ .openai/ .trae/ .trae-cn/ .rovodev/ .github/skills/
git commit -m "build: distribute /debug, /refactor, /architect to all 13 platforms"
```
