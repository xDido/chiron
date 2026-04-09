# Contributing a language pack to chiron

This guide explains how to add a new language pack to chiron. The v0.1 release ships with Go only. Community contributions for Rust, TypeScript, Python, and other languages are welcome.

A new language pack is usually a **single PR** that touches two files plus a hero fixture. This guide walks you through it end to end.

---

## What is a language pack?

A language pack is chiron's knowledge about a specific programming language, expressed in a structured markdown format. It has five parts:

1. **Stdlib anchors** — doc pointers chiron offers when introducing canonical primitives ("Background: `<url>`")
2. **Idioms** — canonical patterns with tags, examples, and rationale
3. **Anti-patterns** — common pitfalls with the bug, the explanation, and the fix
4. **Mental-model deltas** — things the language does differently from C-family defaults, useful for engineers transferring in
5. **Challenge seeds** — pre-authored drills that `/challenge` pattern-matches against user code

The seeds are what makes `/challenge` work for the language. Without seeds, `/challenge` falls back to a model eyeball pass and generates drills ad-hoc. Seeds make the behavior reproducible and pedagogically grounded.

## Where does a language pack live?

Every pack has content in **two files**, both maintained together:

| File                                                                 | Role                                                                                                                                                           | Size                       |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `docs/languages/<lang>.md`                                           | Human-readable reference. Full idiom explanations, all anti-patterns, mental-model deltas, stdlib anchors. Read by contributors and users, not by the runtime. | Large (500+ lines typical) |
| `.claude/skills/challenge/SKILL.md` § "&lt;Language&gt; language pack (inlined)" | Runtime source of truth. Just the idiom tag list (for eyeball fallback) and the full seeds (for pattern matching). No prose explanations.                      | ~200 lines per language    |

**Both files must be kept in sync.** The docs file explains the content; the command file runs the command. A contribution PR touches both. If they drift, the runtime behavior drifts from the documentation.

## Why two files?

Because commands in Claude Code can't reliably load external files from the plugin directory at runtime. The command must be self-contained. At the same time, we want a readable reference document for contributors and users — hence the docs mirror. See the implementation plan file (cross-check #3 and the Phase 4 install-phase correction) for the full reasoning behind this decision — it's stored outside the public repo at `~/.claude/plans/mossy-crunching-hopcroft.md`.

---

## Step-by-step: adding a new language

### 1. Start from the template

```bash
cp docs/languages/_template.md docs/languages/<lang>.md
```

Replace all `<language>` placeholders with your language name.

### 2. Write the knowledge base

Fill in the pack with at least:

- **10 stdlib / ecosystem anchors** (doc pointers to the most important libraries and concepts)
- **15–30 idioms** across three categories (stdlib primitives, architectural patterns, design principles)
- **15–25 anti-patterns** grouped by category (concurrency, error handling, resource management, type system, tests, package structure)
- **10–25 mental-model deltas** (things that work differently from mainstream languages)
- **10–20 challenge seeds** with Signal + Drill format

Use `docs/languages/go.md` as a reference — it's the gold standard.

**Quality bar:**

- Each idiom has a concrete code example, not just prose
- Each anti-pattern shows the bug AND the fix
- Each seed has a **verifiable** signal (you can point at a file and say "this matches")
- Drills are bounded and small (≤20 lines of change, 5–15 minutes of work, one-sentence task)

### 3. Write a hero fixture

Create a deliberately-buggy file at `tests/fixtures/<lang>/<descriptive_name>.<ext>` that triggers at least one of your seeds. Document the bugs in comments so reviewers can verify.

Example from Go: `tests/fixtures/go/worker_pool_bad.go` contains a worker pool with a ranging-inside-goroutine bug that matches the `go:shared-input-channel` seed.

The hero fixture serves two purposes:

1. Proof that your pack works end-to-end: `/challenge tests/fixtures/<lang>/<file>` should produce a real drill.
2. Material for the README hero GIF if the language becomes the primary demo.

### 4. Mirror into `.claude/skills/challenge/SKILL.md`

Copy the **idiom tag list** and the **full challenge seeds** (not the explanations, not the mental-model deltas) into `.claude/skills/challenge/SKILL.md`. Add them as a new section at the end of the file:

```markdown
# <Language> language pack (inlined)

This is the runtime source of truth for chiron's <Language> knowledge...

## <Language> idiom tag list (for eyeball fallback reference)

[copy the tag list from docs/languages/<lang>.md]

## <Language> challenge seeds

[copy the seeds from docs/languages/<lang>.md]
```

The human-readable docs stay in `docs/languages/<lang>.md`. Only the tags and seeds go into the command file.

### 5. Update language detection in `.claude/skills/challenge/SKILL.md`

Find step 2 of the command ("Language detection"). Add your language's file extension:

```markdown
- `.<ext>` → <Language> (supported)
```

And remove it from the "respond with a community contribution message" list if it's there.

### 6. Update the README roadmap

In `README.md`, find the "Roadmap" section and remove your language from the "community contributions welcomed" list (it's no longer a gap).

### 7. Test your pack locally

Install the plugin locally:

```bash
claude plugins marketplace add ./
claude plugins install chiron@chiron-dev
```

Run the three verification steps:

```
/challenge tests/fixtures/<lang>/<your-fixture>
```

Expected outcome:

- 1–3 drills are generated
- At least one drill references specific lines in your fixture
- At least one drill maps to a seed you wrote (not just the eyeball fallback)
- The drill is scoped correctly (small, focused, achievable in 5–15 minutes)

Then run `/challenge` on a real file in one of your own projects. Expected outcome:

- Either 1–3 seeded drills (if the file has bugs your pack knows about)
- Or the "no seeds matched" eyeball fallback with 1–3 drills from the model's own judgment

If the fallback fires too often, your seed signals are too narrow. If seeds fire on files that don't actually have the issue, your signals are too broad.

### 8. Open the PR

Against `main`, with these files changed:

- `docs/languages/<lang>.md` (new)
- `.claude/skills/challenge/SKILL.md` (modified — new inlined section + language detection update)
- `tests/fixtures/<lang>/<file>.<ext>` (new)
- `README.md` (modified — roadmap update)

The PR description should include:

- What language you're adding
- Why (who benefits, what idioms matter most in this language)
- How you tested it (which fixture file, which seeds fired)
- Any deliberate trade-offs or gaps

**Reviewer checklist:**

- Seeds have both Signal and Drill and look runnable
- Drills meet the size constraints (≤20 lines, ≤1 function, 5–15 min)
- At least one drill has been verified end-to-end on a real file
- The command file and docs file stay in sync (same seeds, same tag list)
- README roadmap is updated

---

## Writing good seeds

This is the hard part. A good seed is:

**Specific enough to match.** The signal should be concrete — "A function contains `mu.Lock()` but the matching `Unlock` is called explicitly without `defer`" is good. "The code doesn't handle errors well" is not.

**General enough to recur.** The signal should match code that real engineers actually write, not just a contrived example. If you made up the signal to justify a cool drill, find a real file that exhibits the pattern first.

**Tied to an idiom.** Every seed should have a corresponding idiom explanation in the same pack. If you're authoring a seed and there's no idiom for it yet, add the idiom first.

**Bounded in fix.** The drill must be completable in 5–15 minutes with ≤20 lines of change and ≤1 function touched. If the fix requires restructuring multiple files, the seed is too big — split it or reframe it.

**One-sentence task.** If you can't state the task in one sentence, the drill is too complex.

Examples of good drill tasks:

- _"Convert the `mu.Unlock()` calls to a single `defer mu.Unlock()` after the Lock."_
- _"Replace the `%v` verb with `%w` in the `fmt.Errorf` call."_
- _"Change the worker goroutines to read from a shared input channel instead of ranging over the shared slice."_

Examples of bad drill tasks (too big or too vague):

- _"Refactor this function to be more idiomatic."_ (Vague. What specifically?)
- _"Add context propagation throughout the package."_ (Multi-file; too big.)
- _"Rewrite the error handling."_ (Not bounded.)

## How signals are matched at runtime

chiron's `/challenge` command uses the **model** (not a static regex engine) to match signals against source code. The signal text is read literally and the model decides whether the target file exhibits the pattern.

This means:

- **Signals can be prose.** You don't need to write a regex. "A function spawns multiple goroutines and uses `sync.WaitGroup` for coordination with manual error collection" is a valid signal.
- **Signals should be unambiguous.** Avoid vague phrases like "poorly structured" or "not idiomatic" — the model can't check these reliably.
- **Context matters.** If a pattern is only a bug in certain contexts (e.g., "ranging over a shared slice inside a goroutine, but only in worker-pool style"), state the context explicitly.

## Testing tips

- **Run `/challenge` on the hero fixture** to verify your seeds fire correctly.
- **Run `/challenge` on a clean file** (known-idiomatic) to verify seeds don't false-positive.
- **Run `/challenge` on 2–3 real files from your own projects** to calibrate — does it find real issues, or does it always fall back to eyeball?
- **Write a second fixture** covering a different set of seeds if your language has distinct problem areas.

---

## Quality bar for community contributions

Chiron aims to be opinionated and high-signal. A language pack is accepted if:

- Every idiom has a tag, a one-paragraph explanation, and a code example
- Every anti-pattern has a bug example, a fix example, and a rationale
- Every seed has Signal + Drill that a reviewer can verify by inspection
- The hero fixture demonstrates at least one seed firing end-to-end
- The command file and docs file are in sync
- The contributor has actually used chiron with their pack for at least one real coding session

The last point matters. We don't merge packs written in the abstract — they need to survive contact with real code. If you haven't tried your own pack on your own projects, wait until you have.

## Questions?

Open a discussion or issue with the `language-pack` label. We'll help you scope the pack, write good seeds, and work through tricky signals. Contributing a language pack is the highest-leverage way to improve chiron — it brings a whole new community into the tool.
