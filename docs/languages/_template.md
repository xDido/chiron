# &lt;language&gt; language pack

> **This is a template.** Copy this file to `docs/languages/<language>.md` (e.g., `rust.md`, `typescript.md`, `python.md`) and fill it in. Then mirror the seed list + idiom tag list into the "<language> language pack (inlined)" section of `commands/challenge.md`. See [`../CONTRIBUTING-LANGUAGE-PACKS.md`](../CONTRIBUTING-LANGUAGE-PACKS.md) for the full authoring guide.
>
> Delete this quote block once you're ready to submit. The rest of this file is the structure your pack should follow.

Canonical idioms, common pitfalls, mental-model shifts, and challenge seeds for &lt;language&gt;. This file is the **human-readable reference** for chiron's &lt;language&gt; knowledge base. The content is mirrored into `commands/challenge.md` at runtime for the `/challenge` command's seeded pass.

**Contributors:** when adding idioms or seeds here, also update the corresponding section in `commands/challenge.md`. See [`../CONTRIBUTING-LANGUAGE-PACKS.md`](../CONTRIBUTING-LANGUAGE-PACKS.md) for the authoring guide.

---

## Read this first (stdlib / ecosystem anchors)

Docs chiron points to most often. When introducing any of these primitives during a teach turn, offer the corresponding pointer as a "read this first."

| Primitive | Doc pointer | Used for |
|-----------|-------------|----------|
| `<primitive>` | `<doc-url>` | `<one-line description>` |
| `<primitive>` | `<doc-url>` | `<one-line description>` |

**Meta-resources** (language-specific style guides, proverbs, classic blog posts):

- **&lt;Resource name&gt;** — `<url>` — what it's for
- **&lt;Resource name&gt;** — `<url>` — what it's for

---

## Idioms — canonical patterns worth knowing

Each idiom should have: what it is, when to use it, a minimal example, and its tag for profile logging.

**Target: 15–30 idioms across three categories** (stdlib primitives, architectural patterns, design principles).

### Stdlib / standard library primitives

#### 1. &lt;Primitive name&gt;

**Tag:** `<lang>:<idiom-slug>`

One paragraph on what this primitive is and when to reach for it. Include a minimal code example.

```<lang>
// minimal example
```

Background: `<doc-pointer>`.

#### 2. &lt;Primitive name&gt;

(... continue for each primitive ...)

### Architectural patterns

#### N. &lt;Pattern name&gt;

**Tag:** `<lang>:<idiom-slug>`

Describe the pattern, when to use it, and provide a minimal example.

```<lang>
// pattern skeleton
```

### Design principles

#### N. &lt;Principle name&gt;

**Tag:** `<lang>:<idiom-slug>`

State the principle, explain the rationale, and contrast with an anti-pattern if useful.

```<lang>
// example showing the principle
```

---

## Common pitfalls (anti-patterns)

Each pitfall should have: the bug, why it's bad, the fix, and its tag.

**Target: 15–25 pitfalls across logical categories** (concurrency, error handling, resource management, type system, tests, package structure).

### &lt;Category&gt; pitfalls

#### 1. &lt;Pitfall name&gt;

**Tag:** `<lang>:<anti-pattern-slug>`

```<lang>
// BUG: what's wrong
```

One paragraph explaining why it's a bug.

**Fix:**

```<lang>
// correct version
```

---

## Mental-model deltas

Things that work differently in &lt;language&gt; than in C-family defaults (or other mainstream languages). These help engineers transferring from other ecosystems avoid common confusions.

**Target: 10–25 deltas.**

1. **&lt;Concept&gt;.** One-paragraph explanation of how this concept works in &lt;language&gt; and what engineers coming from other languages might expect instead.

2. **&lt;Concept&gt;.** ...

---

## Challenge seeds

Each seed is a pre-authored drill that `/challenge` pattern-matches against source code. When the seed's `Signal` matches a file, the `Drill` becomes a concrete practice target for the user.

**Target: 10–20 seeds** covering the most common mistakes in &lt;language&gt;.

Each seed follows this exact shape:

### `<lang>:<seed-slug>`

**Signal:** Prose or pseudo-regex description concrete enough that a reader can verify a match by inspection. Examples of good signals:

- *"A function contains `mu.Lock()` but the matching `Unlock` is called explicitly without `defer`."*
- *"One or more goroutines inside a function body contain a `for _, x := range X` loop where `X` is closed over from the enclosing scope."*

**Drill:**
- **Task:** what the user should change. One sentence, imperative.
- **Constraint:** what makes this a drill, not a rewrite. Must be observable and bounded. Examples:
  - *"No allocations inside the goroutine body."*
  - *"The function signature must not change."*
  - *"`go vet` must report zero warnings after the change."*

---

## Authoring checklist

Before submitting the pack:

- [ ] All idioms have tags in `<lang>:<slug>` format
- [ ] All seeds have both Signal and Drill sections
- [ ] Each drill is ≤20 lines of change, ≤1 function, 5–15 minutes of work
- [ ] Each drill can be stated in one sentence
- [ ] At least one seed is verified against a hero fixture file you committed in `tests/fixtures/<lang>/`
- [ ] The idiom list and seeds are mirrored into `commands/challenge.md` under a new `# <Language> language pack (inlined)` section
- [ ] The README roadmap is updated to note the language is no longer deferred

See [`../CONTRIBUTING-LANGUAGE-PACKS.md`](../CONTRIBUTING-LANGUAGE-PACKS.md) for the full submission process.
