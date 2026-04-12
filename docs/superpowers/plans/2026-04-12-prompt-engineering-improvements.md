# Prompt-Engineering-Guide Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply three techniques from dair-ai/prompt-engineering-guide research to chiron: self-consistency grading, active-prompt uncertainty detection, and context engineering audit.

**Architecture:** Three independent enhancements across chiron's existing skills. No new files, no new reference docs, no schema changes. All changes are inline additions to existing SKILL.md files.

**Tech Stack:** Markdown (SKILL.md files), bun (build script), git

---

## File Map

```
source/skills/
├── challenge/SKILL.md        # MODIFY — add self-consistency grading (Phase 1)
├── chiron/SKILL.md           # MODIFY — add ambiguity detection at L0 (Phase 2)
└── [all 11 SKILL.md files]   # AUDIT + fix drift (Phase 3)
```

Phase 3 may touch any of: chiron, challenge, hint, level, explain, postmortem, tour, teach-chiron, debug, refactor, architect SKILL.md files.

---

### Task 1: Add self-consistency grading to /challenge

**Files:**
- Modify: `source/skills/challenge/SKILL.md` (Step 7 grading section)

**Rationale:** The guide's self-consistency technique (Wang et al., 2022) samples multiple reasoning paths and takes consensus to reduce noise. Applied to grading: the grader runs the evaluation 3 times internally and uses the consensus grade. Pure internal reliability improvement — user sees only the final grade.

- [ ] **Step 1: Read current Step 7 to find insertion point**

Read `source/skills/challenge/SKILL.md` around Step 7 (grade the user's attempt) to locate the existing grade verification section.

- [ ] **Step 2: Add self-consistency section**

Insert this new numbered item in Step 7, after the existing "Grade verification (silent)" item (currently item 6) and before "If the user struggles" (currently item 7):

```markdown
7. **Self-consistency grading (silent).** Before delivering the /10 grade, run the grading evaluation internally **three times**:
   - Pass 1: Score against correctness (4–5 points) + idiom fit (3–4 points) + readability (1–2 points)
   - Pass 2: Re-score independently, as if you hadn't seen pass 1
   - Pass 3: Re-score independently one more time

   **Combine the three scores:**
   - If all three agree (same total /10), use that score
   - If two agree and one disagrees by ≤1 point, use the majority
   - If the three scores diverge by >2 points total, re-examine the constraint — the disagreement signals you're uncertain about what passes. Resolve the disagreement before delivering (re-read the constraint, re-read the user's code, decide firmly).

   This loop improves grading reliability without adding output length. Based on self-consistency research (Wang et al., 2022) — sampling multiple reasoning paths and taking consensus reduces grading noise.
```

Then renumber the remaining items in Step 7 (the old "If the user struggles" becomes item 8 etc.).

- [ ] **Step 3: Verify the file**

Run: `cat source/skills/challenge/SKILL.md | grep -A 1 "Self-consistency grading"`
Expected: the new section appears in the file.

- [ ] **Step 4: Commit**

```bash
git add source/skills/challenge/SKILL.md
git commit -m "feat(challenge): add self-consistency grading to reduce noise"
```

---

### Task 2: Add Active-Prompt ambiguity detection to /chiron

**Files:**
- Modify: `source/skills/chiron/SKILL.md` (hint ladder L0 section)

**Rationale:** Active-Prompt (Diao et al., 2023) uses uncertainty sampling to identify where the model is confused. Applied to chiron: when the user's answer to L0 clarifying questions is vague or multi-interpretable, the skill samples 2-3 interpretations and surfaces them rather than silently picking one and proceeding.

Fires only when ambiguity is detected. Unambiguous answers proceed normally to L1. One cycle only — don't spiral into endless clarification.

- [ ] **Step 1: Read current L0 section**

Read `source/skills/chiron/SKILL.md` around the hint ladder section (after "Teaching scope", before the anti-patterns) to locate the L0 description.

- [ ] **Step 2: Add ambiguity detection subsection**

Insert this new subsection within the hint ladder section, after the L0 description and before the L1 description:

```markdown
### Ambiguity detection at L0 (Active-Prompt)

Before advancing from L0 to L1, check whether the user's answer is **unambiguous enough to act on**. An answer is ambiguous when:

- It's vague about a constraint you asked about ("some data", "a few users", "sometimes")
- It could mean 2+ materially different things that would lead to different solutions
- It uses a term with multiple valid interpretations in context ("cache" could mean in-memory, distributed, or HTTP)

**If the answer is unambiguous:** proceed normally to L1.

**If the answer is ambiguous:** fire **one** clarification cycle. Surface 2–3 interpretations in compact format:

> *Your answer could mean any of these — which fits?*
> *1. [specific interpretation A with concrete example]*
> *2. [specific interpretation B with concrete example]*
> *3. [specific interpretation C with concrete example]*

End with: *"Pick a number, or describe which one fits, or say 'just write it' if you want me to pick."*

**One cycle only.** Never fire ambiguity detection twice in a row — if the user's response to the clarification is still ambiguous, pick the most plausible interpretation and proceed. Endless clarification is a failure mode.

**Never-refuse rule still applies.** If the user says *"just write it"* or *"just pick one"* at any point, immediately advance to L4 with the most plausible interpretation. Based on Active-Prompt research (Diao et al., 2023) — uncertainty-targeted clarification beats uniform questioning.
```

- [ ] **Step 3: Verify the file**

Run: `cat source/skills/chiron/SKILL.md | grep -A 1 "Ambiguity detection"`
Expected: the new section appears in the file.

- [ ] **Step 4: Commit**

```bash
git add source/skills/chiron/SKILL.md
git commit -m "feat(chiron): add Active-Prompt ambiguity detection at L0"
```

---

### Task 3: Context engineering audit of all 11 skills

**Files:**
- Modify: any of `source/skills/*/SKILL.md` (11 files) where drift is found

**Rationale:** The guide identifies five context engineering principles that agent-based systems should follow:
1. **Eliminate ambiguity** — vague instructions yield unpredictable behavior
2. **Make expectations explicit** — specify required vs optional actions, output formats, decision criteria
3. **Implement observability** — design for debugging and tracing
4. **Balance flexibility with constraints** — over-constraint creates inflexibility, under-specification creates drift
5. **Robust error handling** — specify failure recovery

Audit all 11 SKILL.md files against this checklist and fix any drift found.

- [ ] **Step 1: Audit chiron/SKILL.md**

Read `source/skills/chiron/SKILL.md` and evaluate against the 5 principles. Note any drift:
- Vague language where concrete would be better
- Expectations that are implicit but should be explicit
- Missing "what to do when X fails" guidance
- Over-constrained sections that remove useful flexibility
- Under-specified sections that leave too much to interpretation

If drift is found, fix it inline. Keep changes minimal and surgical — this is a polish pass, not a rewrite.

- [ ] **Step 2: Audit challenge/SKILL.md**

Same as Step 1 but for `source/skills/challenge/SKILL.md`.

- [ ] **Step 3: Audit hint/SKILL.md**

Same process for `source/skills/hint/SKILL.md`.

- [ ] **Step 4: Audit level/SKILL.md**

Same process for `source/skills/level/SKILL.md`.

- [ ] **Step 5: Audit explain/SKILL.md**

Same process for `source/skills/explain/SKILL.md`.

- [ ] **Step 6: Audit postmortem/SKILL.md**

Same process for `source/skills/postmortem/SKILL.md`.

- [ ] **Step 7: Audit tour/SKILL.md**

Same process for `source/skills/tour/SKILL.md`.

- [ ] **Step 8: Audit teach-chiron/SKILL.md**

Same process for `source/skills/teach-chiron/SKILL.md`.

- [ ] **Step 9: Audit debug/SKILL.md**

Same process for `source/skills/debug/SKILL.md`.

- [ ] **Step 10: Audit refactor/SKILL.md**

Same process for `source/skills/refactor/SKILL.md`.

- [ ] **Step 11: Audit architect/SKILL.md**

Same process for `source/skills/architect/SKILL.md`.

- [ ] **Step 12: Commit the audit fixes**

```bash
git add source/skills/
git commit -m "refactor(skills): context engineering audit across all 11 skills"
```

If no drift was found in a skill, note it explicitly in the commit body.

---

### Task 4: Build and verify

**Files:**
- None modified — verification only

- [ ] **Step 1: Run the build**

Run: `bun scripts/build.js`
Expected output: `Found 11 source skills`, all 13 platforms built successfully, 143 files total.

- [ ] **Step 2: Verify no unresolved placeholders**

Run grep for `{{pack_path}}`, `{{command_prefix}}`, `{{config_files}}` in `.claude/skills/chiron/SKILL.md` and `.claude/skills/challenge/SKILL.md`. Expected: zero matches (all placeholders resolved).

- [ ] **Step 3: Spot-check new sections appear in built output**

Run: `grep "Self-consistency grading" .claude/skills/challenge/SKILL.md`
Expected: the new section appears.

Run: `grep "Ambiguity detection" .claude/skills/chiron/SKILL.md`
Expected: the new section appears.

- [ ] **Step 4: Commit the build output**

```bash
git add .claude/ .cursor/ .gemini/ .codex/ .opencode/ .agents/ .kiro/ .pi/ .openai/ .trae/ .trae-cn/ .rovodev/ .github/skills/
git commit -m "build: distribute prompt-engineering-guide improvements to all 13 platforms"
```

---

## Self-review

**Spec coverage:** All three techniques from the research are covered — Task 1 (self-consistency), Task 2 (active-prompt), Task 3 (context engineering audit).

**Placeholder scan:** No TBD/TODO/implement-later patterns. Every step has concrete instructions.

**Type consistency:** The two new sections reference research papers (Wang et al. 2022, Diao et al. 2023) already cited in `source/skills/chiron/references/pedagogy.md` — consistent with the existing citation style.

## Invariants Preserved

- **Never refuse to ship** — explicitly reaffirmed in the ambiguity detection section
- **No artifact pollution** — all additions are chat-only instructions
- **Build system compatibility** — no new files, no directory changes
- **Silent fallback** — self-consistency is fully internal, invisible to user
- **Cross-platform** — all edits use established `{{placeholder}}` tokens

## Verification

1. `bun scripts/build.js` must complete without errors
2. New sections must appear in built output for Claude Code (spot-check `.claude/skills/`)
3. No unresolved placeholders
4. git log shows 3 source commits + 1 build commit
