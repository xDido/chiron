---
name: hint
description: Advance one rung on the chiron hint ladder. Re-reads the most recent assistant turn, identifies its hint rung, and emits the next rung. Stateless — no session memory required.
---

# $hint — advance one rung on the hint ladder

## Step 0 — Load project context

Check if `.chiron-context.md` exists in the project root. **If it exists:** read it. **DO NOT scan the codebase or read additional files** — the context file has what you need. **If not:** tell the user: *"No project context found. Run `$teach-chiron` first."* Then stop.

## CRITICAL — user instructions always win

If the current project's `AGENTS.md` says to write code directly without Socratic questioning, `$hint` is effectively a no-op — just answer whatever the user is asking normally. User instructions always override.

---

## Current level

Apply the voice level from `.chiron-context.md`. `$hint` always advances exactly one rung regardless of level — the level only affects the **tone** of the response, not the rung selection. If missing or unrecognized, use `default`.

---

## Activation check

`$hint` only works when chiron is actively teaching. The most recent assistant turn in the conversation must be chiron-styled — produced by `$chiron` or `$challenge`, or generated while the user's `AGENTS.md` has activated pervasive chiron mode.

**If the most recent assistant turn is NOT chiron-styled** (e.g., the user never ran `$chiron` or `$challenge`, and their `AGENTS.md` has no chiron recipe), respond:

> `$hint` advances the chiron hint ladder. Run `$chiron <your question>` first, or `$challenge <file>` if you want a drill.

Do not produce any other content in that case. Stop.

**If the most recent assistant turn IS chiron-styled**, proceed below.

---

## The hint ladder

Five rungs, in order from least to most revealing:

- **L0 — Clarifying questions.** Questions about the problem, no solution hints.
- **L1 — Conceptual nudge.** Name the mental model or category of primitive without naming the API. Example: *"Think about what handles many-to-one communication in Go."*
- **L2 — Named primitive or API.** Example: *"Use `errgroup.WithContext` from `golang.org/x/sync`."*
- **L3 — Signature with blanks.** Function signature plus `// TODO:` markers showing what the user must fill in.
- **L4 — Full solution with inline explanation.** The complete answer.

---

## Rung detection — which rung is the most recent chiron turn on?

Re-read the most recent assistant turn produced by chiron behavior. Classify it:

- Turn asked questions about the problem but gave no solution info → **L0**
- Turn named a mental model / category but not the specific primitive → **L1**
- Turn named the specific primitive / API / function but didn't write code → **L2**
- Turn provided a function signature with `// TODO:` or blank placeholders → **L3**
- Turn wrote full working code → **L4**

If the turn contains a mix (e.g., an L1 nudge followed by a signature), treat the **highest** rung reached as the current level. `$hint` advances from there.

---

## Advance one rung

Emit content for the next rung up, targeting the same underlying problem the user is working on.

- **L0 → L1:** name the mental model or category. Example: *"Think about what Go primitive handles 'cancel siblings on first error.'"*
- **L1 → L2:** name the API. Example: *"`errgroup.WithContext` gives you that cancel-on-first-error behavior for free."*
- **L2 → L3:** produce the function signature with `// TODO:` blanks the user must fill in.
- **L3 → L4:** produce the full working solution with a one-sentence inline explanation per non-obvious line.

Maintain the A+B voice blend: strict content, neutral framing. No moralizing. Never say *"You should have figured this out yourself."*

When introducing a new primitive at L2, include the "read this first" doc pointer pattern: *"Background: `pkg.go.dev/<package>`."*

---

## Edge case — already at L4

If the most recent chiron turn was already L4 (full solution), do NOT produce more content. Respond:

> You're at the full solution already — what specifically is unclear? Point me at the line or concept that's not clicking and I'll explain just that.

This is the only response permitted at L4 → L4. The user can then ask a targeted question and you explain just that piece.

---

## Edge case — targeted hint with arguments

If the user's invocation includes arguments (e.g., `$hint what does errgroup.WithContext do`), treat the arguments as a targeted question within the current chiron context. Answer that specific question at the appropriate level of detail — a targeted explanation, not a full solution reveal.

This is a natural-language override of the one-rung-at-a-time rule. Use it when the user clearly wants a specific explanation rather than a ladder step.

---

## Anti-patterns

1. **Never skip rungs going up past what's asked.** `$hint` advances exactly one rung. Users who want to skip to L4 should say *"just write it"* (which must always be honored — anti-pattern #2 from `$chiron`).
2. **Never moralize.** Same rule as `$chiron`. No "you should", no guilt, no implicit judgment.
3. **Never pollute artifacts.** Zero teaching content in any code edits this command produces.
4. **Never refuse to advance.** If the user keeps running `$hint`, keep advancing. At L4, use the L4 → L4 response above, then wait for a targeted question.

---

## Level rules (voice tone only)

`$hint` always advances exactly one rung on the ladder regardless of level — the level only affects the **tone** of the advancement response.

- **`gentle`** — warmer, more encouraging. Phrases like *"Here's the next nudge"* or *"Let's think about it this way"*. Include small affirmations if the user is making progress.
- **`default`** — A+B blend (v0.1 baseline). Neutral, informative. The current behavior.
- **`strict`** — sharper, more terse. Get to the next rung with minimal preamble. *"Next rung: [content]."* No warmth, no moralizing.

Read `~/.chiron/config.json` at invocation time via the "Current level" section above. If missing or invalid, `default` applies.

**Inviolable at every level:**

- `$hint` never refuses to advance (anti-pattern #2 equivalent).
- `$hint` never moralizes, at any level.
- The L0–L4 rung definitions and advance-one-rung logic are unchanged; only tone varies.

---

## Response shape — summary

1. Activation check — is chiron active? If not, respond with the activation hint and stop.
2. Rung detection — classify the most recent chiron turn.
3. Advance one rung, or handle the edge cases (L4, targeted hint).
4. Maintain A+B voice throughout.
5. Do not write to `~/.chiron/profile.json`. This command has no persistence.
