# chiron roadmap: 0 → v0.1 MVP

This roadmap tracks chiron's path from empty repo to v0.1.0 public release. Updated as work completes.

**Current status:** Phase 12 — v0.6.0 Multi-platform support

**Phase 4 correction:** during install testing, slash commands appeared with the mandatory `chiron:` prefix (`/chiron:chiron`, `/chiron:hint`, `/chiron:challenge`). Investigation of the `impeccable` plugin revealed that `user-invocable: true` skills in a custom skills path (`./.claude/skills`) bypass namespacing. Migrated the three command files to `.claude/skills/<name>/SKILL.md` with `user-invocable: true` frontmatter. Content unchanged; only the container and frontmatter changed. Slash commands should now be `/chiron`, `/hint`, `/challenge` without prefix. See the plan file for full details.

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

- [x] `.claude/skills/chiron/SKILL.md` — `/chiron <request>` — Socratic voice for a single coding request. Inlines voice (A+B blend), decision tree, L0–L4 ladder, anti-patterns, 4 failure-mode rules. *(Originally built as `commands/chiron.md` in Phase 2; migrated to user-invocable skill in Phase 4 correction.)*
- [x] `.claude/skills/hint/SKILL.md` — `/hint` — stateless rung advancer. Re-reads the most recent turn, identifies current rung, emits the next one.
- [x] `.claude/skills/challenge/SKILL.md` — `/challenge <file>` — hero drill generator. Seeded pass, eyeball fallback. Grades attempts with `/10`. Writes to `~/.chiron/profile.json`.
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
- [x] Seeds + idiom tag list inlined into `.claude/skills/challenge/SKILL.md` as `# Go language pack (inlined)` section — runtime source of truth
- [x] `.claude/skills/challenge/SKILL.md` step 3 updated to reference the inlined section instead of trying to load `docs/languages/go.md` at runtime
- [x] `docs/languages/_template.md` — community contribution template for future languages
- [x] `docs/CONTRIBUTING-LANGUAGE-PACKS.md` — detailed authoring guide (step-by-step, quality bar, seed-writing tips, testing procedure)
- [x] Phase 3 committed (commit `21bbd4e` "phase 3: Go language pack (comprehensive)")

**Phase 3 complete ✅**

**Exit criteria met:** the command file is fully self-contained (no runtime file-loading dependencies). `/challenge tests/fixtures/go/worker_pool_bad.go` should produce concrete drills grounded in specific lines — this is verified end-to-end in Phase 4.

---

## Phase 4 — Verification (mostly complete)

Local install and smoke tests passed. The Phase 4 correction (user-invocable skills) resolved the namespacing issue.

- [x] 1. Install from local path succeeds; plugin appears in `/plugins` list
- [x] 2. **No-auto-trigger test** — fresh session, no chiron command typed, normal coding request → chiron does not interrupt (verified by user in fresh session after Phase 4 correction)
- [x] 3. `/chiron` activation test (verified without `chiron:` prefix)
- [x] 4. `/hint` rung advancement test
- [x] 5. `/challenge` seeded drill test on hero fixture
- [ ] 6. Golden transcript reproduction end-to-end *(deferred to post-release dogfood)*
- [ ] 7. Profile write schema validation *(deferred to post-release dogfood)*
- [ ] 8. CLAUDE.md precedence test *(deferred to post-release dogfood)*
- [ ] 9. No artifact pollution test *(deferred to post-release dogfood)*
- [ ] 10. Failure mode tests (disengagement, topic shift, implausible answer, ungradable drill) *(deferred to post-release dogfood)*
- [ ] 11. **No-conflict test** — installed alongside `superpowers`, plain coding request does not fire chiron *(deferred to post-release dogfood)*
- [ ] 12. Cross-platform smoke test on ≥2 of {Linux, macOS, Windows-bash} *(deferred — only Windows-bash verified)*
- [ ] 13. Install-ID portability test *(deferred to post-release dogfood)*

Tests 1–5 (core install + happy-path verification) are done. Tests 6–13 are deferred into the post-release dogfood window — they verify robustness/edge cases that are lower-risk and don't gate the initial public release.

---

## Phase 5 — Public release (in progress)

Ship v0.1.0.

- [ ] Hero GIFs recorded *(user action: needs terminal recorder)*
  - Clip A: `/chiron` Socratic walkthrough (matches the golden transcript opening)
  - Clip B: `/challenge` drill on `.claude/skills/challenge/` against `tests/fixtures/go/worker_pool_bad.go`
- [x] README finalized with install URL (xDido/chiron) and GIF placeholder
- [x] CHANGELOG.md with v0.1.0 release notes
- [x] All URLs and paths updated to `xDido/chiron` and `.claude/skills/*`
- [x] Git tag `v0.1.0` created locally (commit `bbcca7f` "phase 5: release polish")
- [ ] GitHub repo pushed (local is ahead of `origin/main`)
- [ ] Git tag `v0.1.0` pushed (`git push origin v0.1.0`)
- [ ] GitHub Release created from the tag, paste CHANGELOG v0.1.0 section as release notes

**Exit criteria:** `https://github.com/xDido/chiron` shows a v0.1.0 release with working install instructions. Hero GIFs can be added in a subsequent v0.1.1 polish commit if desired.

---

## Phase 6 — v0.2.0 `/level` voice dial (in progress)

First feature of **Bundle A — Voice & tuning** (see decomposition notes in the plan file). Introduces a user-invocable `/level` slash command that persists chiron's voice level to `~/.chiron/config.json`, plus level-aware integration in the three existing skills.

- [x] `.claude/skills/level/SKILL.md` — new user-invocable skill; reads/writes `~/.chiron/config.json`; three-level list format with `→` active marker in every response
- [x] `.claude/skills/chiron/SKILL.md` — adds "Current level" section (reads config) + "Level rules" section (full per-level rules: voice, hint ladder, refusal)
- [x] `.claude/skills/challenge/SKILL.md` — same integration, plus per-level grading tone rules (gentle/default/strict)
- [x] `.claude/skills/hint/SKILL.md` — adds "Current level" section + "Level rules (voice tone only)" section (hint advancement logic is level-independent)
- [x] `plugin.json` version bumped to `0.2.0`
- [x] `README.md` — `/level` documented in Usage section; new Configuration section for `~/.chiron/config.json`
- [x] `CHANGELOG.md` — `## [0.2.0]` section with full feature description and deferrals
- [ ] `claude plugins validate` passes
- [ ] Uninstall + reinstall chiron; test `/level` in fresh session (full verification plan in the implementation plan)
- [ ] Commit as `v0.2.0: /level voice dial command + ~/.chiron/config.json`
- [ ] Git tag `v0.2.0`
- [ ] Push main + tag to `xDido/chiron`
- [ ] Create GitHub Release from v0.2.0 tag, paste CHANGELOG v0.2.0 section as release notes

**Exit criteria:** `/level gentle`, `/level default`, `/level strict`, `/level` (no args), and `/level <invalid>` all produce correctly-formatted three-level list responses with `→` marking the active level. `~/.chiron/config.json` is written correctly on first run and preserved (including any other fields) on subsequent updates. All three existing chiron skills read the config and adjust voice/ladder/refusal per level. Anti-pattern #2 is preserved at every level including strict. `claude plugins validate` passes. GitHub Release v0.2.0 is published.

### Remaining Bundle A features (separate sub-projects)

- **v0.2.1 — user config file expansion.** Add fields to `~/.chiron/config.json` for drill sizing (`max_drill_lines`, `max_functions_per_drill`, `drill_time_minutes`) and grading threshold (`drill_solved_threshold`). Non-breaking schema extension. Separate brainstorm → plan → implementation cycle.
- **v0.2.2 — profile read-loop with level-aware difficulty.** Session-start hook reads `~/.chiron/profile.json`, surfaces recurring weaknesses based on tag frequency, optionally adjusts intensity based on `voice_level`. Separate sub-project.

---

## Phase 7 — v0.2.1 drill sizing config (in progress)

Second feature of **Bundle A — Voice & tuning**. Extends `~/.chiron/config.json` with drill sizing overrides read by `/challenge`. Non-breaking schema extension; no new commands.

- [x] `.claude/skills/challenge/SKILL.md` — drill sizing block rewritten to read config `drill` object with fallback + clamping + silent invalid-value handling
- [x] `.claude/skills/level/SKILL.md` — "Tuning other config fields" section added, documenting the drill fields for users
- [x] `plugin.json` version bumped to `0.2.1`
- [x] `marketplace.json` version bumped to `0.2.1`
- [x] `README.md` — Configuration section expanded with full v0.2.1 schema and field documentation
- [x] `CHANGELOG.md` — `## [0.2.1]` section with feature, validation rules, and explicit out-of-scope notes
- [ ] `claude plugins validate` passes
- [ ] Uninstall + reinstall chiron; verify drill config override in a fresh session
- [ ] Commit as `v0.2.1: drill sizing config fields`
- [ ] Git tag `v0.2.1`
- [ ] Push main + tag
- [ ] Create GitHub Release from v0.2.1 tag

**Exit criteria:** `/challenge` reads drill sizing from `~/.chiron/config.json` when present; falls back to hardcoded defaults when missing or invalid. Invalid values silently clamp or fall back without crashing. `voice_level` (from v0.2.0) continues working unchanged alongside the new `drill` object. GitHub Release v0.2.1 is published.

### Remaining Bundle A feature

- **v0.2.2 — profile read-loop with level-aware difficulty.** Session-start hook reads `~/.chiron/profile.json`, surfaces recurring weaknesses, optionally adjusts intensity per `voice_level`. Separate sub-project — brainstorm → plan → implementation cycle. **Still pending** (user chose Bundle B instead after v0.2.1).

---

## Phase 8 — v0.3.0 Bundle B teach commands (in progress)

Three new user-invocable skills extending chiron's teach-first philosophy. All three are read-only, follow the established skill pattern, integrate with `voice_level` from config.

- [x] `.claude/skills/explain/SKILL.md` — `/explain <question>`: 2–3 approaches with pros/cons/recommendation, never fence-sit
- [x] `.claude/skills/postmortem/SKILL.md` — `/postmortem`: session-end 3-section review with `/10` scoring across 5 axes, graceful degradation if no recent chiron activity
- [x] `.claude/skills/tour/SKILL.md` — `/tour <topic>`: structured "read first / key concepts / junior mistakes" preamble, text-only
- [x] `plugin.json` version bumped to `0.3.0`
- [x] `marketplace.json` version bumped to `0.3.0`
- [x] `README.md` — three new commands added to Usage section
- [x] `CHANGELOG.md` — `## [0.3.0]` section with feature, architecture, invariants, and deferrals
- [ ] `claude plugins validate` passes
- [ ] Uninstall + reinstall chiron; test all three commands in a fresh session
- [ ] Commit as `v0.3.0: Bundle B teach commands (/explain, /postmortem, /tour)`
- [ ] Git tag `v0.3.0`
- [ ] Push main + tag
- [ ] Create GitHub Release from v0.3.0 tag

**Exit criteria:** All three commands function in a fresh session. `/explain` produces 2–3 approaches with a qualified recommendation. `/postmortem` reviews recent chiron activity and outputs the 3-section format with 5-axis scores. `/tour` produces the 3-section preamble format. All three respect `voice_level` from config, preserve anti-patterns (never refuse, never moralize), and don't write to profile.json. `claude plugins validate` passes clean. GitHub Release v0.3.0 is published.

### Remaining work after v0.3.0

- **Bundle A v0.2.2** — profile read-loop (shelved after brainstorming — hook complexity outweighed value)
- **Bundle D** — `chiron-reviewer` agent, pre-edit hook
- **Bundle E** — Rust / Python / JavaScript / TypeScript / Java language packs → **shipped in v0.4.0 (Phase 9)**
- **Post-release polish:** hero GIFs, GitHub Releases for v0.2.0/v0.2.1/v0.3.0/v0.4.0, beta tester recruitment

**🎯 MVP COMPLETE when Phase 5 exit criteria are met.**

---

## Phase 9 — v0.4.0 Bundle E language packs (in progress)

Five comprehensive language packs shipped together: Rust, Python, JavaScript, TypeScript, and Java. Expands `/challenge` from one supported language (Go) to six. Each pack matches the Go pack's density — stdlib anchors, 25–30 idioms, 20–25 anti-patterns, mental-model deltas, and 12–17 challenge seeds.

**Scope decision:** comprehensive packs, not starter packs. The user chose "match Go pack scale" during brainstorming.

**Release strategy:** single v0.4.0 commit with all 5 packs plus `/challenge` expansion. No intermediate per-language releases.

### Rust

- [x] `docs/languages/rust.md` — 12 anchors, 30 idioms, 25 anti-patterns, 25 mental-model deltas, 17 seeds
- [x] `tests/fixtures/rust/borrow_checker_bad.rs` — hero fixture with 5 intentional bugs

### Python

- [x] `docs/languages/python.md` — 12 anchors, 30 idioms, 25 anti-patterns, 25 mental-model deltas, 17 seeds
- [x] `tests/fixtures/python/worker_pool_bad.py` — hero fixture with 7 intentional bugs

### JavaScript

- [x] `docs/languages/javascript.md` — 11 anchors, 30 idioms, 25 anti-patterns, 25 mental-model deltas, 17 seeds
- [x] `tests/fixtures/javascript/fetch_all_bad.js` — hero fixture with 8 intentional bugs

### TypeScript (inherits JS seeds)

- [x] `docs/languages/typescript.md` — 9 TS-specific anchors, 30 TS-specific idioms, 25 TS anti-patterns, 25 mental-model deltas, 17 TS seeds
- [x] `tests/fixtures/typescript/api_response_bad.ts` — hero fixture with 7 intentional bugs

### Java

- [x] `docs/languages/java.md` — 11 anchors, 30 idioms, 25 anti-patterns, 25 mental-model deltas, 17 seeds
- [x] `tests/fixtures/java/UserService_bad.java` — hero fixture with 8 intentional bugs

### `/challenge` skill + plugin metadata

- [x] `.claude/skills/challenge/SKILL.md` — step 2 language detection expanded for `.rs` / `.py` / `.js` / `.mjs` / `.cjs` / `.ts` / `.tsx` / `.java`
- [x] `.claude/skills/challenge/SKILL.md` — 5 new inlined `# <Language> language pack (inlined)` sections appended with idiom tag list + challenge seeds for each new language
- [x] `plugin.json` — version bumped to `0.4.0`; keywords expanded to include `rust`, `python`, `javascript`, `typescript`, `java`
- [x] `marketplace.json` — version bumped to `0.4.0`
- [x] `README.md` — Language packs section now lists 6 supported languages with a table; roadmap deferral list updated
- [x] `CHANGELOG.md` — `## [0.4.0]` section with per-pack detail and verification notes
- [x] `ROADMAP.md` — this section

### Pending

- [ ] `claude plugins validate .` passes both manifests
- [ ] Uninstall + reinstall chiron; `/challenge` on each hero fixture in a fresh session
- [ ] `/challenge` on a `.go` file (regression guard)
- [ ] `/challenge foo.zig` still returns community-contribution message
- [ ] Commit as `v0.4.0: Bundle E language packs (Rust, Python, JavaScript, TypeScript, Java)`
- [ ] Git tag `v0.4.0`
- [ ] Push main + tag
- [ ] Create GitHub Release from v0.4.0 tag

**Exit criteria:** All 5 language packs render correctly. All 5 hero fixtures are syntactically valid for their language. `/challenge` on each fixture produces drills grounded in specific lines, mapped to at least one seed tag for that language. Go regression test passes unchanged. `claude plugins validate` passes clean. GitHub Release v0.4.0 is published.

### Remaining work after v0.4.0

- **Bundle F** — C#, Kotlin, Swift language packs → **shipped in v0.5.0 (Phase 10)**
- **Bundle D** — `chiron-reviewer` agent, pre-edit hook (next major feature bundle)
- **Additional language packs** — Ruby, Zig, Elixir — deferred to community contributions
- **Post-release polish:** hero GIFs recording session for README, GitHub Releases catch-up

---

## Phase 10 — v0.5.0 Bundle F language packs (in progress)

Three more comprehensive language packs: C#, Kotlin, and Swift. Same pattern as v0.4.0 Bundle E — comprehensive density matching the Go pack.

### C#

- [x] `docs/languages/csharp.md` — 12 anchors, 30 idioms, 25 anti-patterns, 25 mental-model deltas, 17 seeds
- [x] `tests/fixtures/csharp/OrderService_bad.cs` — hero fixture with 9 intentional bugs

### Kotlin

- [x] `docs/languages/kotlin.md` — 12 anchors, 30 idioms, 25 anti-patterns, 25 mental-model deltas, 17 seeds
- [x] `tests/fixtures/kotlin/UserRepository_bad.kt` — hero fixture with 8 intentional bugs

### Swift

- [x] `docs/languages/swift.md` — 12 anchors, 30 idioms, 25 anti-patterns, 25 mental-model deltas, 17 seeds
- [x] `tests/fixtures/swift/ProfileLoader_bad.swift` — hero fixture with 10 intentional bugs

### `/challenge` skill + plugin metadata

- [x] `.claude/skills/challenge/SKILL.md` — step 2 language detection expanded for `.cs` / `.kt` / `.kts` / `.swift`
- [x] `.claude/skills/challenge/SKILL.md` — 3 new inlined pack sections appended
- [x] `plugin.json` — version bumped to `0.5.0`; keywords expanded
- [x] `marketplace.json` — version bumped to `0.5.0`
- [x] `README.md` — Language packs table now lists 9 languages
- [x] `CHANGELOG.md` — `## [0.5.0]` section with per-pack detail
- [x] `ROADMAP.md` — this section

### Pending

- [ ] Stale-reference patches (tour skill, CONTRIBUTING.md, CONTRIBUTING-LANGUAGE-PACKS.md, issue template)
- [ ] Commit as `v0.5.0: Bundle F language packs (C#, Kotlin, Swift)`
- [ ] Git tag `v0.5.0`
- [ ] Push main + tag
- [ ] Create GitHub Release from v0.5.0 tag

**Exit criteria:** All 3 new packs render correctly. All 3 hero fixtures are syntactically valid. `/challenge` on each fixture produces drills. All 6 Bundle E fixtures still work unchanged (regression). `claude plugins validate` passes. GitHub Release v0.5.0 is published.

### Remaining work after v0.5.0

- **v0.5.1** — Pack freshness CI → **shipped (Phase 11)**
- **Bundle D** — `chiron-reviewer` agent, pre-edit hook
- **Additional language packs** — Ruby, Zig, Elixir — deferred to community contributions

---

## Phase 11 — v0.5.1 Pack freshness CI (in progress)

Weekly GitHub Actions workflow that detects new language versions and opens `[pack-refresh]` issues. Infrastructure-only — no runtime behavior changes.

- [x] Verify all 9 version endpoints manually (endoflife.date for Go/Rust/Python/Node/Java/dotnet, GitHub Releases for Kotlin/Swift, npm for TypeScript)
- [x] Add YAML frontmatter to all 9 language packs (`language`, `last_reviewed_against`, `upstream_version_source`)
- [x] Update `docs/languages/_template.md` with frontmatter block + placeholder values
- [x] Write `.github/workflows/pack-freshness-check.yml` — inline JS via `actions/github-script`, weekly cron + manual dispatch, idempotent issue creation
- [x] Update `docs/CONTRIBUTING-LANGUAGE-PACKS.md` — "Keeping your pack fresh" section
- [x] `plugin.json` + `marketplace.json` → `0.5.1`
- [x] `CHANGELOG.md` — `## [0.5.1]` section
- [x] `ROADMAP.md` — this section

### Pending

- [ ] Commit as `v0.5.1: pack freshness CI (version-check → auto-open issue)`
- [ ] Git tag `v0.5.1`
- [ ] Push main + tag
- [ ] Create GitHub Release from v0.5.1 tag
- [ ] Trigger workflow manually to verify zero issues opened (all packs current at ship time)

**Exit criteria:** Workflow runs cleanly via manual dispatch. All 9 pack frontmatters parsed correctly. Zero false-positive issues on first run. GitHub Release v0.5.1 published.

### Remaining work after v0.5.1

- **v0.6.0** — Multi-platform support → **shipped (Phase 12)**
- **Bundle D** — `chiron-reviewer` agent, pre-edit hook (next major feature bundle)
- **Additional language packs** — Ruby, Zig, Elixir — deferred to community contributions
- **Post-release polish:** hero GIFs recording session for README

---

## Phase 12 — v0.6.0 Multi-platform support

Single-source build system producing skills for 13 AI coding platforms. Same approach as impeccable (pbakaus/impeccable): source skills with `{{placeholders}}` transformed per-platform at build time.

- [x] `source/skills/{name}/SKILL.md` — 7 source skills with `{{config_files}}`, `{{config_file}}`, `{{config_files_plain}}`, `{{command_prefix}}`, `{{product_name}}` placeholders
- [x] `scripts/build.js` — build orchestrator (Bun)
- [x] `scripts/lib/providers.js` — 13 platform configs (frontmatter fields per HARNESSES.md)
- [x] `scripts/lib/placeholders.js` — per-platform placeholder values
- [x] `scripts/lib/transform.js` — transformer preserving original YAML formatting
- [x] `package.json` — `bun run build` / `bun run clean`
- [x] Platform output directories: `.claude/`, `.cursor/`, `.gemini/`, `.codex/`, `.opencode/`, `.agents/`, `.kiro/`, `.pi/`, `.openai/`, `.trae/`, `.trae-cn/`, `.rovodev/`, `.github/`
- [x] `plugin.json` + `marketplace.json` → `0.6.0`, description updated
- [x] `README.md` — multi-platform install table
- [x] `CHANGELOG.md` — `## [0.6.0]` section
- [x] `ROADMAP.md` — this section

**Exit criteria:** `bun scripts/build.js` produces 91 files (7 skills x 13 platforms). Claude Code output matches pre-build content (no regressions). Codex output uses `$` prefix. Cursor output references `.cursorrules`. Gemini output has minimal frontmatter. GitHub Release v0.6.0 published.

### Remaining work after v0.6.0

- **Bundle D** — `chiron-reviewer` agent, pre-edit hook (next major feature bundle)
- **Additional language packs** — Ruby, Zig, Elixir — deferred to community contributions
- **Post-release polish:** hero GIFs recording session for README

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

- ~~**`/explain`**~~ — **shipped in v0.3.0**
- ~~**`/postmortem`**~~ — **shipped in v0.3.0**
- ~~**`/tour`**~~ — **shipped in v0.3.0**
- ~~**`/level`**~~ — **shipped in v0.2.0**
- ~~**Rust / Python / JavaScript / TypeScript / Java language packs**~~ — **shipped in v0.4.0**
- **Profile read-loop** — on session start, surface recurring weaknesses (tags with ≥3 `struggle`/`drill_gaveup` entries in the last 14 days). Shelved after brainstorming (hook complexity outweighed value) but candidate for revisit.
- **`chiron-reviewer` agent** — review user code the way a senior engineer would (Bundle D)
- **Pre-edit hook** — strict-mode guardrails that block `Write`/`Edit` until Socratic questioning completes (opt-in, arrives with `/level strict`)
- ~~**C#, Kotlin, Swift language packs**~~ — **shipped in v0.5.0**
- **Additional language packs** — Ruby, Zig, Elixir (community contributions preferred)
- **Session-start hook** — automatically surface profile insights at session start

---

## Phase 13 — v0.10.0: `/teach-chiron` and context caching ✅

**Date:** 2026-04-11

- [x] `/teach-chiron` skill for comprehensive project scanning
- [x] `.chiron-context.md` generation — persistent project context
- [x] All skills read cached context instead of re-scanning
- [x] Context includes: project metadata, dependencies, directory tree, source map, entry points, API surface, data layer, architecture, patterns, infrastructure, chiron config

**Exit criteria met:** `/teach-chiron` generates `.chiron-context.md`, all other skills read it successfully.

---

## Phase 14 — v0.11.0: Multi-platform distribution ✅

**Date:** 2026-04-11

- [x] Adopt Anthropic knowledge-work-plugins architecture
- [x] Single source of truth in `source/skills/`
- [x] Build system compiles to 13 platform outputs
- [x] Supported: Claude Code, Cursor, Gemini CLI, Codex CLI, OpenCode, GitHub Copilot Agents, Kiro, Pi, OpenAI, Trae, Trae CN, Rovo Dev, VS Code Copilot
- [x] Placeholder system for cross-platform compatibility (`{{command_prefix}}`, `{{config_files}}`, `{{pack_path}}`)

**Exit criteria met:** `bun scripts/build.js` produces correct output for all 13 platforms.

---

## Phase 15 — v0.12.0: Taste-skill technique adaptations ✅

**Date:** 2026-04-12

Seven techniques adapted from [taste-skill](https://github.com/Leonxlnx/taste-skill):

- [x] AI Code Tells reference — ban list of AI-generated code smells
- [x] Pre-flight checklists — silent verification gates in `/chiron`, `/challenge`, `/explain`
- [x] Engineering Arsenal reference — 42 named backend patterns across 6 domains
- [x] Output completeness enforcement — anti-pattern #7, PAUSED signaling
- [x] Teaching dials — `teaching.depth`, `teaching.theory_ratio`, `teaching.idiom_strictness`
- [x] Self-verification loops — score verification in `/postmortem`, grade verification in `/challenge`
- [x] Multi-level teaching scope — micro/meso/macro classification in `/chiron`
- [x] Research-backed pedagogy — 12 citations in `pedagogy.md`

**Exit criteria met:** All 7 enhancements integrated, build passes, references distributed to all platforms.

---

## Phase 16 — v0.13.0: `/debug`, `/refactor`, `/architect` ✅

**Date:** 2026-04-12

- [x] `/debug` skill — structured debugging with hypothesis testing (L0-L4 ladder)
- [x] `debugging-playbook.md` reference — 10 root cause categories, hypothesis templates
- [x] `/refactor` skill — guided refactoring with named patterns (L0-L4 ladder)
- [x] `refactoring-catalog.md` reference — 13 code smells, 16 named refactorings
- [x] `/architect` skill — architecture decision records with quality-attribute analysis (L0-L4 ladder)
- [x] `architecture-decisions.md` reference — 8 quality attributes, ADR template, 7 decision categories

**Exit criteria met:** 11 skills × 13 platforms = 143 files, 7 references, all placeholders resolved.

---

## Post-v0.13.0 — Candidate features

- Profile read-loop — read `~/.chiron/profile.json` in `/challenge` to surface recurring weakness patterns
- `chiron-reviewer` agent — review code the way a senior engineer would
- Golden transcripts for `/debug`, `/refactor`, `/architect`
- Community language packs (Ruby, Zig, Elixir)
- Profile persistence for `/postmortem` scores
