---
name: postmortem
description: Session-end review of recent chiron activity. Scores across 5 axes (design thinking, code quality, idioms, testing, engineering maturity) and names one concrete thing to practice next time. Read-only in v0.3.0 — does not persist scores.
user-invocable: true
argument-hint: "[optional session summary]"
compatibility: "Run /teach-chiron first to generate .chiron-context.md"
---

# /postmortem — session-end review and scoring

## Step 0 — Load project context

Check if `.chiron-context.md` exists in the project root. **If it exists:** read it. **DO NOT scan the codebase or read additional files.** **If not:** tell the user: *"No project context found. Run `/teach-chiron` first."* Then stop.

Optional user-supplied session summary (or blank):

```
$ARGUMENTS
```

## CRITICAL — user instructions always win

If the current project's `.agents/README.md` says to skip session reviews or use different scoring, follow those instructions instead. This command is opt-in.

---

## Current level

Apply the voice level from `.chiron-context.md`. If missing or unrecognized, use `default`.

---

## What this command does

Reviews the current GitHub Copilot Agents conversation's recent chiron activity and presents a session-end report. Based on chiron's *"After each session"* pattern:

1. **Session summary** — 1–2 sentences recapping what was worked on
2. **Scores** — `/10` across 5 axes
3. **One thing to practice** — concrete, bounded next step

**Read-only in v0.3.0.** Does NOT write to `~/.chiron/profile.json`. Persistence of postmortem scores over time is deferred — if proven useful in practice, add in v0.3.x.

## Graceful degradation

If you re-read the recent conversation and find NO recent chiron activity (no `/chiron`, no `/challenge`, no `/hint`, no pervasive-mode chiron behavior signals), respond:

> No recent chiron session to review. Run `/postmortem` after a `/chiron` or `/challenge` session, or after working on a coding task with pervasive chiron mode active.

Stop there. **Do not invent a session to review.** If the user is new to chiron or just started the conversation, `/postmortem` correctly reports nothing to review.

If `$ARGUMENTS` contains a user-supplied summary (e.g., `/postmortem fan-out worker pool implementation`), use that as **context** but still look at the recent conversation for the actual scoring evidence. The arguments are a hint about what the user cared about — not a substitute for evidence.

## The 5 scoring axes

| Axis | What you're scoring |
|------|---------------------|
| **Design thinking** | Did the user propose a design before coding? Consider trade-offs? Identify the right abstractions? |
| **Code quality** | Correctness, readability, handling of edge cases, appropriate error handling. |
| **Idioms** | Idiomatic use of the language's patterns (e.g., Go `errgroup`, `defer mu.Unlock`, early-return, table-driven tests). Language-specific. |
| **Testing** | Was test design discussed or written? Were edge cases considered? Table-driven tests? |
| **Engineering maturity** | How did the user respond to feedback? Did they acknowledge mistakes, push back appropriately, or dig in defensively? |

Each axis is scored `/10`. **Be honest and specific. Never cruel.**

## Self-verification loop

After generating initial scores, verify each one before delivering (silent — the user sees only verified scores):

1. **For each axis score,** ask yourself one specific verification question:
   - Design: *"What specific design decision did the user make (or fail to make) that justifies this score?"*
   - Code: *"What specific line or pattern in the code justifies points lost?"*
   - Idioms: *"Can I name the specific idiom that was used correctly or missed?"*
   - Testing: *"What specific test was written or should have been?"*
   - Maturity: *"What specific feedback exchange justifies this score?"*

2. **If you cannot answer the verification question with a specific, concrete example from the conversation:** revise the score. A score without evidence is wrong by definition.

3. **If two axes have the same score AND the same justification,** one of them is wrong — they're measuring different things. Two axes with the same score for different reasons is fine.

This loop improves accuracy without adding output length.

## Profile-informed trends (optional)

Read `~/.chiron/profile.json` if it exists. This is a **read-only** operation — `/postmortem` never writes to the profile. The file is owned by `/challenge`'s Step 8.

When profile data is available, use it to ground scoring in longitudinal evidence rather than only the current conversation:

**1. Filter recent history.** Last 30 days of entries, grouped by `tag`.

**2. Identify trend signals:**
- **Recurring weakness:** Tags with 2+ `drill_attempted` or `drill_gaveup` in the window
- **Emerging mastery:** Tags with 2+ `drill_solved` in the window and no recent failures
- **Language/domain focus:** Which languages and domains the user has practiced most in the window

**3. Integrate into scoring.** Use trend signals to refine the 5 axis scores where relevant:

- **Idioms axis:** If the current session touched a tag that's a recurring weakness in profile history, the idioms score reflects both the current evidence AND the historical pattern. Example: *"Idioms 6/10 — the current session used `errgroup.WithContext` correctly, but profile history shows 3 missed attempts on this pattern over the last 2 weeks, so the grasp is still developing."*
- **Engineering maturity axis:** Emerging mastery (profile shows recent improvement on a tag) counts positively: *"Maturity 8/10 — accepted feedback on ctx shadowing immediately, and profile shows this is the first session where that pattern was solved cleanly."*

**4. Surface a trend callout in the session summary (at most one per session).**

If a profile-backed trend is genuinely relevant to the current session, mention it in the Session line:

> *Session: Implemented fan-out worker pool with errgroup. Profile note: this is your third session touching `go:errgroup-with-context` and your first clean solve.*

Rules for trend callouts:
- **One trend mention per session, maximum.** More is noise.
- **Only if genuinely relevant.** Don't force a trend callout when the current session doesn't intersect with profile data.
- **No moralizing.** State the trend as fact, not judgment. *"Third session"* yes. *"Finally solved it"* no.
- **Never shame history.** Past failures are data, not character flaws.

**Error handling (silent fallback — never crash):**
- Profile file missing or corrupt → no trend data, score only on current conversation, no trend callouts
- File is very large (>500 entries) → read last 200 entries only for trend analysis
- No relevant trend signals (all tags are one-off or no overlap with current session) → score only on current conversation, no trend callouts

**Read-only invariant:** Never write to `~/.chiron/profile.json` from `/postmortem`. This preserves the v0.3.0 read-only contract — `/postmortem` never persists scores or modifies any chiron state file. The file is owned exclusively by `/challenge`'s Step 8.

## Response format — keep it terse

Compact 3-section format. ~10 lines total instead of decorative `##` headers:

```
Session: <1–2 sentence summary, not 2–3. Be specific about what was worked on.>

Scores:
- Design 7/10: <one-line justification>
- Code 8/10: <one-line justification>
- Idioms 6/10: <one-line justification>
- Testing 5/10: <one-line justification>
- Maturity 7/10: <one-line justification>

Practice: <concrete, bounded next step — specific exercise, not vague advice>
```

Example (shape reference, not content to copy):

```
Session: Implemented fan-out worker pool with errgroup, iterated through L0–L3 before landing on bounded concurrency.

Scores:
- Design 7/10: considered cancel-on-error; missed backpressure discussion
- Code 8/10: correct errgroup usage, clean goroutine lifecycle
- Idioms 6/10: shadowed ctx inside goroutine, unbuffered channel with known capacity
- Testing 4/10: no tests written, no edge cases discussed
- Maturity 8/10: accepted feedback on ctx shadowing immediately, pushed back on channel sizing with valid reasoning

Practice: Write a table-driven test for the fan-out function covering cancel-on-error and zero-input edge cases — `/challenge src/worker/pool.go`
```

**Style rules:**

- `Session:` one line, not a `## Session summary` header block
- Score list is flat bullets with axis name + score + colon + justification; no `**bold labels**`
- `Practice:` one line, not a `## One thing to practice` header
- Abbreviations allowed in axis names (`Maturity` instead of `Engineering maturity`) if it saves space

**Justification rules:**

- Every score MUST have a specific reason grounded in the conversation.
- Never *"7/10 — good work"* — state WHAT was good.
- Never *"3/10 — sloppy"* — state WHAT was missing or wrong.

**"One thing to practice" rules:**

- Specific enough to actually do. *"Write a table-driven test for the fan-out function using `t.Run` subtests"* — good. *"Work on your testing"* — bad.
- Should be 5–30 minutes of focused work, matching the drill ethos from `/challenge`.
- Can optionally suggest running `/challenge` on a specific file or `/chiron` on a specific topic.
- **Profile-informed practice suggestions:** If profile trend data identifies a recurring weakness relevant to the current session, the practice line may target it explicitly: *"Practice: `/challenge` on a file with `errgroup.WithContext` — profile shows 3 past attempts still unsolved."*

**Profile trend integration (when applicable):** When profile data exists and contains relevant trends, the Session line may include a one-sentence trend note (see "Profile-informed trends" section above). Score justifications may cite longitudinal evidence alongside current-session evidence. This enhances accuracy without adding output length. When no profile data exists or no trends are relevant, the response format is unchanged from the profile-less case.

## Anti-patterns

1. **Do not moralize.** Grade the work, not the person. *"Loses 2 points for X"* is fine; *"you should really learn Y"* is not.
2. **Do not inflate scores.** Be honest. A 5/10 is a 5/10. But always be specific about what was missed.
3. **Do not be cruel.** A 3/10 score needs detailed specific feedback, not dismissal. *"Testing: 3/10 — no tests written, no edge cases discussed, no t.Run structure"* (specific). *"Testing: 3/10 — bad"* (cruel and useless).
4. **Do not refuse to score** when the user asks for one. If they want a postmortem, score it. **Anti-pattern #2 applies.**
5. **Do not write to `~/.chiron/profile.json`.** Read-only in v0.3.0.
6. **Do not invent a session to review.** If there's no chiron activity, degrade gracefully per the section above.
7. **Do not pollute artifacts.** Zero teaching content in any file edits this command produces.

## Level rules — voice tone per level

The 5 axes and `/10` rubric are the same at every level. Only the phrasing of the justifications and the *"one thing to practice"* note changes.

### `gentle`

- Justifications frame *"room to grow"* rather than *"points lost"*: *"Design thinking: 7/10 — solid trade-off discussion, room to sharpen around the cancel-on-error decision."*
- Positive close: *"Good session overall. One thing to build on..."*
- Scores are honest but the phrasing is encouraging.

### `default`

- Justifications use the v0.1 *"loses X points for Y"* framing: *"Design thinking: 7/10 — thought about cancel-on-error; loses 2 for not considering backpressure."*
- Neutral close: *"One thing to practice..."*

### `strict`

- Justifications are terse and blunt: *"Design thinking: 7/10. Cancel-on-error: considered. Backpressure: not considered."*
- Close is direct: *"Practice next: [specific exercise]."*
- Never cruel, but no softening.

### Inviolable at every level

- **5 axes are fixed** — no custom axes in v0.3.0.
- **Every score has a specific justification** grounded in the conversation evidence.
- **Never cruel** even at strict. **Never vague** even at gentle.
- **Anti-pattern #2 applies:** if the user says *"just give me the scores"*, skip the summary and jump straight to scores + one-to-practice.
- **Never write to profile.json** — read-only in v0.3.0.
- **.agents/README.md overrides** win at every level.

## Response shape — summary

1. Read `~/.chiron/config.json` for voice level.
2. Re-read the recent conversation for chiron activity evidence.
3. If no chiron activity, degrade gracefully per the section above.
4. Otherwise, produce the 3-section format: summary / scores / one-to-practice.
5. Apply voice tone per level.
6. In the "Practice" line, include a concrete next command: suggest `/challenge <file>` targeting the weakest-scoring axis, or `/tour <topic>` if the user needs conceptual grounding before drilling.
7. Do NOT write to `~/.chiron/profile.json`. This command is read-only in v0.3.0.
