# Design: /debug, /refactor, /architect Skills

**Date:** 2026-04-12
**Status:** Proposed
**Version target:** v0.13.0

## Summary

Three new teach-first skills extending chiron's ecosystem: `/debug` (structured debugging with hypothesis testing), `/refactor` (guided refactoring with named patterns), `/architect` (architecture decision records with trade-off analysis). Each skill applies chiron's Socratic pedagogy via a domain-adapted hint ladder, includes a dedicated reference file, and integrates with the existing voice level, teaching dials, and cross-skill handoff system.

## Design Decisions

- **Teach-first integrated:** All three skills use domain-adapted hint ladders (not flat workflows). Each rung maps to the skill's domain while preserving chiron's progressive disclosure pedagogy.
- **References from day one:** Each skill ships with a dedicated reference file providing structured domain knowledge (playbook, catalog, or framework).
- **Read-only for profile.json:** No persistence in v1. Defer logging until the skills are battle-tested. Same approach as `/postmortem` in v0.3.0.
- **Zero build system changes:** New skills go in `source/skills/{debug,refactor,architect}/` with optional `references/` subdirectories. The existing build pipeline handles everything.

## Shared Architecture

All three skills follow the established chiron pattern:

### Frontmatter
```yaml
---
name: <skill-name>
description: <one-line description>
user-invocable: true
argument-hint: "<hint text>"
allowed-tools: Read, Grep, Glob, LS, Bash
compatibility: "Run /teach-chiron first to generate .chiron-context.md"
---
```

### Common Sections (all three)
- **Step 0 — Load project context:** Require `.chiron-context.md`, stop if missing
- **CRITICAL — user instructions always win:** Config file overrides
- **Current level:** Read voice level from `.chiron-context.md`
- **Teaching dials:** Read depth, theory_ratio, idiom_strictness
- **Anti-patterns:** Skill-specific ban list (always includes never-refuse, no-moralize, no-pollute)
- **Level rules:** gentle/default/strict voice variants
- **Pre-delivery checklist:** Silent verification before output
- **Response shape:** Summary of expected output format

### Cross-Skill Handoffs
```
/debug → /postmortem (session review), /challenge (drill on the pattern), /architect (if design decision needed)
/refactor → /challenge (drill on refactored pattern), /architect (if architecture issue found)
/architect → /chiron (implement chosen approach), /explain (quick comparison if scope is small)
```

---

## Skill 1: /debug — Structured Debugging with Hypothesis Testing

### Purpose
Transform debugging from black-box trial-and-error into a teachable diagnostic process: observe → hypothesize → verify → fix → explain.

### When to Use
User has a bug, error, unexpected behavior, or failing test and wants to understand *why*. Differs from chiron's debug-deferral (which skips Socratic mode for speed) — `/debug` is explicitly opted into when the user wants to learn debugging methodology.

### Usage
```
/debug — debug the current error in context
/debug path/to/file.go:42 — debug starting from a specific location
/debug "connection refused after deploying new config" — debug a described symptom
```

### Decision Tree
1. **Stack trace / error message provided?** → Start at L1 (categorize the symptom)
2. **"Something is wrong but I don't know what"** → Start at L0 (observe & gather)
3. **User already has a hypothesis** ("I think it's a race condition") → Start at L2 (verify their hypothesis)
4. **"Just fix it"** → Ship the fix immediately (never-refuse), add one-line root cause note

### Domain-Adapted Hint Ladder

**L0 — Observe & gather:**
Ask 1-3 diagnostic questions. Focus on:
- Expected vs actual behavior
- What changed recently (deploy, config, dependency update)
- Reproduction steps and frequency (always, intermittent, only under load)
- Environment (local, staging, production)

Example: *"Three things I need before we dig in: (1) What's the expected behavior vs what you're seeing? (2) When did this start — tied to a recent change? (3) Can you reproduce it reliably? Answer any, or `/hint` for an L1 category."*

**L1 — Categorize the symptom:**
Map the symptoms to a root cause category from the debugging playbook. Name the category without naming the specific cause.

Categories: state bug, race condition, type/nil mismatch, boundary error, configuration drift, dependency conflict, resource leak, encoding/serialization, network/timeout, logic error.

Example: *"The intermittent nature + concurrent requests + shared state points to the **race condition** category. Think about what shared resource multiple goroutines are touching."*

**L2 — Hypothesize:**
Form a testable hypothesis using the template: "If [cause], then [observable prediction] when [verification step]."

Example: *"If the map is being written concurrently without a mutex, then you'd see a `concurrent map writes` panic under load. Try: `go test -race ./...` on the affected package."*

**L3 — Verification steps with blanks:**
Provide a diagnostic checklist with specific steps. Mark what the user needs to check:

```
Diagnosis checklist:
1. Run `go test -race ./internal/cache/` — CHECK: does it panic?
2. Read cache.go:47-62 — CHECK: is the map guarded by a mutex?
3. Grep for other writes to `c.items` — CHECK: are all writes synchronized?
□ If all three confirm → the fix is adding sync.RWMutex
□ If #1 passes clean → hypothesis is wrong, re-examine at L1
```

**L4 — Full diagnosis + fix:**
Root cause explanation, the fix, why it happened, and how to prevent recurrence. Apply the pre-delivery checklist. Close with:
- One-line root cause summary
- The fix (complete, no placeholders)
- Prevention note (what would have caught this earlier — test, linter, review practice)

### Reference: `debugging-playbook.md`

**Root cause categories** (10 categories, each with):
- Typical symptoms
- Common locations (where to look first)
- Verification approach
- Example hypothesis

**Hypothesis template:**
```
If [specific cause],
then [observable prediction you can test]
when [concrete verification step].
```

**Debugging anti-patterns** (what NOT to do):
- Shotgun debugging (changing random things until it works)
- Printf-only debugging (adding logs without forming a hypothesis)
- Fix-then-understand (shipping a fix without knowing the root cause)
- Blame-the-framework (assuming the bug is in a dependency before checking your own code)
- Scope creep (fixing unrelated issues found during debugging)

### Handoffs
- After fix → *"Run `/postmortem` for a session review."*
- If bug reveals idiom gap → *"Run `/challenge <file>` for a drill on [pattern]."*
- If fix requires design decision → *"This needs an architecture decision — run `/architect <decision>`."*

---

## Skill 2: /refactor — Guided Refactoring with Named Patterns

### Purpose
Transform "this code is messy" into structured, named transformations. `/refactor` identifies the code smell, names the refactoring pattern, and guides the user through applying it — teaching the vocabulary of refactoring.

### When to Use
User wants to improve existing code structure without changing behavior. Differs from `/chiron` (teaches how to build new things) — `/refactor` teaches how to reshape what already works.

### Usage
```
/refactor path/to/file.go — identify refactoring opportunities in a file
/refactor path/to/file.go:functionName — refactor a specific function
/refactor "this handler does too much" — refactor based on a described smell
```

### Decision Tree
1. **User names a file/function** → Read it, identify 1-3 refactoring opportunities, present as choices
2. **User names a smell** ("this function is too long") → Map to named refactoring(s)
3. **User names a refactoring** ("extract method on this") → Validate the choice, guide application
4. **"Just clean this up"** → Apply highest-impact refactoring, explain what you did (never-refuse)

### Domain-Adapted Hint Ladder

**L0 — Identify the motivation:**
Ask what's making the code painful. The answer reveals the smell.

Example: *"What's bothering you about this code? Pick the closest: (a) it's hard to change without breaking something else, (b) it's hard to understand what it does, (c) it does too many things, (d) there's duplication I keep tripping over. Or describe it."*

**L1 — Name the smell:**
Map the user's description to a named code smell from the refactoring catalog. Name it, give one-sentence definition.

Example: *"This is **Feature Envy** — `OrderService.calculateShipping()` reaches into `Address` for 6 different fields. The method wants to live closer to the data it uses."*

**L2 — Name the refactoring:**
Name the specific refactoring that addresses the smell. One-sentence mechanism.

Example: *"Apply **Move Method** — move `calculateShipping()` to the `Address` type (or a `ShippingCalculator` that takes an `Address`). The logic moves to where the data lives."*

**L3 — Before/after skeleton with blanks:**
Show the transformation shape. The "before" is the current code; the "after" has the target structure with blanks for the logic the user fills in.

```
Before (Feature Envy):
  func (o *OrderService) calculateShipping(addr Address) float64 {
      // 30 lines reaching into addr.Street, addr.City, addr.State, addr.Zip, addr.Country, addr.Type
  }

After (Move Method):
  func (a Address) ShippingCost() float64 {
      // TODO: move the shipping logic here — it only needs `a` fields
  }

  func (o *OrderService) calculateShipping(addr Address) float64 {
      return addr.ShippingCost()  // delegate
  }
```

**L4 — Full refactored code:**
Complete transformation. Apply pre-delivery checklist + refactoring-specific checks:
- Behavior preserved (same inputs → same outputs)
- No new smells introduced by the refactoring
- Naming reflects new structure
- Tests still pass (or updated to match new structure)

### Reference: `refactoring-catalog.md`

**Code smells** (12-15 named smells, each with):
- Name and one-line description
- Signal (what to look for in code)
- Severity (how urgently it should be addressed)
- Related refactoring(s)

Smells to include:
- Long Method, Feature Envy, Shotgun Surgery, Primitive Obsession, Data Clump
- Switch Statements (repeated type-checking), Parallel Inheritance Hierarchies
- Speculative Generality, Dead Code, Middle Man
- God Class, Inappropriate Intimacy, Message Chain

**Named refactorings** (15-20, each with):
- Name and one-line description
- Addresses smell(s)
- Mechanism (the transformation in one paragraph)
- Constraint (what must not change — behavior, interface, performance)
- Risk level (low/medium/high — how likely to introduce bugs)

Refactorings to include:
- Extract Method, Inline Method, Move Method, Extract Class
- Replace Conditional with Polymorphism, Replace Temp with Query
- Introduce Parameter Object, Preserve Whole Object
- Replace Type Code with Subclasses, Decompose Conditional
- Pull Up / Push Down Method, Extract Interface, Rename Method
- Replace Magic Number with Constant, Encapsulate Collection

**Refactoring pre-delivery checklist:**
1. Behavior unchanged (same inputs → same outputs)
2. Tests pass (or updated to match new structure without changing assertions)
3. No new smells introduced (refactoring didn't create a different problem)
4. Naming reflects new structure
5. No AI code tells in the refactored code

### Handoffs
- After refactoring → *"Run `/challenge <file>` for a drill on the new pattern."*
- If refactoring reveals architecture issue → *"This might need a design decision — run `/architect <decision>`."*
- If user wants to understand the pattern deeper → *"Run `/tour <refactoring-name>` for background."*

---

## Skill 3: /architect — Architecture Decision Records

### Purpose
Transform "should we use X or Y?" into structured Architecture Decision Records. `/architect` guides through articulating decision context, exploring options with quality-attribute trade-offs, and producing an ADR document.

### When to Use
User faces a design decision with multiple valid approaches and significant consequences. Differs from `/explain` (brief comparison) — `/architect` goes deeper on quality attributes and produces a durable ADR artifact.

### Usage
```
/architect "should we use event sourcing for order history?" — explore a design decision
/architect "PostgreSQL vs MongoDB for user profiles" — compare specific options
/architect — record an architecture decision for the current work
```

### Decision Tree
1. **User names a decision** ("should we use event sourcing?") → Start at L0 (context)
2. **User names specific options** ("PostgreSQL vs MongoDB") → Start at L1 (quality attributes)
3. **User has decided, wants documentation** → Start at L3 (ADR template with blanks)
4. **"Just decide for me"** → Give recommendation with brief rationale (never-refuse), offer full ADR

### Domain-Adapted Hint Ladder

**L0 — Decision context:**
Articulate the forces driving the decision. Ask 2-3 questions:
- What problem are we solving? (the trigger)
- What constraints exist? (team size, timeline, existing infrastructure, budget)
- Who will be affected? (teams, users, ops)

Example: *"Before we compare options — three things that shape this decision: (1) What scale are we designing for (current vs 2-year target)? (2) Does the team have production experience with either option? (3) What's the migration budget — greenfield or incremental?"*

**L1 — Quality attributes:**
Name the 2-4 quality attributes that matter most for this decision. Use the taxonomy from the reference file. Explicitly state the tensions.

Example: *"The key trade-offs here are **consistency vs availability** (CAP), **query flexibility vs write performance**, and **operational simplicity vs schema flexibility**. These three axes separate the options."*

**L2 — Options with quality-attribute scoring:**
Present 2-3 options scored against the identified quality attributes. Deeper than `/explain` — include explicit quality-attribute analysis.

```
Options:

1. PostgreSQL (JSONB for flexibility)
   Consistency: ★★★★★  Query flexibility: ★★★★☆  Operational: ★★★★★
   + ACID transactions, mature tooling, team knows it
   - Schema-on-read (JSONB) loses some type safety
   When: structured data with occasional flexibility needs

2. MongoDB (document store)
   Consistency: ★★★☆☆  Query flexibility: ★★★☆☆  Operational: ★★★☆☆
   + Natural document model, horizontal scaling
   - Eventual consistency (default), new operational burden
   When: highly variable schemas, massive write throughput needed

Recommend: PostgreSQL for your case. Team familiarity + ACID > schema flexibility.
```

**L3 — ADR template with blanks:**
The ADR structure with blanks the user fills in:

```markdown
# ADR-NNN: <Decision Title>
Date: YYYY-MM-DD
Status: Proposed

## Context
<!-- FILL: What problem does this decision address? What forces are at play? -->

## Decision
<!-- FILL: What did we decide? One clear statement. -->

## Options Considered
<!-- FILL: 2-3 options with brief trade-off notes -->

## Consequences
<!-- FILL: What becomes easier? What becomes harder? What are we accepting? -->
```

**L4 — Complete ADR:**
Full ADR document ready to commit. Written to the project's docs directory (or `docs/adr/` if no convention exists).

**Note on artifact production:** Unlike other chiron skills, `/architect` *deliberately* produces a file artifact (the ADR). This is its purpose, not artifact pollution. The ADR file contains the decision record, not teaching content. Teaching lives in chat; the ADR is a project document.

### Reference: `architecture-decisions.md`

**Quality attribute taxonomy** (8 attributes, each with):
- Name and one-line definition
- How to measure/evaluate
- Common tensions with other attributes

Attributes: performance, scalability, maintainability, security, cost, operability, testability, simplicity.

**Common decision categories** with typical quality-attribute tensions:
- Data store selection (consistency vs flexibility vs operational cost)
- Communication patterns (sync vs async, coupling vs simplicity)
- Deployment model (simplicity vs scalability vs cost)
- Authentication strategy (security vs UX vs complexity)
- Caching layer (performance vs consistency vs complexity)
- API style (REST vs gRPC vs GraphQL — each with trade-off profile)
- Service boundaries (autonomy vs coordination vs operational overhead)

**Trade-off framework:**
For each pair of quality attributes, the common tension and resolution patterns. Example: performance ↔ maintainability: "Optimize hot paths, keep cold paths readable. Profile before optimizing."

**ADR template** with section-by-section guidance.

**Architecture anti-patterns:**
- Analysis paralysis (over-analyzing, never deciding)
- Resume-driven development (choosing tech for the resume, not the problem)
- Premature optimization (optimizing before profiling)
- Cargo-cult architecture (copying patterns without understanding the forces)
- Golden hammer (using one solution for every problem)
- Accidental complexity (adding moving parts that don't serve a requirement)

### Handoffs
- After recording decision → *"Ready to implement? Run `/chiron <approach>`."*
- If decision involves an engineering arsenal pattern → reference by name
- If decision supersedes a previous ADR → note it in the Status field

---

## File Structure

```
source/skills/
├── debug/
│   ├── SKILL.md
│   └── references/
│       └── debugging-playbook.md
├── refactor/
│   ├── SKILL.md
│   └── references/
│       └── refactoring-catalog.md
└── architect/
    ├── SKILL.md
    └── references/
        └── architecture-decisions.md
```

## Build Impact

Zero build system changes. The existing `readSourceSkills()` → `transformSkill()` → `writeSkill()` pipeline in `scripts/build.js` auto-discovers new skill directories, handles `references/` subdirectories, and distributes to all 13 platforms.

After implementation: `bun scripts/build.js` should show `11 source skills` (up from 8) with additional refs.

## Invariants Preserved

- **Never refuse to ship when asked** — all three skills honor anti-pattern #2
- **No artifact pollution** — teaching lives in chat; `/architect`'s ADR file is a project document, not teaching content
- **User instructions always win** — config file overrides apply
- **Read-only for profile.json** — no persistence in v1
- **Build system compatibility** — standard directory structure, no changes needed
- **Cross-platform** — `{{pack_path}}` resolves correctly for all 13 platforms

## Testing

After implementation:
1. `bun scripts/build.js` shows 11 skills, new refs in output
2. Spot-check built output for placeholder resolution
3. Dogfood test each skill on a real codebase:
   - `/debug` on a failing test or known bug
   - `/refactor` on a long function or smelly class
   - `/architect` on a pending design decision
4. Verify cross-skill handoffs work (e.g., `/debug` → `/postmortem`)
