Here is a draft plan to refine:

# Plan: `chiron` v0.1 — Teach-First Claude Code Plugin (Revised)

## Context

The original plan for `chiron` (a Claude Code plugin that turns coding sessions into deliberate-practice sessions) is directionally correct — the name, tagline, teach-first attitude, and `/ship` escape hatch all land. But the plan ships 10 hero features at once, treats the riskiest technical decision (a default-on pre-edit hook) as a one-paragraph detail, buries the single most novel feature (`/challenge` drills from the user's own code), and orphans the cross-project learner profile that would be the strongest stickiness hook.

This revision narrows v0.1 to a validated MVP, inverts the hook default, promotes `/challenge` and the global profile into first-class features, and adds the missing artifacts (golden transcript, anti-patterns list) that turn a vision doc into something buildable.

Origin artifact: `C:/Users/Dido/Desktop/mentor/go-mentor.md` — a strict Go-mentor system prompt that establishes the voice and decision tree Chiron generalizes.

---

## Core thesis (unchanged)

> _Teach first, ship when asked._

`chiron` is a Claude Code plugin that, by default, responds to coding requests with Socratic questions and graduated hints instead of finished code — but never gatekeeps. A single `/ship` turns Claude back into a normal assistant for one turn. A cross-project learner profile in `~/.chiron/profile.json` compounds what the user has struggled with and mastered, so every session starts smarter than the last.

**Name:** `chiron` (pronounced _KAI-ron_, hard K — the centaur who mentored Achilles, Hercules, Jason, Asclepius).
**Tagline:** _"Every function you write becomes a drill you can practice."_
**Alt tagline:** _"Claude Code that teaches you, instead of shipping past you."_
**Vocabulary:** use "mentor" consistently. Not _teacher_, not _coach_.

---

## Architecture — three layers, one job each

The original plan had output-style, skill, subagent, and hook all fighting for the same behavior. Revised layering:

| Layer                                             | Single responsibility                                                   | Default state                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| **Output style** (`output-styles/chiron.md`)      | Socratic voice and default response shape                               | Active when user runs `/output-style chiron`     |
| **`chiron-core` skill**                           | Decision tree, hint ladder, idiom transfer, profile read/write          | Activates on coding-request keywords             |
| **`chiron-reviewer` subagent**                    | Review-as-mentor on code the _user_ wrote                               | Invoked explicitly or via `/explain`             |
| **Pre-edit hook** (`hooks/pre-edit-intercept.sh`) | Hard guardrail that blocks `Write`/`Edit` and forces Socratic interrupt | **OFF** by default. `/level strict` turns it on. |

**Critical inversion from the original plan:** the hook is opt-in, not opt-out. A hook that intercepts every `Edit` by default will break agentic multi-step flows (plan execution, test-fix loops, multi-file refactors) within the first session and get the plugin uninstalled. The output style + skill combination is enough for teach-mode to feel present without blocking the tool calls Claude needs to actually function.

`idiom-scout` as a standalone subagent is **cut**. Background subagents are either too noisy or never fire, and idiom-flagging folds naturally into `chiron-core`'s review behavior.

---

## v0.1 MVP — four components, one killer demo

Scope down from 10 features to 4. Everything else is v0.2+.

| #   | Component                                        | Why it's in MVP                                                                                                   |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 1   | `chiron` output style + `chiron-core` skill      | The voice and decision tree. Without these, nothing else means anything.                                          |
| 2   | `hint-ladder` skill + `/hint` + `/ship` commands | The core loop and escape hatch. Validates the teach-first hypothesis.                                             |
| 3   | `/challenge` command                             | **The hero feature.** Generates drills from the user's own code. This is the one thing no other mentor tool does. |
| 4   | Go language pack (`skills/languages/go.md`)      | One pack, deeply done, in the language the primary user (Dido) already knows well enough to dogfood and debug.    |

**Not in v0.1:** `/explain`, `/postmortem`, `/tour`, `/level` dial, `chiron-reviewer` subagent, remaining 4 language packs, hook, session-start automation. These land in v0.2 after the v0.1 loop has been validated in real use for two weeks.

**Note on the profile.** `~/.chiron/profile.json` is not in the v0.1 ship list as a _feature_, but the skill writes to it from day one (append-only struggle/success log) so that v0.2's `/postmortem` and session-start have real data to work with when they land. Writing without reading is cheap and preserves the option.

---

## The hero feature: `/challenge`

Promoted from #4 to #1. Rationale: language idioms are already in Claude's training weights — a `rust.md` pack is ~10% marginal value over what Claude already knows. Drills generated from the _user's actual code_ are genuinely novel. Nothing else in the Claude Code ecosystem does this.

**Behavior:**

1. User runs `/challenge` (optionally scoped to a file or function).
2. `chiron-core` reads the current file, identifies 1–3 specific, grounded practice targets (e.g., _"line 42 calls `Vec::clone` three times — write a version that avoids the clones and explain the borrow you introduced"_).
3. Drills are concrete, short (5–15 minutes each), and tied to an idiom from the relevant language pack.
4. User attempts the drill; Chiron grades with a hint-ladder response, not a full solution.
5. Drill outcome (attempted / solved / gave up) is logged to `~/.chiron/profile.json`.

**Demo GIF target (split hero, two ~30s clips side-by-side in the README):**

- **Clip A — Socratic walkthrough.** Reproduces the opening of the golden transcript: user asks for a Go fan-out, Chiron asks three clarifying questions, offers an L1 hint, hands back a signature with blanks. Establishes the voice and the hint ladder in 30 seconds.
- **Clip B — `/challenge` drill.** User opens a Go file with a clone/allocation-heavy helper, runs `/challenge`, Chiron generates a drill grounded in specific lines of the actual file, user edits, Chiron grades with an L1 hint, user fixes, Chiron confirms and notes the idiom. Establishes the one mechanic no other tool has.

Clip A sells the philosophy. Clip B sells the novelty. Together they make both arguments: _"it teaches you"_ and _"it drills you on your own code."_

---

## Golden transcript (the spec)

Every behavior in v0.1 must be derivable from this one example. Write this first, build backward from it. This is a sketch — finalize before touching skill files.

```
$ claude
> I need a Go function that fans out N workers on a channel and collects results.

[chiron] Before we write it — a few questions that matter more than the code:

  1. Is N bounded? If yes, a fixed worker pool. If no, you probably don't
     want unbounded goroutines.
  2. What does "collects results" mean — do you need order preserved, or
     just every result eventually?
  3. What happens on error in one worker? Cancel the others, or keep going?

Answer any one and I'll take the next step with you. Or run `/hint` for an
L1 nudge, or `/ship` if you just need the code.

> bounded N=8, order doesn't matter, one error cancels all

[chiron] Good. That gives you three primitives to reach for from the stdlib.
Think about which one fits each concern:

  - bounded fan-out of N workers  →  ?
  - collecting results from many senders  →  ?
  - cancelling siblings on first error  →  ?

Hint: one of these is in `golang.org/x/sync`, not the stdlib proper.

> errgroup for the third one I think? not sure about the others

[chiron] Yes — `errgroup.Group` with `WithContext` gives you the
cancel-on-first-error for free. That's the hardest of the three.

For the other two: you already know one answer and just haven't said it.
What's the idiomatic Go primitive for "many-to-one communication"?

> channel

[chiron] Right. So the shape is: errgroup for lifecycle, a buffered result
channel for collection. The worker pool itself is just `g.Go` called 8
times in a loop. Want to try a first draft, or should I hand you a
signature to fill in?

> signature please

[chiron]
    func fanOut(ctx context.Context, inputs []Task) ([]Result, error) {
        g, ctx := errgroup.WithContext(ctx)
        results := make(chan Result, len(inputs))
        // TODO: start 8 workers, each reading from `inputs` and writing
        //       to `results`. Respect ctx.Done().
        // TODO: after workers finish, close results and drain.
        return collected, g.Wait()
    }

Two blanks. Fill them in and I'll review.

> [writes solution]

[chiron] Runs. One thing to notice: you ranged over `inputs` inside each
goroutine, which means every worker processes every input. That's a
classic fan-out bug — the workers need a *shared* source. Want an L1
hint, or want to see the fix?

> hint

[chiron] The shared source is itself a channel. Workers read from it; the
main goroutine writes `inputs` into it and closes it. This is the
canonical Go worker-pool shape. Try the rewrite.

> [fixes it]

[chiron] Good. That's idiomatic. Two things worth saving for next time:
  - errgroup.WithContext is the go-to for "cancel siblings on error"
  - worker pools use a shared input channel, not ranging inside each goroutine

Run `/challenge` if you want a drill on the same pattern with a twist.
```

This transcript is the acceptance test for v0.1. If the built plugin can't produce something close to it, the build is not done.

---

## Anti-patterns (explicit scope guardrails)

Chiron must **not**:

1. **Moralize.** No "you should learn more!" No guilt trips. No "if you'd read the docs…"
2. **Refuse `/ship`, ever.** Even in `/level strict`, `/ship` is the ceiling escape and must always work.
3. **Interrupt debugging loops.** If the user is in a test-fix or stack-trace-investigation flow, Chiron stays out of the way until the loop completes.
4. **Pollute code, commits, PRs, or comments with teaching content.** Lessons belong in the chat, never in the artifact.
5. **Insert unsolicited lessons during unrelated work.** Migrations, dependency bumps, config edits, formatting changes — Chiron is silent unless explicitly invoked.
6. **Count one clarifying question as "stuck".** Productive-struggle escalation requires genuine repeated confusion, not a single follow-up.
7. **Override a user's CLAUDE.md / AGENTS.md.** User instructions always win. Chiron's behaviors are _defaults_, not commands. State this explicitly in the README.
8. **Ship more than one "taste" comment per review.** Reviews flag correctness and idioms, plus at most one aesthetic opinion.

---

## Fixes to inconsistencies in the original plan

- **`/level strict` now means "default refuses, `/ship` always overrides"** — not "never ships." Resolves the contradiction with "never refuse work."
- **One vocabulary word: _mentor_.** Not teacher, not coach.
- **Pronunciation footnote in README:** KAI-ron.
- **CLAUDE.md precedence explicitly documented** in README and `chiron-core` skill.
- **"User is stuck" heuristic is model-judged** ("if the user's last two messages expressed confusion or repeated the same question"), not counter-based. Stateless, works without a session log.

---

## Critical files for v0.1

| File                                  | Purpose                                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `.claude-plugin/plugin.json`          | Plugin manifest                                                                                       |
| `README.md`                           | Split hero GIFs (Socratic walkthrough + `/challenge`), install, philosophy, CLAUDE.md precedence note |
| `output-styles/chiron.md`             | Socratic voice, default response shape                                                                |
| `skills/chiron-core/SKILL.md`         | Decision tree, profile read/write, anti-patterns, CLAUDE.md precedence                                |
| `skills/hint-ladder/SKILL.md`         | L0–L4 protocol                                                                                        |
| `skills/languages/go.md`              | Initial language pack (5 idioms, 5 pitfalls, mental-model deltas, stdlib tour, challenge seeds)       |
| `skills/languages/_template.md`       | Community contribution template                                                                       |
| `commands/ship.md`                    | Escape hatch, one turn                                                                                |
| `commands/hint.md`                    | Advance one rung on the ladder                                                                        |
| `commands/challenge.md`               | Generate drills from current file — the hero                                                          |
| `docs/CONTRIBUTING-LANGUAGE-PACKS.md` | One-file-PR contribution guide                                                                        |
| `docs/GOLDEN-TRANSCRIPT.md`           | The spec transcript, checked into the repo                                                            |

**Files NOT in v0.1** (clearly marked deferred in the README roadmap section): `commands/{explain,postmortem,tour,level}.md`, `agents/chiron-reviewer.md`, `hooks/*`, remaining language packs, session-start automation.

Reference: Claude Code plugin reference at `code.claude.com/docs/en/plugins-reference` for manifest schema and component conventions.

---

## Build sequence

Each step produces a demoable artifact. Do not proceed to step N+1 until step N's demo works.

1. **Manifest + README skeleton + golden transcript checked in.** The transcript is the contract.
2. **`chiron` output style.** Demo: `/output-style chiron` changes voice for any coding question. Must match the transcript's tone.
3. **`chiron-core` skill (decision tree only, no profile yet).** Demo: ask for a function, Chiron asks questions instead of writing it. Must match the first two turns of the golden transcript.
4. **`hint-ladder` skill + `/hint` command.** Demo: `/hint` advances one rung. Must reproduce the L1 hint turn from the transcript.
5. **`/ship` command.** Demo: `/ship` produces normal Claude output for exactly one turn.
6. **`skills/languages/go.md` language pack.** Demo: Chiron references a Go-specific idiom during a teaching turn.
7. **`/challenge` command.** Demo: the hero GIF. End-to-end drill generation from a real file.
8. **Profile write-only logging to `~/.chiron/profile.json`.** Demo: after a session, `cat ~/.chiron/profile.json` shows the struggle/success log. (No read loop yet — that's v0.2.)
9. **`_template.md` + `CONTRIBUTING-LANGUAGE-PACKS.md`.** Demo: an outside contributor can follow the guide and open a valid pack PR.

---

## Verification (end-to-end test plan for v0.1)

1. **Install from local path** via Claude Code plugin install. `plugin.json` validates. Plugin appears in `/plugins` list.
2. **Activate output style**: `/output-style chiron`. Voice changes.
3. **Reproduce the golden transcript.** Start a new session, paste the opening prompt ("I need a Go function that fans out N workers..."), walk through each turn. Chiron's responses must match the transcript in _shape_ (questions before code, L1 hint on request, signature-with-blanks handoff, idiom callout at the end). Exact wording will vary; the structure must not.
4. **`/ship` test.** Mid-transcript, run `/ship` with a follow-up coding request. Claude responds normally for one turn, then reverts to Chiron behavior next turn.
5. **`/hint` test.** Mid-question, run `/hint`. Chiron advances one rung on the ladder (L0 → L1 → L2...).
6. **`/challenge` test.** Open a real Go file from another project. Run `/challenge`. Verify that:
   - The generated drill references specific lines/functions from the file (not generic).
   - The drill is 5–15 minutes of work, not a rewrite.
   - It maps to an idiom from `skills/languages/go.md`.
7. **Profile write test.** Complete a session. `cat ~/.chiron/profile.json` — verify struggle/success entries exist, JSON is valid, file is local-only.
8. **CLAUDE.md precedence test.** Create a test repo with `CLAUDE.md` containing _"Do not use Socratic questioning. Just write the code."_ Start a session, ask for a function. Chiron must defer to CLAUDE.md and write the code normally. (This is the acceptance test for the anti-patterns rule on user-instruction precedence.)
9. **Anti-pattern: no code pollution.** Inspect all edits Chiron makes during testing — no teaching content in comments, docstrings, or commit messages.
10. **Anti-pattern: no debug-loop interruption.** Trigger a test failure, let Chiron enter a fix loop. Verify Chiron doesn't switch into teach-mode mid-loop.

If all 10 pass, v0.1 ships. If any fail, fix before release.

---

## Out of scope for v0.1 (explicit deferrals)

Documented in the README roadmap so contributors know what's coming and don't re-propose it:

- `/explain`, `/postmortem`, `/tour`, `/level` commands
- `chiron-reviewer` subagent
- `pre-edit-intercept` hook (opt-in, arrives with `/level strict`)
- `session-start` hook (arrives when profile read-loop is built)
- Remaining 4 language packs (Rust, TypeScript, Python, Zig) — community contributions welcomed via `_template.md`
- Idiom-scout behavior (folded into `chiron-core` review, no standalone agent)
- Profile read-loop (session-start reads profile → feeds into context) — scheduled for v0.2
