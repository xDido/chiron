# chiron roadmap: 0 → v0.1 MVP

This roadmap tracks chiron's path from empty repo to v0.1.0 public release. Updated as work completes.

**Current status:** Phase 4 — Verification (next)

---

## Phase 0 — Planning ✅

- [x] Original draft plan written
- [x] Refinement rounds (solo → public-distribution → command-only architecture)
- [x] Brainstorming — 6 decisions locked
  - Idiom definition = named patterns (stdlib + architectural + design + anti-patterns)
  - Voice = A+B blend (strict content, neutral framing)
  - `/challenge` mechanism = seeded patterns + eyeball fallback
  - Coexistence = opt-in only (no auto-trigger)
  - Voice for public = A+B kept as-is; README self-selects users
  - Failure modes = 4 rules (disengagement, implausible answer, topic shift, ungradable drill)
- [x] Pre-implementation cross-checks — revealed skill auto-trigger is unavoidable and output-styles are unverified; architecture pivoted to commands-only
- [x] Implementation plan finalized

**Exit criteria met:** Every v0.1 decision has a rationale; file layout, schemas, and build sequence are concrete.

---

## Phase 1 — Foundation (in progress)

Scaffolding the repo so it's buildable and contributable from day one.

- [x] `.claude-plugin/plugin.json` — verified schema (author as object, no `components` field)
- [x] `LICENSE` — MIT
- [x] `README.md` — skeleton (philosophy, install, 3 commands, pervasive-mode recipe, roadmap, GIF placeholders)
- [x] `CONTRIBUTING.md`
- [x] `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1 (condensed)
- [x] `.github/ISSUE_TEMPLATE/bug.md`
- [x] `.github/ISSUE_TEMPLATE/language-pack.md`
- [x] `ROADMAP.md` — this file
- [x] `docs/GOLDEN-TRANSCRIPT.md` — the v0.1 acceptance contract
- [x] `tests/golden/fan_out_transcript.md` — CI reproducibility copy
- [x] Scaffolding committed (commit `03a62b7` "repo boilerplate")
- [x] Phase 1 follow-up committed (commit `cb2c5f5` "phase 1: golden transcript and roadmap")

**Phase 1 complete ✅**

**Exit criteria:** Repo is scaffolded, the golden transcript contract is committed, everything below can be built against it.

---

## Phase 2 — Commands (in progress)

The three opt-in entry points chiron offers to users. Each command file is self-contained: voice directive, decision tree, anti-patterns, and failure-mode rules are inlined to avoid the skill auto-trigger problem.

- [x] `commands/chiron.md` — `/chiron <request>` — Socratic voice for a single coding request. Inlines voice (A+B blend), decision tree, L0–L4 ladder, anti-patterns, 4 failure-mode rules.
- [x] `commands/hint.md` — `/hint` — stateless rung advancer. Re-reads the most recent turn, identifies current rung, emits the next one.
- [x] `commands/challenge.md` — `/challenge <file>` — hero drill generator. Seeded pass, eyeball fallback. Grades attempts with `/10`. Writes to `~/.chiron/profile.json`.
- [x] **Post-review corrections applied** — tightened `/chiron` decision tree step 4 ("already knows" criterion), dropped `/10` threshold from `drill_solved` (constraint-pass only). See `plans/mossy-crunching-hopcroft.md` for the rationale.
- [x] Phase 2 committed (commit `ef71c2f` "phase 2: command entry points")

**Phase 2 complete ✅**

---

## Phase 3 — Go language pack (in progress)

The initial language. Enables `/challenge` to work on Go code and validates the pack contribution shape for future languages. Scope expanded from the original "5 idioms + 5 anti-patterns" to **comprehensive** per user request.

- [x] `docs/languages/go.md` — human-readable source
  - 12 stdlib anchors + 4 meta-resources (Effective Go, Go Proverbs, Go Memory Model, Code Review Comments)
  - **30 idioms** (15 stdlib primitives, 5 architectural patterns, 10 design principles)
  - **25 anti-patterns** across 6 categories (concurrency, error handling, resource handling, type/interface, tests, package structure)
  - **25 mental-model deltas** for engineers coming from C-family languages
  - **16 challenge seeds** with full Signal + Drill format
- [x] `tests/fixtures/go/worker_pool_bad.go` — hero fixture compiling as real Go code, documents 4 intentional bugs matching seeds (`go:shared-input-channel`, `go:goroutine-leak`, unbuffered channel coordination, `go:errgroup-with-context`)
- [x] Seeds + idiom tag list inlined into `commands/challenge.md` as `# Go language pack (inlined)` section — runtime source of truth
- [x] `commands/challenge.md` step 3 updated to reference the inlined section instead of trying to load `docs/languages/go.md` at runtime
- [x] `docs/languages/_template.md` — community contribution template for future languages
- [x] `docs/CONTRIBUTING-LANGUAGE-PACKS.md` — detailed authoring guide (step-by-step, quality bar, seed-writing tips, testing procedure)
- [x] Phase 3 committed (commit `21bbd4e` "phase 3: Go language pack (comprehensive)")

**Phase 3 complete ✅**

**Exit criteria met:** the command file is fully self-contained (no runtime file-loading dependencies). `/challenge tests/fixtures/go/worker_pool_bad.go` should produce concrete drills grounded in specific lines — this is verified end-to-end in Phase 4.

---

## Phase 4 — Verification

The 13-test verification plan must pass before tag-and-release.

- [ ] 1. Install from local path succeeds; plugin appears in `/plugins` list
- [ ] 2. **No-auto-trigger test** — fresh session, no chiron command typed, normal coding request → chiron does not interrupt
- [ ] 3. `/chiron` activation test
- [ ] 4. `/hint` rung advancement test
- [ ] 5. `/challenge` seeded drill test on hero fixture
- [ ] 6. Golden transcript reproduction end-to-end
- [ ] 7. Profile write schema validation (valid JSON, UUID install_id, all required fields)
- [ ] 8. CLAUDE.md precedence test (user instructions override chiron behavior)
- [ ] 9. No artifact pollution test (zero teaching content in commits/comments/docs)
- [ ] 10. Failure mode tests (disengagement, topic shift, implausible answer, ungradable drill)
- [ ] 11. **No-conflict test** — installed alongside `superpowers`, plain coding request does not fire chiron
- [ ] 12. Cross-platform smoke test on ≥2 of {Linux, macOS, Windows-bash}
- [ ] 13. Install-ID portability test

**Exit criteria:** All 13 tests pass. Plugin is behaviorally correct.

---

## Phase 5 — Public release

Ship v0.1.0.

- [ ] Hero GIFs recorded
  - Clip A: `/chiron` Socratic walkthrough (matches the golden transcript opening)
  - Clip B: `/challenge` drill on `worker_pool_bad.go`
- [ ] README finalized with GIFs embedded and install URL verified
- [ ] GitHub repo created under chosen owner account
- [ ] Initial push to `main`
- [ ] Git tag `v0.1.0`
- [ ] GitHub Release created with changelog

**Exit criteria:** `https://github.com/<owner>/chiron` exists publicly, v0.1.0 release is visible, README renders correctly on GitHub with working install instructions and hero GIFs.

**🎯 MVP COMPLETE when Phase 5 exit criteria are met.**

---

## Post-MVP — Validation gate → v0.2 planning

After v0.1.0 ships, chiron must pass a validation gate before any v0.2 work begins. The gate catches "cute but unused" features before adding more surface area.

### Self-dogfood (required)

- [ ] Maintainer uses chiron for ≥10 non-trivial sessions over 2 weeks on real work
- [ ] Maintainer learns ≥3 Go idioms from chiron sessions that they can explain without looking up

### Public signal (≥1 of the following)

- [ ] 5+ GitHub stars
- [ ] 3+ unique users reporting feedback (issues, discussions, comments)
- [ ] 1+ external PR attempt (even if unmerged)
- [ ] Explicit sign-off from ≥1 external beta tester after a week of use

### Stability (required)

- [ ] Zero bugs requiring uninstall
- [ ] Zero reports of chiron firing on requests where it shouldn't (no-conflict test holds in the wild)

**If any criterion fails:** v0.1 is patched (`v0.1.x`) — not extended to v0.2. Validation gate resets.

---

## v0.2+ candidate features (not committed)

Sequence will be decided based on validation gate feedback. Likely candidates in rough priority order:

- **`/explain`** — compare 2+ approaches with trade-offs side-by-side
- **`/postmortem`** — session-end `/10` scoring across design, code quality, idioms, testing, engineering maturity
- **Profile read-loop** — on session start, surface recurring weaknesses (tags with ≥3 `struggle`/`drill_gaveup` entries in the last 14 days)
- **Rust language pack** (community contribution preferred)
- **`/tour`** — structured "before each task" preamble (read-this-first, key concepts, common mistakes)
- **`chiron-reviewer` agent** — review user code the way a senior engineer would
- **TypeScript / Python / Zig language packs** (community contributions preferred)
- **`/level`** — gentle / default / strict voice dial
- **Pre-edit hook** — strict-mode guardrails that block `Write`/`Edit` until Socratic questioning completes (opt-in, arrives with `/level strict`)
- **Session-start hook** — automatically surface profile insights at session start
