# Changelog

All notable changes to chiron are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.16.0] — 2026-04-16

### Added — Executable schema versioning for `~/.chiron/` files

Both user-data files now ship a versioned migration pipeline instead of documented-only behaviour. Every write passes through an explicit decision tree; reads are permissive; downgrades are refused.

- **`/challenge` Step 8 → migration pipeline.** The old one-line *"older profiles may contain `install_id` — drop it on next write"* note is replaced by a six-step procedure (8.a read → 8.b classify `schema_version` → 8.c migrate v1→v2 → 8.d validate `entries[]` → 8.e append → 8.f write). Constants `CURRENT_PROFILE_VERSION = 2` and `SUPPORTED_PROFILE_VERSIONS = {1, 2}` are declared at the top of the step. Legacy-v1 detection now triggers on any of: `install_id` present, `schema_version === 1`, or `schema_version` missing. A successful migration surfaces one terse user-facing line.
- **Corrupt-profile safety.** Unreadable `profile.json` files are renamed to `profile.json.broken.<ISO8601 timestamp>` (data preserved for manual recovery) and a fresh log is started. A soft cap of 5000 entries prunes from the oldest with a one-line note the first time it trips.
- **Forward-compat refusal.** Files with `schema_version` greater than this chiron understands are NEVER overwritten. `/challenge` stops without appending and surfaces a message pointing at the version mismatch; `/level` does the same for `config.json`. This prevents a newer chiron's file from being silently downgraded by an older install.
- **`/level` hardening.** Case B now classifies `config.json`'s `schema_version` before writing (missing / 1 / >1 / invalid). On corruption, `/level` never renames or deletes the file — it stops and asks the user to fix or delete by hand, because config values are often hand-tuned. A "Schema evolution policy" block in the Config schema section makes the additive-without-bump vs breaking-with-bump rule explicit.
- **`/postmortem` schema-aware reads.** Profile-informed trends now branches on `schema_version` (1, 2, future, corrupt). A future-versioned profile yields one "newer than this chiron understands" Session note and falls through to conversation-only scoring. The read-only invariant is reaffirmed: `/postmortem` never renames, repairs, or writes `profile.json` — that's `/challenge`'s job.
- **README Privacy → Migrations.** New subsection with a version table (`config.json` 1; `profile.json` 2, reads 1+2), the v1→v2 migration explainer, forward-compat-safety note, and corrupt-file handling.

### Added — Testing foundation

First automated test suite in the project. `bun test scripts/lib` runs two files (43 tests, ~190ms):

- **`scripts/lib/transform.test.js`** — covers `parseSkill` (valid / no frontmatter / unterminated / CRLF / blank+comment lines), `replacePlaceholders` (single / repeated / unmatched / empty map / special chars), `buildFrontmatter` (always-include name+description / per-provider filtering / placeholder substitution), `transformSkill` (golden transforms for Claude Code, Cursor, Gemini, Codex), `validateSkill` (6 error paths + happy path), provider↔placeholder consistency, and a sweep that validates every real skill in `source/skills/`.
- **`scripts/lib/integrity.test.js`** — covers `collectFiles` (tracked vs untracked / sorted / deduped), `computeManifest` (version + algorithm + hash correctness), `verifyManifest` round-trip plus hash-mismatch / missing-file / extra-file / unsupported `manifest_version` / missing-manifest error paths, and `regenerate` (first-call / idempotent / detects-and-rewrites). Each test runs against a per-test temp-dir fixture.

CI switched to `oven-sh/setup-bun@v2`; `bun test scripts/lib` now runs before `bun scripts/verify-integrity.js` on every PR and push to main.

### Added — Frontmatter validator in the build

`scripts/lib/transform.js` exports a new `validateSkill()` that checks: required fields (`name`, `description`), known frontmatter keys against `VALID_FRONTMATTER_KEYS` (Agent Skills spec + documented provider extensions), and each value in `allowed-tools` against `VALID_ALLOWED_TOOLS` (Claude Code tool whitelist). `scripts/build.js` runs validation over every source skill before writing any output, collects all errors, and fails the build with a consolidated per-skill report. Typos like `allowed-toolz` or `Gerp` fail loudly at build time instead of passing silently and being caught only when INTEGRITY.json's hashes drift.

### Added — Cross-platform `scripts/install.js`

New install script that copies one platform's pre-built skills into a target project without cloning the full repo. `node scripts/install.js --platform <name> --dest <project-root>` copies `.{platform}/skills/` into the destination and prints a version stamp. Supports `--list`, `--dry-run`, and `--help`. Eliminates the "clone + `cp -r`" dance for the 12 non-Claude-Code platforms.

### Added — Zero-arg `/level` prints full config

`/level` with no argument now prints a full health-check snapshot: voice level, drill sizing (`drill.max_lines_changed`, `drill.max_functions_touched`, `drill.time_minutes_min`, `drill.time_minutes_max`), and teaching dials (`teaching.depth`, `teaching.theory_ratio`, `teaching.idiom_strictness`), with `(default)` annotations on any field falling back. Users no longer need to open `~/.chiron/config.json` to discover which knobs exist. Writing semantics are unchanged — `/level` still only writes `voice_level`.

### Changed — README platform table

The install table for non-Claude platforms gained a **Status** column (supported / experimental / community) so users know whether Kiro, Trae, Trae CN, and OpenAI are on thinner ice than Cursor, Gemini, Codex, OpenCode, Agents, Pi, Rovo Dev, and VS Code Copilot. The section links `HARNESSES.md` for per-platform frontmatter and directory-fallback detail, and points at the new `scripts/install.js` alongside the manual `cp -r` example.

### Internal — Repository hygiene

- Test files under `scripts/lib/*.test.js` and the new `scripts/install.js` are integrity-tracked and covered by the manifest.
- CI workflow renamed to *CI (tests + integrity manifest)* to reflect the expanded gate.

---

## [0.15.0] — 2026-04-15

### Added — Zero-arg context inference across six skills

Six skills now accept bare invocations and infer their target from the current conversation: `/tour`, `/chiron`, `/debug`, `/refactor`, `/explain`, `/architect`. When `$ARGUMENTS` is empty, each skill scans the recent turns for the domain-specific target (topic / task / bug / file-or-smell / decision point / architecture decision), announces the inference in one line, then runs its normal decision tree with that target substituted.

**Per-skill inference targets:**

| Skill | Inferred target | Primary signal in conversation |
|-------|-----------------|--------------------------------|
| `/tour` | Coding topic | Most recent specific concept or primitive |
| `/chiron` | Coding task | Most recent "how do I …" / "I'm trying to …" / unfinished code block |
| `/debug` | Specific bug / error | Most recent stack trace, panic, test failure, or "this isn't working" |
| `/refactor` | File or named smell | Most recently edited/discussed file, or described smell |
| `/explain` | "Which way" decision point | *"should we use A or B"*, *"torn between"*, *"not sure which"* |
| `/architect` | Design decision | Architecture-level discussion; trade-off, stack, schema, or boundary debate |

**Design locks:**
- **Never fabricate a target.** Ambiguity → stop with a helpful fallback pointing at the explicit form, never guess.
- **Graceful fallback per skill.** Each skill has a domain-specific "nothing to infer" message (e.g., `/debug` says *"No error visible — try `/debug <error description or file:line>`"*) so a cold-started bare invocation degrades to a single helpful line instead of dropping into L0 clarifying questions.
- **Announcement line is mandatory.** *"Inferring <target> from conversation: **<one-line summary>**. Say otherwise and I'll retarget."* — users always see what the skill latched onto and can redirect with one message.
- **Cross-skill redirects preserved.** `/chiron` on a bug redirects to `/debug`; `/explain` on an implementation question redirects to `/chiron`; `/architect` on a lightweight trade-off redirects to `/explain`. Inference never silently converts between skill types.
- **Never-refuse rule wins.** If the user invokes *"just fix it"* / *"just clean it up"* / *"just decide for me"* alongside a bare form, the skill infers the target AND ships the direct answer immediately — no restate loop.

### Fixed — Quick-start promises that the body never delivered

`/debug` and `/architect` Quick start sections already listed bare-form invocations (*"debug the current error in context"*, *"record an architecture decision for the current work"*) but their decision trees had no matching rule — users who ran them bare dropped into generic L0 questioning. The new inference path closes the gap. `/chiron`'s older *"then describe your task when prompted"* Quick start line has also been replaced with inference.

### Unchanged — skills that don't participate

`/challenge` still requires a file path (inference wouldn't make sense for drill targeting). `/hint`, `/level`, `/postmortem`, `/teach-chiron` either take no free-text argument or have no natural "from conversation" interpretation.

---

## [0.14.0] — 2026-04-12

### Added — Profile read-loop (Reflexion pattern)

`/challenge` and `/postmortem` now read `~/.chiron/profile.json` to inform drill selection and session reviews with longitudinal evidence. `/challenge` has written to this file since v0.1, but no skill read it until now.

**`/challenge` changes:**
- **New Step 0.5 — Load learning profile:** builds a weakness map (tags with 2+ weighted failures and failure ratio > 0.5) and a mastery set (tags with 2+ recent solves, no recent failures)
- **Step 4 profile bias:** promotes weakness-matching seeds to the top, deprioritizes mastered patterns, falls through to eyeball fallback if only mastered patterns match
- **Step 6 history callout:** one-line callout when a drill targets a recurring weakness (*"Profile: you've marked `go:errgroup-with-context` as attempted 3 times in past sessions — here's a focused drill on it"*)
- **Step 8 write path unchanged:** existing writer preserved; profile file is owned exclusively by `/challenge`

**`/postmortem` changes:**
- **New Profile-informed trends section:** score justifications may cite longitudinal evidence alongside current-session evidence
- **Session summary may include one trend callout** (at most one per session, only if genuinely relevant)
- **Read-only contract preserved:** `/postmortem` reads profile but never writes

**Design locks:**
- Recency weighting: last 30 days full weight, older entries at 50%
- Weakness threshold: 2+ failures per tag, failure ratio > 0.5
- Silent fallback on missing/corrupt/empty profile
- Never-refuse invariant preserved — profile bias is a suggestion, not a gate

Based on Reflexion (Shinn et al., 2023) adapted for deliberate-practice drill systems, with Ebbinghaus/Cepeda spacing effect informing recency weighting.

### Added — Prompt engineering improvements

Three techniques adapted from [dair-ai/Prompt-Engineering-Guide](https://github.com/dair-ai/Prompt-Engineering-Guide):

- **Self-consistency grading in `/challenge`** (Wang et al., 2022) — grader runs the /10 evaluation three times internally, uses consensus. Reduces grading noise without user-visible changes. Re-examines the constraint if scores diverge > 2 points.
- **Active-Prompt ambiguity detection in `/chiron`** (Diao et al., 2023) — when the user's L0 answer is vague or multi-interpretable, fire one clarification cycle surfacing 2–3 interpretations. Unambiguous answers proceed normally to L1. Never-refuse rule still applies.
- **Context engineering audit** — all 11 SKILL.md files audited against the 5-principle checklist (eliminate ambiguity, explicit expectations, observability, balance flexibility, robust error handling). Drift found and fixed in 3 files: `challenge` (struggle trigger definition), `postmortem` (sentence count alignment), `architect` (ADR status update target).

### Added — References section in README

Comprehensive citations for all 17 research papers and inspirations that shaped chiron's design, with BibTeX block for how to cite chiron in research.

---

## [0.13.0] — 2026-04-12

### Added — Three new teach-first skills

Three new skills with domain-adapted hint ladders and dedicated reference files:

| Skill | Purpose | Reference |
|-------|---------|-----------|
| `/debug` | Structured debugging with hypothesis testing (observe → hypothesize → verify → fix) | `debugging-playbook.md` — 10 root cause categories |
| `/refactor` | Guided refactoring with named patterns (identify smell → name refactoring → transform) | `refactoring-catalog.md` — 13 smells, 16 refactorings |
| `/architect` | Architecture Decision Records with quality-attribute trade-off analysis | `architecture-decisions.md` — 8 quality attributes, ADR template |

All three integrate with chiron's voice levels, teaching dials, and cross-skill handoffs. Read-only for `profile.json` in v1.

**Totals:** 11 skills, 7 reference files, 21 packs. Build output: **143 files** across 13 platforms.

---

## [0.12.0] — 2026-04-12

### Added — Taste-skill technique adaptations

Seven techniques adapted from [taste-skill](https://github.com/Leonxlnx/taste-skill) (frontend design plugin) for chiron's backend teaching context:

- **AI Code Tells** — explicit ban list of AI-generated code smells (`chiron/references/ai-code-tells.md`): naming, comment, error handling, structure, and completeness tells
- **Pre-flight checklists** — silent verification gates before L4 delivery in `/chiron`, drill presentation in `/challenge`, and approach comparison in `/explain`
- **Engineering Arsenal** — 42 named backend patterns across 6 domains (`chiron/references/engineering-arsenal.md`): API design, concurrency, data access, resilience, observability, security
- **Output completeness enforcement** — anti-pattern #7 banning placeholder patterns (`// ...`, `// for brevity`), PAUSED signaling protocol for token-constrained responses
- **Teaching dials** — three new config parameters in `~/.chiron/config.json`: `teaching.depth` (1-10), `teaching.theory_ratio` (1-10), `teaching.idiom_strictness` (1-10)
- **Self-verification loops** — score verification in `/postmortem`, grade verification in `/challenge`
- **Multi-level teaching scope** — micro/meso/macro request classification in `/chiron` affects hint ladder abstraction level

### Changed — Research-backed pedagogy

Expanded `pedagogy.md` with 12 research citations grounding every chiron mechanism: Vygotsky ZPD, Wood/Bruner/Ross scaffolding, Sweller cognitive load theory, Chi self-explanation, Kapur productive failure, Bjork desirable difficulties, Ericsson deliberate practice, Roediger/Karpicke testing effect, Ebbinghaus spaced repetition, Kalyuga expertise reversal, Paul/Elder Socratic questioning, Deci/Ryan self-determination theory.

---

## [0.11.0] — 2026-04-11

### Changed — Anthropic knowledge-work-plugins patterns

Adopted the Anthropic knowledge-work-plugins architecture for cross-platform skill distribution. Single source of truth in `source/skills/`, compiled to 13 platform outputs via `bun scripts/build.js`.

**Supported platforms:** Claude Code, Cursor, Gemini CLI, Codex CLI, OpenCode, GitHub Copilot Agents, Kiro, Pi, OpenAI, Trae, Trae CN, Rovo Dev, VS Code Copilot.

---

## [0.10.0] — 2026-04-11

### Added — `/teach-chiron` and context caching

- **`/teach-chiron`** — one-time comprehensive project scan that reads every important file and writes `.chiron-context.md`
- **`.chiron-context.md`** — persistent context file containing project metadata, dependencies, directory tree, source file map, entry points, API surface, data layer, architecture overview, patterns, and chiron config
- All other chiron skills now read `.chiron-context.md` instead of re-scanning the codebase

---

## [0.9.0] — 2026-04-10

### Added — Complete backend coverage (4 more concept packs)

Four additional concept packs fill the remaining gaps in backend engineering coverage:

| Pack | Domain | Seeds |
|------|--------|-------|
| `configuration.md` | Env vars, feature flags, config validation | 10 |
| `concurrency.md` | Race conditions, locks, thread safety | 12 |
| `realtime.md` | WebSockets, SSE, streaming | 10 |
| `storage.md` | File/object storage, uploads | 10 |

**Totals:** 12 concept packs, 9 language packs = 21 packs. ~142 backend seeds + ~150 language seeds. Build output: **364 files** across 13 platforms.

---

## [0.8.0] — 2026-04-10

### Added — Backend concept packs (8 domains)

`/challenge` now auto-detects backend patterns from import statements and loads concept-specific drill packs alongside the language pack. Up to 2 concept packs are loaded per invocation.

**New concept packs:**

| Pack | Domain | Seeds | Triggers on |
|------|--------|-------|-------------|
| `database.md` | SQL/NoSQL patterns | 14 | `database/sql`, `sqlalchemy`, `prisma`, `hibernate`, etc. |
| `api-design.md` | HTTP/REST/gRPC | 14 | `net/http`, `express`, `fastapi`, `spring-web`, etc. |
| `reliability.md` | Retries, circuit breakers, timeouts | 12 | `gobreaker`, `tenacity`, `resilience4j`, `Polly`, etc. |
| `observability.md` | Logging, metrics, tracing | 12 | `zap`, `pino`, `slf4j`, `prometheus`, `opentelemetry`, etc. |
| `security.md` | Auth, secrets, validation | 12 | `crypto`, `jwt`, `bcrypt`, `helmet`, `spring-security`, etc. |
| `testing.md` | Integration & contract testing | 12 | `testcontainers`, `supertest`, `wiremock`, `rest-assured`, etc. |
| `messaging.md` | Queues, events, pub/sub | 12 | `kafka-go`, `amqplib`, `celery`, `spring-kafka`, etc. |
| `caching.md` | Cache patterns | 12 | `go-redis`, `ioredis`, `caffeine`, `StackExchange.Redis`, etc. |

**How it works:** After loading the language pack (Step 3), a new Step 3b scans the file's imports against a detection table in the core skill. Matching concept packs are loaded on demand — same mechanism as language packs.

**Build output:** 91 SKILL.md + 221 packs (17 per platform × 13 platforms) = **312 total files**.

---

## [0.7.0] — 2026-04-10

### Changed — On-demand language pack loading for `/challenge`

Language packs are no longer inlined in the challenge skill. Instead, `/challenge` detects the file's language and loads only the relevant pack at runtime via the Read tool.

**Before:** Every `/challenge` invocation loaded all 9 language packs (~17.5k tokens).
**After:** Only the relevant pack is loaded on demand (~1.5k tokens per language, ~3k for TypeScript which also loads the JavaScript pack).

**What changed:**

- `source/skills/challenge/SKILL.md` now contains only the core execution framework (~310 lines, down from ~2143)
- Language packs live in `source/skills/challenge/packs/{lang}.md` (9 files, ~200 lines each)
- Build system copies pack files alongside SKILL.md to all 13 platform output directories
- New `{{pack_path}}` placeholder resolves to the skill's output directory per platform
- `docs/CONTRIBUTING-LANGUAGE-PACKS.md` updated for the new file layout

**No user-facing behavior change.** `/challenge` works exactly as before — same drills, same grading, same seeds. The TypeScript cross-reference to JavaScript seeds is preserved.

---

## [0.6.0] — 2026-04-10

### Added — Multi-platform support (13 platforms)

chiron now ships pre-built skills for 13 AI coding platforms, not just Claude Code. A single source of truth in `source/skills/` is transformed via `bun scripts/build.js` into platform-specific outputs.

**Supported platforms:**

| Platform | Directory | Command prefix |
|----------|-----------|---------------|
| Claude Code | `.claude/skills/` | `/` |
| Cursor | `.cursor/skills/` | `/` |
| Gemini CLI | `.gemini/skills/` | `/` |
| Codex CLI | `.codex/skills/` | `$` |
| OpenCode | `.opencode/skills/` | `/` |
| GitHub Copilot Agents | `.agents/skills/` | `/` |
| Kiro | `.kiro/skills/` | `/` |
| Pi | `.pi/skills/` | `/` |
| OpenAI | `.openai/skills/` | `/` |
| Trae | `.trae/skills/` | `/` |
| Trae CN | `.trae-cn/skills/` | `/` |
| Rovo Dev | `.rovodev/skills/` | `/` |
| VS Code Copilot | `.github/skills/` | `/` |

**Build system:**

- `source/skills/{name}/SKILL.md` — canonical skill files with `{{placeholder}}` tokens
- `scripts/build.js` — transforms source → 91 output files (7 skills x 13 platforms)
- `scripts/lib/providers.js` — platform configurations (frontmatter field support per HARNESSES.md)
- `scripts/lib/placeholders.js` — per-platform values for config files, command prefixes, product names
- `scripts/lib/transform.js` — transformer preserving original YAML formatting
- `package.json` — `bun run build` / `bun run clean`

**Per-platform adaptations:**

- Config file references: `CLAUDE.md` / `.cursorrules` / `GEMINI.md` / `AGENTS.md` / etc.
- Command prefix: `/` for most platforms, `$` for Codex CLI
- Frontmatter field filtering: each platform only gets fields it supports (per Agent Skills spec)

**No behavioral changes.** Existing Claude Code users see the same skills. The source architecture is new; the skill content is unchanged.

---

## [0.5.1] — 2026-04-10

### Added — Pack freshness CI

A GitHub Actions workflow that detects when a new stable version of a supported language ships and opens a `[pack-refresh]` issue with instructions. Keeps language packs current without scraping docs or fetching at runtime.

**How it works:**

1. Runs every Monday at 06:00 UTC (+ manual dispatch from the Actions UI)
2. Reads YAML frontmatter from each `docs/languages/<lang>.md` — `last_reviewed_against` and `upstream_version_source`
3. Fetches the current stable version from the configured endpoint (endoflife.date, GitHub Releases, or npm)
4. If the version differs from `last_reviewed_against`, opens a GitHub issue with the `pack-refresh` label and step-by-step refresh instructions
5. Idempotent — won't duplicate issues for the same `(language, version)` pair

**New file:** `.github/workflows/pack-freshness-check.yml`

**Frontmatter added to all 9 language packs:**

| Language | Source | Product/Repo | Reviewed against |
|----------|--------|-------------|------------------|
| Go | endoflife | `go` | 1.26 |
| Rust | endoflife | `rust` | 1.94 |
| Python | endoflife | `python` | 3.14 |
| JavaScript | endoflife | `nodejs` | 25.9 |
| TypeScript | npm | `typescript` | 6.0 |
| Java | endoflife | `oracle-jdk` | 26.0 |
| C# | endoflife | `dotnet` | 10.0 |
| Kotlin | github-release | `JetBrains/kotlin` | 2.3 |
| Swift | github-release | `swiftlang/swift` | 6.3 |

**Template updated:** `docs/languages/_template.md` now includes the frontmatter block with placeholder values and inline comments.

**Contribution guide updated:** `docs/CONTRIBUTING-LANGUAGE-PACKS.md` gains a "Keeping your pack fresh" section explaining the frontmatter schema, CI behavior, and how to respond to `[pack-refresh]` issues.

### Not changed

- **No runtime behavior change.** `/challenge`, `/chiron`, and all other skills are untouched. The frontmatter is invisible to the runtime.
- **No new slash commands.**
- **All 9 language packs unchanged** (only frontmatter added; no idiom/seed/anti-pattern changes).

---

## [0.5.0] — 2026-04-10

### Added — Bundle F language packs (C#, Kotlin, Swift)

`/challenge` expands from six supported languages to **nine**. Each new pack matches the existing packs in density.

#### C# pack — `docs/languages/csharp.md`

- 12 stdlib/ecosystem anchors (LINQ, async/await, Task, Span, Records, Pattern matching, Nullable refs, IDisposable, DI container, xUnit, FluentAssertions, Microsoft.Extensions.Logging)
- 30 idioms — records, switch expressions, nullable reference types, LINQ pipelines, `async/await` + `ConfigureAwait(false)`, `Task.WhenAll`, `CancellationToken`, `using` declarations, `await using`, primary constructor DI, structured logging, xUnit `[Theory]`, sealed classes, `IOptions<T>`, and more
- 25 anti-patterns — `.Result`/`.Wait()` deadlocks, `async void`, serial awaits, missing `CancellationToken`, string concat in loops, interpolated log messages, `HttpClient` as short-lived, `DateTime.Now`, `lock(this)`, broad `catch (Exception)`, `throw ex`, public `List<T>`, and more
- 25 mental-model deltas — value types vs reference types, nullable opt-in, properties as getter/setter sugar, `var` vs `dynamic`, `yield return`, `Task` vs thread, generics reified, extension methods, and more
- 17 challenge seeds
- Hero fixture: `tests/fixtures/csharp/OrderService_bad.cs` (9 intentional bugs)

#### Kotlin pack — `docs/languages/kotlin.md`

- 12 stdlib/ecosystem anchors (null safety, coroutines, scope functions, sealed classes, data classes, extensions, collections, Flow, delegation, Kotest, Ktor/Spring Boot)
- 30 idioms — `val` by default, safe call `?.`, Elvis `?:`, `?.let {}`, `requireNotNull`, data classes, sealed classes, `object` singletons, scope functions (`let`/`apply`/`run`/`also`), extension functions/properties, read-only collections, `suspend` functions, structured concurrency, `async`/`await`, `withContext`, `Flow`, `StateFlow`, `by lazy`, interface delegation, `Result<T>`, trailing lambdas, and more
- 25 anti-patterns — `!!` abuse, platform types from Java interop, `GlobalScope`, `runBlocking` in production, blocking in coroutines, catching `CancellationException`, `var` abuse, mutable collection APIs, data class with `var`, Java-style getters, `.first()` on empty, scope function overuse, catching `Throwable`, and more
- 25 mental-model deltas — null safety in type system, everything is an expression, no checked exceptions, smart casts, `when` vs `switch`, primary constructors, `object` keyword, extension function dispatch, `Unit`/`Nothing`, operator overloading, inline/reified, and more
- 17 challenge seeds
- Hero fixture: `tests/fixtures/kotlin/UserRepository_bad.kt` (8 intentional bugs)

#### Swift pack — `docs/languages/swift.md`

- 12 stdlib/ecosystem anchors (Optional, Result, async/await, Actors, Codable, Protocols, Generics, Swift Standard Library, Swift Testing, XCTest, Foundation, Swift Package Manager)
- 30 idioms — `struct` by default, `let` by default, `guard let`/`if let`, nil-coalescing `??`, optional chaining, enums with associated values, exhaustive `switch`, protocol-oriented programming, protocol extensions, `async`/`await`, `async let`, `TaskGroup`, actors, `@MainActor`, `Codable`, property wrappers, opaque/existential types (`some`/`any`), `[weak self]`, `defer`, and more
- 25 anti-patterns — force unwrap `!`, `as!` forced cast, `try!`, `class` over `struct`, blocking in async, unstructured `Task`, `DispatchQueue.main.async` instead of `@MainActor`, strong self capture, silent catch, `NSString` usage, `print` in production, `Any`/`AnyObject` escape hatches, and more
- 25 mental-model deltas — value types are common, optionals are a type, no null, ARC + retain cycles, protocol vs interface, extensions, sum-type enums, exhaustive switch, `guard`, reified generics, structured concurrency, actors, `@MainActor`, key paths, result builders, and more
- 17 challenge seeds
- Hero fixture: `tests/fixtures/swift/ProfileLoader_bad.swift` (10 intentional bugs)

### Changed — `/challenge` language detection

Step 2 expanded to route new extensions:

- `.cs` → C#
- `.kt`, `.kts` → Kotlin
- `.swift` → Swift
- Community-contribution message now lists nine shipped languages

### Changed — plugin metadata

- `plugin.json` keywords expanded to include `csharp`, `kotlin`, `swift`
- `plugin.json` and `marketplace.json` version bumped to `0.5.0`

### Not changed

- **All existing packs** (Go, Rust, Python, JavaScript, TypeScript, Java) — unchanged
- **`/chiron`, `/hint`, `/level`, `/explain`, `/postmortem`, `/tour`** — language-agnostic, no changes
- **Voice, anti-patterns, hint ladder, config schema, profile schema** — all v0.4.0 invariants preserved

---

## [0.4.0] — 2026-04-09

### Added — Bundle E language packs (Rust, Python, JavaScript, TypeScript, Java)

`/challenge` now ships with **comprehensive language packs for six languages** — up from one (Go) in v0.3.1. The new packs match the Go pack in depth and shape.

#### Rust pack — `docs/languages/rust.md`

- **12 stdlib/ecosystem anchors** — `Result`, `Option`, `Iterator`, `std::sync`, `tokio`, `serde`, `thiserror`, `anyhow`, `clap`, `tracing`, `cargo`, plus meta-resources
- **30 idioms** — `?` operator, iterator chains, `thiserror`/`anyhow`, `Arc<Mutex<T>>`, `tokio::spawn`/`select!`, newtypes, builder pattern, `unsafe` with `SAFETY:` comments, `#[must_use]`, and more
- **25 anti-patterns** — `.unwrap()` everywhere, `.clone()` to fight the borrow checker, `String` vs `&str` confusion, holding locks across `.await`, blocking calls in async, `.as` truncation, and more
- **25 mental-model deltas** — ownership, borrowing, lifetimes, traits vs interfaces, structural vs nominal typing, `Drop` semantics, monomorphization, and more
- **17 challenge seeds** — `rust:unwrap-everywhere`, `rust:question-mark-operator`, `rust:string-vs-str`, `rust:vec-vs-slice`, `rust:iterator-chains`, `rust:collect-result`, `rust:clone-to-appease-borrow-checker`, `rust:thiserror-library`, `rust:lock-across-await`, `rust:blocking-call-in-async`, `rust:forgot-to-await`, `rust:early-return-let-else`, `rust:derive-default`, `rust:arc-mutex-overuse`, `rust:iterator-next-unwrap`, `rust:as-cast-truncation`, `rust:newtype-invariant`
- **Hero fixture** — `tests/fixtures/rust/borrow_checker_bad.rs` with 5 intentional bugs matching at least one seed each

#### Python pack — `docs/languages/python.md`

- **12 stdlib/ecosystem anchors** — `pathlib`, `typing`, `dataclasses`, `contextlib`, `functools`, `itertools`, `asyncio`, `concurrent.futures`, `logging`, `pytest`, `pydantic`, `ruff`
- **30 idioms** — comprehensions, f-strings, `with` context managers, `pathlib.Path`, generators, `enumerate`/`zip`, `@dataclass`, `@property`, type hints, `Protocol`, EAFP, `asyncio.gather`, `pytest` fixtures/parametrize, `pyproject.toml`, and more
- **25 anti-patterns** — mutable default arguments, bare `except:`, `==` vs `is`, `os.path` legacy, `open()` without encoding, string concat in loops, blocking calls in async, `assert` in production, wildcard imports, plain dicts for structured data, and more
- **25 mental-model deltas** — names vs variables, mutable vs immutable, the GIL, duck typing, generator laziness, `None` singleton, closures capturing references, module singletons, and more
- **17 challenge seeds** — `py:mutable-default-arg`, `py:string-concat-loop`, `py:comprehension`, `py:bare-except`, `py:os-path-legacy`, `py:open-no-encoding`, `py:open-without-with`, `py:type-hints`, `py:dataclass`, `py:f-string`, `py:blocking-in-async`, `py:forgot-await`, `py:is-vs-equal`, `py:dict-instead-of-dataclass`, `py:assert-in-production`, `py:print-debugging-in-prod`, `py:logging-over-print`
- **Hero fixture** — `tests/fixtures/python/worker_pool_bad.py` with 7 intentional bugs

#### JavaScript pack — `docs/languages/javascript.md`

- **11 stdlib/ecosystem anchors** — `Array` methods, `Promise`, `async/await`, `fetch`, `Map`/`Set`, `JSON`, `AbortController`, Node `fs/promises`, `path`, `url`, ESM modules
- **30 idioms** — `const`/`let` over `var`, arrow functions, destructuring, default params, array methods, spread operator, optional chaining, nullish coalescing, async/await, `Promise.all`/`allSettled`, `AbortController`, template literals, ESM imports, `Map`/`Set`, custom error classes, `Error.cause`, and more
- **25 anti-patterns** — `var`, `==` vs `===`, `||` truthiness trap, forgotten `await`, unhandled rejections, serial awaits, callback hell, `for...in` on arrays, mutating arguments, prototype pollution, `typeof` quirks, floating-point equality, `throw "string"`, empty `catch`, and more
- **25 mental-model deltas** — single-threaded event loop, closures, `this` semantics, type coercion, Promise states, prototype-based inheritance, reference equality, module top-level execution, and more
- **17 challenge seeds** — `js:var-in-new-code`, `js:loose-equality`, `js:or-truthiness-trap`, `js:callback-hell`, `js:serial-await`, `js:forgotten-await`, `js:for-in-array`, `js:array-methods`, `js:strict-equality`, `js:mutate-arguments`, `js:unhandled-rejection`, `js:throw-string`, `js:empty-catch`, `js:fs-promises`, `js:template-literal`, `js:const-by-default`, `js:optional-chaining`
- **Hero fixture** — `tests/fixtures/javascript/fetch_all_bad.js` with 8 intentional bugs

#### TypeScript pack — `docs/languages/typescript.md`

- **9 TypeScript-specific anchors** — TypeScript Handbook, Utility Types, Generics, Narrowing, Modules, `tsconfig.json`, `strict` mode, `import type`, `satisfies` operator
- **30 idioms** — `strict: true` in tsconfig, `interface` vs `type`, `readonly`, `as const`, `satisfies`, generic constraints, `keyof`/indexed access, utility types (`Partial`/`Pick`/`Omit`/`Record`), discriminated unions, type guards, exhaustiveness checks with `never`, `unknown` over `any`, `import type`, runtime validation with Zod, phantom types, and more
- **25 anti-patterns** — `any` everywhere, `as` assertion escapes, `@ts-ignore` without explanation, `!` non-null abuse, unconstrained generics, runtime imports for types, JSON without validation, numeric enums, default exports, and more
- **25 mental-model deltas** — superset of JS (not runtime), structural typing, type erasure, narrowing scope, exhaustiveness, conditional types, `infer`, and more
- **17 challenge seeds** — `ts:any-everywhere`, `ts:as-assertion-escape`, `ts:non-null-assertion-abuse`, `ts:ts-ignore-no-explanation`, `ts:unconstrained-generic`, `ts:discriminated-union`, `ts:exhaustive-never`, `ts:strict-disabled`, `ts:catch-unknown`, `ts:json-no-validation`, `ts:partial-required-readonly`, `ts:import-type`, `ts:default-export`, `ts:numeric-enum`, `ts:as-const`, `ts:type-guard-is`, `ts:no-unchecked-indexed-access`
- **Hero fixture** — `tests/fixtures/typescript/api_response_bad.ts` with 7 intentional bugs
- **JavaScript seeds also apply** — `/challenge` on a `.ts` file consults both packs

#### Java pack — `docs/languages/java.md`

- **11 stdlib/ecosystem anchors** — `Optional`, `java.util.stream`, `java.util.concurrent`, `CompletableFuture`, `java.nio.file.Path`, `java.time`, Records, Sealed classes, Pattern matching, JUnit 5, SLF4J
- **30 idioms** — records, `final` fields, sealed interfaces, builder pattern, `Optional` returns, `Objects.requireNonNull`, try-with-resources, stream pipelines, `Collectors.groupingBy`, `List.of`/`Map.of`, `ExecutorService`, `CompletableFuture`, `ConcurrentHashMap`, `Path` over `File`, JUnit 5, AssertJ, constructor injection, SLF4J parameterized logging, pattern matching, switch expressions, `var`, text blocks, and more
- **25 anti-patterns** — returning `null`, null-checking everywhere, resource leaks, `String` `==`, string concat in loops, modifying collections during iteration, raw types, `Arrays.asList` mutability confusion, `equals` without `hashCode`, unsynchronized shared state, `SimpleDateFormat` sharing, raw `new Thread()`, swallowed `InterruptedException`, `java.util.Date` in new code, log string concat, `System.out.println`, and more
- **25 mental-model deltas** — reference vs primitive, type erasure, checked exceptions, `null`, `equals`/`hashCode` contract, immutability of Strings, autoboxing, static, inner classes, `final` semantics, virtual threads (Java 21), JVM shutdown hooks, and more
- **17 challenge seeds** — `java:null-return`, `java:null-collection-return`, `java:try-with-resources`, `java:string-concat-loop`, `java:string-equals-equals`, `java:record`, `java:var-local`, `java:switch-expression`, `java:pattern-matching-instanceof`, `java:raw-type`, `java:simpledateformat-sharing`, `java:legacy-date`, `java:unsynchronized-shared`, `java:raw-thread`, `java:log-string-concat`, `java:swallowed-interrupt`, `java:collection-of`
- **Hero fixture** — `tests/fixtures/java/UserService_bad.java` with 8 intentional bugs

### Changed — `/challenge` language detection

Step 2 of `.claude/skills/challenge/SKILL.md` expanded to route new extensions:

- `.go` → Go
- `.rs` → Rust
- `.py` → Python
- `.js`, `.mjs`, `.cjs` → JavaScript
- `.ts`, `.tsx` → TypeScript (consults both TS and JS packs)
- `.java` → Java
- Anything else → community-contribution message

### Changed — plugin metadata

- `plugin.json` keywords expanded from `["mentor", "teach", "socratic", "drills", "learning", "go"]` to include all six languages
- `plugin.json` and `marketplace.json` version bumped to `0.4.0`

### Not changed

- **`/chiron`, `/hint`, `/level`, `/explain`, `/postmortem`, `/tour`** — language-agnostic commands, no changes
- **Go pack** — unchanged; still the reference implementation
- **Voice, anti-patterns, hint ladder, failure modes, config schema** — all v0.3.1 invariants preserved
- **Profile schema** — unchanged; new language tags slot in under the existing `<lang>:<idiom>` format

### Verification

- All 5 hero fixtures exist and parse as their respective languages
- `claude plugins validate .` passes both manifests
- `/challenge` on a `.rs` / `.py` / `.js` / `.ts` / `.java` file produces drills grounded in specific lines, mapped to at least one seed tag per language
- `/challenge` on a `.go` file behaves identically to v0.3.1 (regression guard)
- `/challenge foo.zig` still responds with the community-contribution message

---

## [0.3.1] — 2026-04-09

### Changed — terser response formats across all skills

User feedback after v0.3.0: *"the output is so large for every command can we make it a little smaller?"*

Response format examples in 5 skill files tightened to produce ~40–60% shorter user-facing output while preserving all information content:

- **`/explain`** — pros/cons/when-to-use inlined on single lines with `+`/`-`/`When:` prefixes instead of `**Pros:**` / `**Cons:**` / `**When to use:**` bold labels. Three approaches drop from ~40 lines to ~15.
- **`/postmortem`** — `Session:` / `Scores:` / `Practice:` one-line section labels instead of `## Session summary` / `## Scores` / `## One thing to practice` headers. Axis names abbreviated (`Design` / `Code` / `Idioms` / `Testing` / `Maturity`) in the scores block. From ~20 lines to ~10.
- **`/tour`** — `Read first:` / `Key concepts:` / `Watch for:` one-line section labels instead of `##` headers. Resource bullets drop the `**bold names**` and `—` separator. From ~25 lines to ~12.
- **`/challenge`** drill format — 3 lines per drill instead of 6. Header, location, task, and current shape merged: `Drill 1/3 — <tag> @ <file>:<line-range>` then task on line 2 with `(current: ...)` parenthetical. `Constraint:` kept on its own line (load-bearing for grading).
- **`/chiron`** tone examples — updated to reflect the new terse voice: *"Three things that shape the answer:"* instead of *"Before we write it — three things worth thinking about, because the right answer depends on them:"*. Footer tightened: *"Answer any, or `/hint`, or say 'just write it'."*
- Added an explicit **"Keep responses terse"** directive at the voice section in `/chiron`, to be followed by the other skills as they respond.

### Not changed

- **Decision trees, anti-patterns, invariants, voice rules** — these are skill-internal instructions, not user-facing output. Untouched.
- **`/hint`** — already short; no change needed.
- **`/level`** — three-level list format is already tight and the descriptions carry useful information; no change.
- **The 2–3 approach structure of `/explain`, 3-section structure of `/tour`, 5 axes of `/postmortem`, per-drill constraint format of `/challenge`** — structural contract unchanged, only formatting tightened.
- **Anti-pattern #2** (never refuse to ship) — preserved verbatim at every level.

### Verification

Before v0.3.1: `/explain error handling in Go` typical response ~45 lines. After v0.3.1: ~18 lines. Same information density; less visual bulk.

---

## [0.3.0] — 2026-04-09

### Added — Bundle B teach commands (`/explain`, `/postmortem`, `/tour`)

Three new user-invocable slash commands extending chiron's teach-first philosophy:

- **`/explain <question>`** — compare 2–3 approaches with pros/cons and a qualified recommendation. For *"which way should I..."* questions (complements `/chiron` which handles *"how do I..."* questions). Every response ends with a recommendation — no fence-sitting allowed. If the user says *"just tell me which one"*, `/explain` ships the recommendation directly without the full comparison.

- **`/postmortem [optional summary]`** — session-end review. Analyzes recent chiron activity in the conversation and produces a 3-section report: session summary, `/10` scores across 5 axes (design thinking, code quality, idioms, testing, engineering maturity), and one concrete thing to practice next time. Graceful degradation if no recent chiron activity is found. **Read-only in v0.3.0** — scores are not persisted.

- **`/tour <topic>`** — structured preamble before a coding task. 3 sections: read-this-first doc pointers (1–3), key concepts (2–4), common junior mistakes (2–4). Text-only preamble; no code examples. Routes *"how do I"* questions to `/chiron` and *"which way"* questions to `/explain`. Never fakes doc pointers — describes the resource without a URL if uncertain.

### Architecture

All three commands follow the established user-invocable skill pattern from v0.2.0:

- `.claude/skills/{explain,postmortem,tour}/SKILL.md` with `user-invocable: true` frontmatter
- Each reads `~/.chiron/config.json` at invocation time for the current `voice_level`
- Each has a "Level rules" section applying `gentle`/`default`/`strict` voice tuning
- All three are **read-only** — no profile.json writes, no new config fields

### Invariants preserved

- **Anti-pattern #2** (never refuse to ship) applies to all three:
  - `/explain just tell me` gives a direct recommendation
  - `/postmortem just the scores` skips the summary, goes straight to scores + one-to-practice
  - `/tour` ships the preamble when the topic is valid
- **No moralizing** at any level. `/postmortem strict` is terse and specific, never cruel.
- **CLAUDE.md / AGENTS.md overrides** win at every level.
- **All three route wrong-command-type gracefully** — `/explain` routes implementation questions to `/chiron`, `/tour` routes "how do I" questions to `/chiron` or `/explain`.
- **`/postmortem` degrades gracefully** when no chiron activity is found (doesn't invent a session).

### Changed

- `plugin.json` and `marketplace.json` versions bumped to `0.3.0`.
- `README.md` Usage section gains three new command entries.

### Not in 0.3.0 (deferred)

- **Profile persistence for `/postmortem` scores** — deferred. v0.3.x can add this if session-score history over time proves useful.
- **Custom `/postmortem` axes** — hardcoded to five axes. No per-user customization in v0.3.0.
- **Code examples in `/tour`** — intentionally text-only. If users want implementation, that's `/chiron`'s job.
- **Agent variants of these commands** — `chiron-reviewer` as an agent is still Bundle D, deferred.
- **Bundle A v0.2.2** (profile read-loop with session-start hook) — still remaining in Bundle A.

---

## [0.2.1] — 2026-04-09

### Added — drill sizing tunables in config

Non-breaking schema extension to `~/.chiron/config.json`. `/challenge` now reads a new `drill` object for per-install drill sizing overrides:

```json
{
  "schema_version": 1,
  "voice_level": "default",
  "drill": {
    "max_lines_changed": 20,
    "max_functions_touched": 1,
    "time_minutes_min": 5,
    "time_minutes_max": 15
  }
}
```

- **`drill.max_lines_changed`** — max lines of change per drill (default **20**, clamped [1, 100])
- **`drill.max_functions_touched`** — max functions touched per drill (default **1**, clamped [1, 5])
- **`drill.time_minutes_min` / `drill.time_minutes_max`** — estimated time range (defaults 5 and 15, each clamped [1, 60], min ≤ max)

**Validation:** missing fields fall back to hardcoded defaults. Invalid values (negative, zero, non-integer, out of range) silently fall back without crashing. If `time_minutes_min > time_minutes_max`, both fields fall back to defaults.

### Changed

- `/challenge` skill's "Drill sizing requirements" block now reads the config `drill` object at invocation time and applies user overrides. If the config file or `drill` object is missing, the v0.2.0 hardcoded defaults apply unchanged.
- `/level` skill gains a brief "Tuning other config fields" section pointing users at direct-edit for non-voice fields.
- `README.md` Configuration section expanded with the full v0.2.1 schema and field documentation.
- `plugin.json` and `marketplace.json` versions bumped to `0.2.1`.

### Out of scope (explicitly)

- **No new slash commands.** Drill fields are edited directly in `~/.chiron/config.json`. A `/config show|set|reset` command was considered and deferred.
- **`drill_solved` kind selection remains binary** (constraint-pass only). The v0.1 post-review decision to drop the `/10` grading threshold is preserved.
- **No profile path override, no preferred-language field, no hint-ladder tuning.** Deferred to later sub-projects.
- **`schema_version` stays at `1`** — the addition is non-breaking; existing v0.2.0 configs (with just `voice_level`) continue working unchanged.

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
