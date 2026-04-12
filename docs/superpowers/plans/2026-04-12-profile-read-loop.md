# Profile Read-Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Teach `/challenge` and `/postmortem` to read `~/.chiron/profile.json` (which `/challenge` already writes) and use that history to inform drill selection and session reviews.

**Architecture:** Two SKILL.md files modified. No schema changes, no new files, no build system changes. Profile read is best-effort with silent fallback on missing/corrupt data.

**Tech Stack:** Markdown (SKILL.md files), bun (build script), git

---

## Context

`~/.chiron/profile.json` has been written by `/challenge` since v0.1 but never read by any skill. The file contains an append-only log of drill outcomes across all chiron sessions. Reading it enables:

1. **Recurring weakness detection** — tags appearing 2+ times with `drill_attempted` or `drill_gaveup` signal patterns the user struggles with
2. **Mastery tracking** — recent `drill_solved` entries signal patterns to avoid re-drilling
3. **Cross-session trend scoring** — `/postmortem` can ground scores in longitudinal data, not just the current conversation
4. **Explicit history callouts** — `/challenge` can say *"you've missed this pattern before — here's a focused drill"* instead of picking silently

This is the Reflexion analog from dair-ai/prompt-engineering-guide: persistent memory across episodes enables targeted learning.

## Design Decisions (locked)

- **Weakness threshold:** 2+ failures on same tag (not 3+)
- **Recency weighting:** Last 30 days at full weight, older at 50%
- **Missing/corrupt profile:** Silent fallback, skill works normally
- **Read-only contract:** `/postmortem` reads but doesn't write (preserves v0.3.0 contract)
- **Never-refuse preserved:** Profile bias is a suggestion, not a gate
- **Scope:** `/challenge` + `/postmortem` only — `/chiron` intentionally unchanged

---

## File Map

```
source/skills/
├── challenge/SKILL.md        # MODIFY — add Step 0.5 profile read, bias Step 4-6, callout in Step 6
└── postmortem/SKILL.md       # MODIFY — add profile read + cross-session trends section
```

---

### Task 1: Add profile read to /challenge

**Files:**
- Modify: `source/skills/challenge/SKILL.md`

**Rationale:** `/challenge` already writes profile.json in Step 8. Adding a read path in Step 0.5 enables drill selection to benefit from learning history without changing the write path.

- [ ] **Step 1: Add Step 0.5 — Load profile (between Step 0 and Step 1)**

After the Step 0 block (loading `.chiron-context.md`) and before Step 1 (target resolution), insert this new step:

```markdown
## Step 0.5 — Load learning profile (best-effort)

Read `~/.chiron/profile.json` if it exists. Parse the JSON. Extract entries relevant to this session:

1. **Filter by language/domain:** Only entries whose `tag` starts with the current file's language (e.g., `go:*` for Go files) or a loaded concept pack's domain (e.g., `db:*`, `api:*`).
2. **Filter by recency:** Entries from the last 30 days count at full weight. Older entries count at half weight.
3. **Build a weakness map:** For each tag, count `drill_attempted` + `drill_gaveup` as failures, `drill_solved` as successes. A tag is a **recurring weakness** if failures ≥ 2 (weighted) AND the ratio of failures to total attempts is > 0.5.
4. **Build a mastery set:** Tags with 2+ recent `drill_solved` and zero recent failures are considered "mastered — avoid re-drilling."

**Error handling (silent fallback):**
- File does not exist → empty weakness map, empty mastery set, proceed normally
- File is not valid JSON → log nothing, empty maps, proceed normally
- File has unexpected schema → empty maps, proceed normally
- File is too large (>500 entries) → read last 200 entries only

Never crash on bad profile input. Never block drill generation waiting for profile data. The weakness map and mastery set are optional inputs to Steps 4–6 — missing profile just means no bias.
```

- [ ] **Step 2: Bias Step 4 seeded pass toward weaknesses**

In Step 4 — Seeded pass, after the existing instructions for matching seeds, add:

```markdown
**Profile bias (when weakness map is non-empty):**

After finding candidate matching seeds, re-rank them:

1. **Prioritize weakness matches:** Seeds whose tag appears in the weakness map are promoted to the top. If 3+ seeds match and 1+ is a weakness, pick the weakness one first, then fill with 1-2 non-weakness matches.
2. **Skip mastered patterns:** Seeds whose tag is in the mastery set are deprioritized. Only include a mastered pattern if no other seeds match (no alternative available).
3. **Fall through to eyeball:** If all matching seeds are mastered AND no weaknesses exist in the file, proceed to Step 5 (eyeball fallback) rather than re-drilling a mastered pattern.

The bias is a preference, not a requirement. If the user explicitly requests a specific pattern (*"drill me on X"*), honor it regardless of mastery status.
```

- [ ] **Step 3: Add history callout to Step 6 drill presentation**

In Step 6 — Present drills, after the drill format block and before "**Style rules:**", add:

```markdown
**History callout (when a presented drill targets a recurring weakness):**

If any of the presented drills has a tag that appears in the weakness map, lead the response with a one-line callout naming the history:

> *I see you've marked `<tag>` as attempted/gaveup <N> times in past sessions. This file has the pattern — here's a focused drill on it.*

Format rules:
- One sentence, no moralizing, no *"you should have learned this by now"*
- State the fact plainly: count of past attempts, the pattern name
- Lead with the callout, then present the drill(s) in the normal format
- Only callout one weakness per response — if multiple drills hit weakness patterns, pick the most-failed one for the callout
- Never show the full profile history — just the relevant tag and count
```

- [ ] **Step 4: Verify the edits**

Run: `grep "Load learning profile\|Profile bias\|History callout" source/skills/challenge/SKILL.md`
Expected: all three phrases appear.

- [ ] **Step 5: Commit**

```bash
git add source/skills/challenge/SKILL.md
git commit -m "feat(challenge): read ~/.chiron/profile.json for drill biasing

Adds Step 0.5 profile load, Step 4 weakness-biased seed ranking,
and Step 6 history callouts for recurring weakness patterns.
Silent fallback on missing/corrupt profile. Read-only access.
Never-refuse invariant preserved — profile bias is a suggestion,
not a gate.

Based on Reflexion pattern (Shinn et al., 2023) adapted for
chiron's deliberate-practice drill system."
```

---

### Task 2: Add profile read to /postmortem

**Files:**
- Modify: `source/skills/postmortem/SKILL.md`

**Rationale:** `/postmortem` scores the current session across 5 axes. Profile data enables cross-session trend scoring grounded in longitudinal evidence rather than just one conversation. Stays read-only — no writes to profile.json.

- [ ] **Step 1: Read current postmortem structure**

Read `source/skills/postmortem/SKILL.md` to find where to insert profile integration. The new section should go between "Self-verification loop" (already exists from earlier work) and "Response format".

- [ ] **Step 2: Add profile-informed trends section**

Insert this new section after "Self-verification loop" and before "Response format":

```markdown
## Profile-informed trends (optional)

Read `~/.chiron/profile.json` if it exists. This is a **read-only** operation — `/postmortem` never writes to the profile.

When profile data is available, use it to ground scoring in longitudinal evidence rather than only the current conversation:

**1. Filter recent history:** Last 30 days of entries, grouped by tag.

**2. Identify trend signals:**
- **Recurring weakness:** Tags with 2+ `drill_attempted` or `drill_gaveup` in the window
- **Emerging mastery:** Tags with 2+ `drill_solved` in the window and no recent failures
- **Language/domain focus:** Which languages/domains has the user practiced most in the window?

**3. Integrate into scoring:** Use trend signals to refine the 5 axis scores where relevant:

- **Idioms axis:** If the current session touched a tag that's a recurring weakness in profile data, the idioms score reflects both the current evidence AND the historical pattern. Example: *"Idioms 6/10 — the current session used `errgroup.WithContext` correctly, but profile history shows 3 missed attempts on this pattern over the last 2 weeks, so the grasp is still developing."*
- **Engineering maturity axis:** Emerging mastery (profile shows recent improvement on a tag) counts positively: *"Maturity 8/10 — accepted feedback on ctx shadowing immediately, and profile shows this is the first session where that pattern was solved cleanly."*

**4. Surface trend callouts in the session summary (at most one per session):**

If a profile-backed trend is genuinely relevant to the current session, mention it in the Session line:

> *Session: Implemented fan-out worker pool with errgroup. Profile note: this is your third session touching `go:errgroup-with-context` and your first clean solve.*

Rules:
- **One trend mention per session max** — more is noise
- **Only if genuinely relevant** — don't force a trend callout if the current session doesn't intersect with profile data
- **No moralizing** — state the trend as fact, not judgment (*"third session"* not *"finally solved it"*)
- **Never shame history** — past failures are data, not character flaws

**Error handling (silent fallback):**
- Profile file missing or corrupt → no trend data, score only on current conversation, no trend callouts
- No relevant trend signals (all tags are one-off) → score only on current conversation, no trend callouts

**Read-only invariant:** Never write to profile.json from `/postmortem`. The file is owned by `/challenge`'s Step 8.
```

- [ ] **Step 3: Update the response format to note trend integration**

In the "Response format" section of postmortem/SKILL.md, after the example output, add a note:

```markdown
**Profile trend integration (when applicable):** When profile data exists and contains relevant trends, the Session line may include a one-sentence trend note (see "Profile-informed trends" section above). The 5 scores may cite longitudinal evidence alongside current-session evidence. This enhances accuracy without adding output length.
```

- [ ] **Step 4: Verify the edits**

Run: `grep "Profile-informed trends\|Profile trend integration" source/skills/postmortem/SKILL.md`
Expected: both phrases appear.

- [ ] **Step 5: Commit**

```bash
git add source/skills/postmortem/SKILL.md
git commit -m "feat(postmortem): read ~/.chiron/profile.json for cross-session trends

Adds profile-informed trends section that uses longitudinal drill
history to refine the 5 axis scores. Surfaces at most one trend
callout per session. Read-only — postmortem never writes to profile.
Silent fallback on missing/corrupt profile.

Preserves the v0.3.0 read-only contract: postmortem reads but never
persists scores."
```

---

### Task 3: Build, verify, commit, push

**Files:**
- None modified — verification only

- [ ] **Step 1: Run the build**

Run: `bun scripts/build.js`
Expected output: `Found 11 source skills`, 13 platforms built, 143 files total.

- [ ] **Step 2: Verify new sections in built output**

Run: `grep -l "Load learning profile" .claude/skills/challenge/SKILL.md`
Expected: file listed.

Run: `grep -l "Profile-informed trends" .claude/skills/postmortem/SKILL.md`
Expected: file listed.

- [ ] **Step 3: Verify no unresolved placeholders in edited skills**

Run: `grep "{{pack_path}}\|{{command_prefix}}\|{{config_files}}" .claude/skills/challenge/SKILL.md .claude/skills/postmortem/SKILL.md`
Expected: no matches.

- [ ] **Step 4: Commit build output**

```bash
git add docs/superpowers/plans/2026-04-12-profile-read-loop.md .claude/ .cursor/ .gemini/ .codex/ .opencode/ .agents/ .kiro/ .pi/ .openai/ .trae/ .trae-cn/ .rovodev/ .github/skills/
git commit -m "build: distribute profile read-loop to all 13 platforms"
```

- [ ] **Step 5: Push to remote**

```bash
git push origin main
```

---

## Self-review

**Spec coverage:** Task 1 covers the `/challenge` integration (Step 0.5 read, Step 4 biasing, Step 6 callouts). Task 2 covers the `/postmortem` integration (trends section, response format note). Task 3 covers build + push.

**Placeholder scan:** No TBD/TODO/implement-later patterns. Every step has concrete markdown content.

**Invariant preservation:**
- ✅ Never-refuse rule preserved (profile bias is a suggestion, not a gate)
- ✅ No artifact pollution (all additions are chat-only instructions)
- ✅ User instructions always win (no override of config files)
- ✅ Silent fallback on missing/corrupt profile
- ✅ `/postmortem` stays read-only (only reads profile, never writes)
- ✅ No moralizing (trend callouts state facts, not judgments)
- ✅ No shaming of history (past failures are data)

**Type consistency:** All references to profile.json fields (`tag`, `kind`, `ts`, `note`) match the existing schema in `/challenge` Step 8. No new fields introduced.

## Verification

1. `bun scripts/build.js` must succeed with 11 skills × 13 platforms = 143 files
2. New sections must appear in built `.claude/skills/challenge/SKILL.md` and `.claude/skills/postmortem/SKILL.md`
3. No unresolved `{{placeholder}}` tokens in edited skills
4. git log shows 2 source commits + 1 build commit + push to main
