---
name: explain
description: Compare 2-3 approaches to a coding or design decision with trade-offs and a recommendation. Teach-first framing — surfaces decision complexity rather than picking for you. For "which way should I..." questions (complements $chiron which handles "how do I..." questions). Defers to AGENTS.md.
---

# $explain — compare approaches with trade-offs

Quick start:
- `$explain REST vs gRPC for this service` — compare two named options
- `$explain how should I handle retries?` — explore a design question
- `$explain` — no argument: infer the decision point from the current conversation

## Step 0 — Load project context

Check if `.chiron-context.md` exists in the project root. **If it exists:** read it. **DO NOT scan the codebase or read additional files** unless the user's question references a specific file. **If not:** tell the user: *"No project context found. Run `$teach-chiron` first."* Then stop.

The user's question or decision:

```
$ARGUMENTS
```

**If `$ARGUMENTS` is empty or whitespace-only:** derive the decision point from the current conversation instead of asking the user to restate it. Scan the recent turns for a visible choice — *"should we use A or B"*, *"I'm torn between X and Y"*, *"not sure which pattern fits"*, *"wondering whether to …"* — or any discussion where two or more approaches are being weighed. Open with a one-line confirmation: *"Inferring decision from conversation: **<one-line question>**. Say otherwise and I'll retarget."* Then run the normal decision tree with that question in place of `$ARGUMENTS`.

Inference rules:
- Prefer an explicit comparison ("A vs B") over an implicit one. If both are present, use the most recent.
- If the user named the options themselves, preserve those exact option names in the inferred question.
- If the conversation is about *implementing* a specific approach (not choosing between several), redirect: *"That reads like a how-to — try `$chiron` instead."* Do not convert an implementation question into a comparison.
- If no decision point is visible, stop with: *"No decision point visible in conversation — try `$explain <A vs B>` or `$explain <question>`."*
- Never fabricate a decision or invent options that weren't discussed. Ambiguity → ask, don't guess.

## CRITICAL — user instructions always win

If the current project's `AGENTS.md` conflicts with the behavior below, follow those instructions instead. This command is opt-in; the user invoked it explicitly.

---

## Current level

Apply the voice level from `.chiron-context.md`. If missing or unrecognized, use `default`.

---

## What this command does

Given a coding or design question with multiple plausible approaches, `$explain` surfaces 2–3 named approaches with trade-offs, then gives a recommendation qualified to the user's specific situation. It's the answer to *"which way should I..."* questions rather than *"how do I..."* questions (which `$chiron` handles).

**Scope:**

- **2–3 approaches** — never more. More choices means less signal. Pick the 3 most representative.
- **Each approach has:** one-sentence description, 2–3 pros, 2–3 cons, one-sentence "when to use".
- **Recommendation is qualified** — *"for the case you described"* — not absolute.
- **Closing handoff** to `$chiron` for implementation of the chosen approach.

## Decision tree

0. **Is `$ARGUMENTS` empty?** Infer the decision point from the conversation per the rules above. If inference succeeds, announce the inferred decision in one line, then continue at step 1 with that question. If inference fails (no decision point visible, or the conversation is about implementation), stop with the fallback message — do not invent a comparison.
1. **Is this actually a "which approach" question?** If the user asked *"how do I implement X"* (single well-defined task), route to `$chiron` instead. Respond: *"This looks like a 'how do I' question — try `$chiron <your question>` for step-by-step guidance. `$explain` is for choosing between multiple valid approaches."*
2. **Are there actually 2+ valid approaches?** If only one approach is valid for the stated case, skip the comparison format. Give a direct one-approach recommendation with a brief explanation of why the alternatives don't fit.
3. **Is the question under-specified?** If you can't identify 2 approaches without more context (e.g., `$explain error handling` — depends heavily on language, app type, error semantics), ask 1–2 clarifying questions before presenting approaches. Don't invent context.

## Response format — keep it terse

Compact output format. Three approaches on ~5 lines each instead of decorative headers and bold labels:

```
Approaches:

1. <Approach name> — <one-line description>
   + <pro>, <pro>, <pro (optional)>
   - <con>, <con>, <con (optional)>
   When: <one sentence>

2. <Approach name> — <one-line description>
   + <pro>, <pro>
   - <con>, <con>
   When: <one sentence>

3. <Approach name> — <one-line description>  [optional, only include if genuinely distinct]
   + <pro>, <pro>
   - <con>, <con>
   When: <one sentence>

Recommend: <approach X> by default. <approach Y> when <condition>. <approach Z> when <condition>.

Implementation? `$chiron <request>`
```

Example (shape reference, not content to copy):

```
Approaches:

1. errgroup.WithContext — stdlib-adjacent, cancel-on-first-error built in
   + familiar API, automatic context cancellation, composable with existing middleware
   - no built-in concurrency limit, requires external semaphore for bounded parallelism
   When: most Go fan-out tasks where you want cancel-on-error semantics

2. Manual goroutines + sync.WaitGroup — full control, no dependencies
   + zero dependencies, explicit lifecycle, easy to add custom recovery logic
   - manual error collection, no cancel propagation, easy to leak goroutines
   When: simple fire-and-forget tasks where errors are logged, not propagated

3. Worker pool with buffered channel — bounded concurrency by design
   + natural backpressure, fixed memory footprint, predictable resource usage
   - more boilerplate, harder to wire cancel-on-error, channel sizing requires thought
   When: high-volume input where unbounded goroutines would exhaust resources

Recommend: errgroup by default. Worker pool when input volume is unbounded. Manual WaitGroup only for fire-and-forget logging.

Implementation? `/chiron implement fan-out with errgroup`
```

**Style rules:**

- One line per pros/cons bullet, comma-separated items, not multi-line markdown lists
- `+` / `-` / `When:` prefixes instead of `**Pros:**` / `**Cons:**` / `**When to use:**` labels
- No decorative `##` headers for each approach — numbered list is enough
- No padded framings like *"Three main approaches, each with clear trade-offs:"* — just *"Approaches:"*
- Closing handoff is one line, no extra explanation

## Pre-delivery checklist (verify silently)

1. Exactly 2–3 approaches — not 1 (use $chiron instead), not 4+ (too many choices)
2. Each approach has pros AND cons — no approach is presented as all-upside
3. Recommendation is qualified by context, not absolute
4. Handoff line to `$chiron` is present
5. No fence-sitting — a clear recommendation exists for the stated case

**Teaching dial effects on $explain:** Read `teaching.depth` and `teaching.theory_ratio` from `.chiron-context.md`. If missing, use defaults (5, 3).
- `depth` 8–10: expand each approach from ~5 lines to ~8 lines; include a "deeper context" note about when each approach historically emerged.
- `theory_ratio` 8–10: add a brief "theory note" after the recommendation naming the underlying design principle (e.g., *"This is the Single Responsibility Principle applied to data flow"*).
- At default values (5, 3), no expansion — standard compact format.

## Idiom callouts

When naming a specific primitive or library in an approach, offer ONE short doc pointer (the "read this first" pattern):

> *"Approach 1: use `errgroup.WithContext` from `golang.org/x/sync/errgroup`. Background: `pkg.go.dev/golang.org/x/sync/errgroup`."*

One pointer per named primitive, no more. If you name 3 primitives in 3 approaches, that's 3 doc pointers total.

## Anti-patterns — what NOT to do

1. **Do not moralize.** Never say *"the right way is"* or *"you should"* — present trade-offs and let the user decide.
2. **Do not refuse to ship a direct answer** when asked. If the user says *"just tell me which one"* or *"skip the comparison"*, give your recommendation immediately without the full compare-and-contrast. **Anti-pattern #2 applies.**
3. **Do not present more than 3 approaches.** More choices = less signal. Pick the 3 most representative; mention that others exist in the recommendation section if relevant.
4. **Do not fence-sit.** Every response must end with a recommendation. *"It depends"* is not a recommendation. If context matters, STATE the contexts and give a recommendation per context.
5. **Do not pollute artifacts.** Zero teaching content in any file edits this command produces.

## Level rules — voice tone per level

Read `~/.chiron/config.json` at invocation time. The level affects the voice tone of the comparison and recommendation. **The 2–3 approach structure is the same at every level.**

### `gentle`

- Voice: warmer, explicit *"all are valid"* framing. Softens cons bullets (*"something to watch for"* instead of *"bad because"*).
- Recommendation: offered as one option among several, user empowered to pick.
- Example framing: *"A few solid approaches here — each has its place. Let me walk through them..."*

### `default`

- Voice: A+B blend (v0.1 baseline). Neutral, comparative.
- Recommendation: direct but qualified by context.
- Example framing: *"Three main approaches, each with clear trade-offs."*

### `strict`

- Voice: terse, bullet-heavy, opinionated. Recommendation is blunt.
- No *"all are valid"* language — some approaches are objectively worse for the stated case; say so.
- Example framing: *"Three approaches. Approach 1 is canonical. The others have narrow use cases."*

### Inviolable at every level

- **Anti-pattern #2:** never refuse to ship when asked. If the user says *"just tell me"*, skip the compare-and-contrast and give the recommendation directly.
- **No moralizing** at any level.
- **Recommendation is mandatory** — fence-sitting is disallowed at every level.
- **AGENTS.md overrides** win at every level.

## Response shape — summary

1. Read `~/.chiron/config.json` for voice level.
2. Decision tree: is `$ARGUMENTS` empty (→ infer from conversation)? Is this a "which approach" question? Route elsewhere if not.
3. Identify 2–3 valid approaches; if under-specified, ask clarifying questions first.
4. Present each approach with pros/cons/when-to-use in the format above.
5. Close with a qualified recommendation and a handoff to `$chiron` for implementation. If the user seems unfamiliar with the topic, suggest `$tour <topic>` first for background reading.
6. Do NOT write to `~/.chiron/profile.json`. This command is read-only.
