# Changelog

All notable changes to chiron are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] — 2026-04-09

### Added — `/level` voice dial

- **`/level gentle | default | strict`** — new user-invocable slash command for switching chiron's voice level on demand. Persists globally to `~/.chiron/config.json` across sessions and projects. Three levels tune voice tone, hint ladder progression speed, and how chiron responds to "just write it" requests:
  - **gentle** — warmer, more encouraging; L4 (full solution) offered after one attempt
  - **default** — A+B blend (v0.1 baseline); L4 after L3 attempt + request, or 2 genuine attempts, or explicit request
  - **strict** — sharper, more demanding; L4 requires 2+ genuine attempts or explicit "just write it"
- **`~/.chiron/config.json`** — new per-user config file with stable schema (`schema_version: 1`, `voice_level`). Reserved `schema_version` field enables future non-breaking additions (drill sizing, grading thresholds, other tunables).
- **All three existing skills (`/chiron`, `/challenge`, `/hint`) now read `~/.chiron/config.json`** at invocation time to pick up the configured level. If the file is missing or invalid, they silently fall back to default — no errors.
- **Three-level list format** in every `/level` response, with `→` marker pointing at the currently active level. Makes the active level immediately visible regardless of command variant.

### Invariants preserved at every level

- **Anti-pattern #2** (never refuse to ship when asked) applies to all three levels. `strict` is NOT an excuse to refuse — *"just write it"* always ships.
- **No moralizing** at any level. Strict is firm about the code, never insulting.
- **L0–L4 rung definitions are unchanged** — only progression speed varies per level.
- **CLAUDE.md / AGENTS.md overrides** — user instructions win at every level.

### Changed

- `plugin.json` version bumped to `0.2.0`.
- `/chiron`, `/challenge`, `/hint` skill files gain a "Current level" section near the top (reads the config) and a "Level rules" section near the end (inlined per-level rules). Content additions only — no existing v0.1 rules changed or relaxed.
- `/challenge` grading tone adjusts per level (gentle softens the "points lost" framing; strict is terse and direct). The `/10` rubric itself is unchanged — only phrasing varies.

### Deferred

- **User config file expansion** (drill sizing, grading threshold, other fields) — v0.2.1.
- **Profile read-loop integration** with level-aware drill difficulty — v0.2.2.
- **Pre-edit hook** for strict-mode guardrails — v0.3 or later.
- **Additional language packs** (Rust, TypeScript, Python, Zig) — separate Bundle E, community contributions welcome.

### Acknowledgments

v0.2.0 continues the impeccable-inspired user-invocable skill pattern from v0.1 — `/level` is implemented as a user-invocable skill at `.claude/skills/level/SKILL.md`, invoked without the `chiron:` prefix.

---

## [0.1.0] — 2026-04-09

### Initial public release

Three user-invocable slash commands for teach-first mentoring in Claude Code, plus a comprehensive Go language pack with pre-authored practice drills.

### Added

**Slash commands (three, all opt-in):**

- **`/chiron <request>`** — Applies Socratic teach-first voice to a coding request. Questions before code, graduated hints via the L0–L4 hint ladder (L0 clarifying questions → L1 conceptual nudge → L2 named primitive → L3 signature with blanks → L4 full solution), and idiom callouts with "read this first" doc pointers. Each chiron response respects `CLAUDE.md` / `AGENTS.md` overrides at the top of the skill file.

- **`/challenge <file>`** — Hero feature. Scans a source file against the inlined Go seed list, generates 1–3 focused practice drills grounded in specific line numbers, and grades your attempts with a `/10` rating plus specific feedback. Each drill is bounded to ≤20 lines of change, ≤1 function touched, and 5–15 minutes of work. Drill outcomes are logged to `~/.chiron/profile.json` with a per-install UUID (v0.1 writes only; v0.2 will surface recurring weaknesses via a profile read-loop).

- **`/hint`** — Stateless rung advancer. Re-reads the most recent chiron-styled assistant turn, classifies its hint rung (L0–L4), and emits the next rung for the same underlying problem. Supports targeted questions with arguments (e.g., `/hint what does errgroup.WithContext do`). Returns a prompt to run `/chiron` or `/challenge` first if invoked outside chiron context.

**Go language pack** (`docs/languages/go.md` + inlined in `.claude/skills/challenge/SKILL.md`):

- 12 stdlib / ecosystem anchors with doc pointers
- 4 meta-resources (Effective Go, Go Proverbs, Go Memory Model, Code Review Comments)
- **30 idioms** across three categories (15 stdlib primitives, 5 architectural patterns, 10 design principles)
- **25 anti-patterns** across 6 categories (concurrency, error handling, resource handling, type/interface, tests, package structure)
- **25 mental-model deltas** for engineers coming from C-family languages
- **17 challenge seeds** with Signal + Drill format, including the canonical `go:shared-input-channel` seed for worker-pool drills

**Hero fixture** (`tests/fixtures/go/worker_pool_bad.go`):

A deliberately buggy worker pool implementation, compiling as real Go code, with 4 documented bugs that match chiron seeds:

1. `go:shared-input-channel` — ranging over a shared slice inside goroutines
2. `go:goroutine-leak` / `go:context-propagation` — no `ctx.Done()` checks
3. Unbuffered channel coordination — subtle design issue worth discussing
4. `go:errgroup-with-context` — manual error tracking with `sync.WaitGroup`

**Contribution infrastructure:**

- `docs/languages/_template.md` — community contribution template for new language packs
- `docs/CONTRIBUTING-LANGUAGE-PACKS.md` — detailed authoring guide with step-by-step process, quality bar, seed-writing tips, and testing procedure
- `CONTRIBUTING.md` — top-level contribution guide
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1 (condensed)
- `.github/ISSUE_TEMPLATE/bug.md` and `.github/ISSUE_TEMPLATE/language-pack.md` — issue templates

**Acceptance contract:**

- `docs/GOLDEN-TRANSCRIPT.md` — the v0.1 acceptance contract. Every chiron response must match this transcript in *shape* (structure, not exact wording). Any divergence is a bug.
- `tests/golden/fan_out_transcript.md` — CI reproducibility copy

### Architecture

- **Opt-in only — zero auto-trigger.** Commands fire exclusively when the user types the matching slash command. No description-based auto-invocation. No output-style auto-activation.
- **User-invocable skills** live at `.claude/skills/<name>/SKILL.md` with `user-invocable: true` frontmatter (from the [Agent Skills spec](https://agentskills.io/specification)). This bypasses the mandatory `plugin:command` namespacing that standard plugin commands use — users invoke `/chiron`, `/hint`, `/challenge` directly, no prefix.
- **Self-contained skills.** Each skill file inlines its voice directive, decision tree, anti-patterns, failure-mode rules, and (for `/challenge`) the full Go language pack. No runtime file-loading dependencies.
- **Cross-platform** — markdown-only content, runs on Linux, macOS, and Windows bash.
- **Per-install identity** — `install_id` UUID generated on first profile write; portable between machines.

### Voice (A+B blend, opinionated by design)

Strict content with neutral framing. Clarifying questions are invitations, not imperatives. No moralizing phrasings. If you don't want Socratic questioning, don't type `/chiron` — or paste the pervasive-mode recipe into your project's `CLAUDE.md` to enable it across every coding request in that project.

### Anti-patterns (what chiron never does)

- Moralize or guilt-trip
- Refuse to ship when the user asks for the answer directly (`"just write it"` is a hard override)
- Interrupt debugging loops
- Pollute code, comments, commits, or PR bodies with teaching content
- Override `CLAUDE.md` / `AGENTS.md` (user instructions always win)

### Installation

**Option A — directly from GitHub:**

```bash
claude plugins marketplace add xDido/chiron
claude plugins install chiron@chiron-dev
```

**Option B — from a local clone (development / offline):**

```bash
git clone https://github.com/xDido/chiron.git
cd chiron
claude plugins marketplace add ./
claude plugins install chiron@chiron-dev
```

Verify with `claude plugins list`.

### Not in v0.1.0

See [`ROADMAP.md`](ROADMAP.md) for the v0.2+ candidate feature list and the validation gate that gates new work. Key deferrals:

- `/level` voice dial (gentle / default / strict)
- `/explain` — compare 2+ approaches with trade-offs
- `/postmortem` — session-end `/10` scoring across 5 axes
- `/tour` — structured "before each task" preamble
- Profile read-loop — surface recurring weaknesses on session start
- Rust / TypeScript / Python / Zig language packs (community contributions welcomed — see [`docs/CONTRIBUTING-LANGUAGE-PACKS.md`](docs/CONTRIBUTING-LANGUAGE-PACKS.md))
- `chiron-reviewer` agent
- Pre-edit hook for strict-mode guardrails
- User config file for drill sizing + voice tuning (bundled as one unified feature)

### Acknowledgments

- **Jesse Vincent's [superpowers](https://github.com/obra/superpowers)** — referenced throughout development for plugin structure, skill conventions, and the `using-superpowers` invocation pattern that clarified Claude Code's skill mechanics.
- **Paul Bakaus's [impeccable](https://github.com/pbakaus/impeccable)** — the reference that unblocked the Phase 4 "commands are namespaced" dead-end by demonstrating user-invocable skills in a custom skills path. Without that precedent, chiron would ship with `/chiron:chiron` instead of `/chiron`.
- **The [Agent Skills spec](https://agentskills.io/specification)** — source of the `user-invocable: true` frontmatter field that makes skill-based slash commands work.
