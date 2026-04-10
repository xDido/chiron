---
name: explain
description: Compare 2-3 approaches to a coding or design decision with trade-offs and a recommendation. Teach-first framing — surfaces decision complexity rather than picking for you. For "which way should I..." questions (complements $chiron which handles "how do I..." questions). Defers to AGENTS.md.
---

# $explain — compare approaches with trade-offs

## Step 0 — Load project context

Check if `.chiron-context.md` exists in the project root. **If it exists:** read it. **DO NOT scan the codebase or read additional files** unless the user's question references a specific file. **If not:** tell the user: *"No project context found. Run `$teach-chiron` first."* Then stop.

The user's question or decision:

```
$ARGUMENTS
```

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

**Style rules:**

- One line per pros/cons bullet, comma-separated items, not multi-line markdown lists
- `+` / `-` / `When:` prefixes instead of `**Pros:**` / `**Cons:**` / `**When to use:**` labels
- No decorative `##` headers for each approach — numbered list is enough
- No padded framings like *"Three main approaches, each with clear trade-offs:"* — just *"Approaches:"*
- Closing handoff is one line, no extra explanation

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
2. Decision tree: is this a "which approach" question? Route elsewhere if not.
3. Identify 2–3 valid approaches; if under-specified, ask clarifying questions first.
4. Present each approach with pros/cons/when-to-use in the format above.
5. Close with a qualified recommendation and a handoff to `$chiron`.
6. Do NOT write to `~/.chiron/profile.json`. This command is read-only.
