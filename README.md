# chiron

> Teach-first mentor mode for AI coding tools.
> Socratic questions before code, drills from your own source.

**chiron** (pronounced *KAI-ron*, hard K — the centaur who mentored Achilles, Hercules, Jason, and Asclepius) turns coding requests into deliberate practice. Instead of shipping code, it asks the questions a senior engineer would ask — then walks you through the decision, hint by hint, until you've written the answer yourself.

**chiron never auto-activates.** It only fires when you explicitly type one of its slash commands. This is by design: a plugin should not change your default coding-assistant behavior without your consent.

## Why I built this

I built chiron because I was shipping tasks without growing.

My day job had turned into a loop: take a ticket, hand it to an AI, review the diff, merge, repeat. The work got done. I didn't. Over a few months I noticed I'd stopped reaching for language idioms I used to know by heart, stopped weighing trade-offs before writing code, and stopped being able to explain *why* a solution worked instead of just that it did. Code-generation tools are incredible at delivering tasks — and that's exactly the problem. They optimize for throughput, not for the engineer on the other side of the keyboard.

chiron is the tool I wanted: one that sits between me and the easy answer. Instead of handing me code, it asks the questions a senior engineer would ask, walks me through the decision one hint at a time, and makes me write the answer myself. I still ship — chiron is explicit about never refusing to help when asked — but by the time I get there, I actually understand why the solution is the solution. The point isn't to slow you down. It's to stay fluent, keep reasoning from first principles, and grow as an engineer while you're still getting your work done.

If you've felt the same drift — productive on paper, quietly stagnating underneath — this plugin is for you.

## Install

### Claude Code

```
/plugin marketplace add xDido/chiron
/plugin install chiron@chiron
```

That's it — no clone required. Claude Code fetches `.claude-plugin/marketplace.json` from GitHub directly. Verify with `/plugin` — `chiron@chiron` should show as enabled.

### Cursor, Gemini CLI, Codex CLI, and other platforms

chiron ships pre-built skills for 13 platforms. Clone the repo and copy the matching directory into your project:

```bash
git clone https://github.com/xDido/chiron.git
```

| Platform | Copy this directory |
|----------|-------------------|
| Cursor | `.cursor/skills/` |
| Gemini CLI | `.gemini/skills/` |
| Codex CLI | `.codex/skills/` |
| OpenCode | `.opencode/skills/` |
| GitHub Copilot Agents | `.agents/skills/` |
| Kiro | `.kiro/skills/` |
| Pi | `.pi/skills/` |
| OpenAI | `.openai/skills/` |
| Trae | `.trae/skills/` |
| Trae CN | `.trae-cn/skills/` |
| Rovo Dev | `.rovodev/skills/` |
| VS Code Copilot | `.github/skills/` |

Example for Cursor:

```bash
cp -r chiron/.cursor/skills/ your-project/.cursor/skills/
```

### Building from source

If you modify the source skills in `source/skills/`, rebuild all platform outputs:

```bash
bun scripts/build.js
```

This generates skill files for all 13 platforms from the single source of truth in `source/skills/`.

## Usage

Three commands, all opt-in:

### `/chiron <request>` — Socratic mentor mode for one request

Wrap a normal coding request with `/chiron` to get the teach-first treatment — clarifying questions before code, graduated hints, idiom callouts.

```
/chiron I need a Go function that fans out N workers on a channel and collects results
```

### `/challenge <file>` — drill from your own code

Point `/challenge` at a source file and it will generate 1–3 focused drills grounded in specific lines of the actual code. Each drill is a 5–15 minute change with a clear constraint. Your attempts get graded `/10` by a mentor who's read your file.

```
/challenge path/to/your/worker_pool.go
```

### `/hint` — advance one rung on the hint ladder

Inside a chiron response, `/hint` advances from **L0** (clarifying questions) → **L1** (conceptual nudge) → **L2** (named primitive) → **L3** (signature with blanks) → **L4** (full solution). Stateless — reads the most recent chiron turn and emits the next rung.

### `/level gentle | default | strict` — switch chiron's voice level *(v0.2.0)*

Dial chiron's intensity. `gentle` is warmer and more forgiving (full solution after one attempt). `default` is the baseline A+B blend. `strict` is sharper and makes you work harder before showing the canonical answer (2+ attempts required). Your choice persists globally across sessions via `~/.chiron/config.json`.

```
/level gentle
/level strict
/level default
/level          # shows current + all three options
```

Every response shows all three levels with `→` marking the currently active one. Invalid input (`/level nuclear`) shows valid options without modifying your config.

**All three levels preserve the core invariants:** never refuse to ship when asked, never moralize, never pollute artifacts. `strict` is firm, not mean.

### `/explain <question>` — compare 2–3 approaches *(v0.3.0)*

When you're facing a *"which way should I..."* question, `/explain` surfaces 2–3 named approaches with pros/cons and a qualified recommendation. Complements `/chiron` (which handles *"how do I..."* questions).

```
/explain error handling in Go: return errors vs panic vs typed errors
/explain REST vs gRPC for this internal service
/explain goroutines vs worker pool for this fan-out
```

Every response ends with a recommendation — no fence-sitting. If you just want the answer without the comparison, say *"just tell me which one"* and `/explain` will ship the recommendation directly.

### `/postmortem [optional summary]` — session-end review *(v0.3.0)*

Run at the end of a coding session to get a 3-section review: what you worked on, a `/10` score across 5 axes (design thinking, code quality, idioms, testing, engineering maturity), and one concrete thing to practice next. Read-only in v0.3.0 — scores aren't persisted yet.

```
/postmortem
/postmortem fan-out worker pool implementation
```

Graceful degradation: if there's no recent chiron activity in the conversation, `/postmortem` tells you to run a `/chiron` or `/challenge` session first.

### `/tour <topic>` — structured preamble before a task *(v0.3.0)*

Before diving into a new topic, `/tour` gives you a 3-section preamble: read-this-first doc pointers, key concepts, common junior mistakes.

```
/tour errgroup
/tour Go channels
/tour async/await in TypeScript
```

Text-only — no code examples. Intentionally brief. If you want a tutorial or implementation guidance, follow up with `/chiron` after reading the tour.

## Pervasive mode (optional)

If you want chiron voice across every coding request in a project without typing `/chiron` each time, paste this into your project's `CLAUDE.md`:

```
For coding requests in this repo, follow the teach-first mentor behavior from the chiron plugin: ask Socratic clarifying questions before writing code, use the hint ladder before giving full solutions, and call out idioms worth remembering.
```

This is opt-in via your own configuration — chiron does **not** auto-activate under any circumstances.

## Configuration (`~/.chiron/config.json`) *(v0.2.0+)*

chiron reads one configuration file: `~/.chiron/config.json`. It's created automatically the first time you run `/level <value>`. Current schema (v0.2.1):

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

**Fields:**

- **`voice_level`** — one of `"gentle"`, `"default"`, `"strict"`. Managed by `/level`. Affects voice tone, hint ladder progression, and refusal behavior.
- **`drill`** *(new in v0.2.1)* — drill sizing overrides for `/challenge`. Every field is optional; missing fields fall back to hardcoded defaults. Invalid values (negative, zero, non-integer, out of range) silently fall back without crashing.
  - `drill.max_lines_changed` — max lines of change per drill (default **20**, clamped [1, 100])
  - `drill.max_functions_touched` — max functions touched per drill (default **1**, clamped [1, 5])
  - `drill.time_minutes_min` — estimated minimum time (default **5**, clamped [1, 60])
  - `drill.time_minutes_max` — estimated maximum time (default **15**, clamped [1, 60])
  - If `time_minutes_min > time_minutes_max`, both fields silently fall back to defaults.

Edit the file directly with any text editor, or use `/level` to manage `voice_level`. If the file is missing or corrupt, chiron silently falls back to default behavior — no errors.

Future v0.2.x releases will add more fields (grading thresholds, hint tuning, etc.) without breaking the schema; existing entries stay valid.

**Not to be confused with `~/.chiron/profile.json`** — that file is the append-only drill log written by `/challenge`. They're independent files with different schemas and lifecycles.

## Philosophy

chiron is opinionated. It asks hard questions before writing code. It refuses to give you the full answer until you've tried — even if you insist. **If that's not what you want, just don't type `/chiron`.** Use `/challenge` on its own for the drill mechanism without the conversational mentor, or skip chiron entirely and keep using Claude Code normally.

The plugin's job is not to make you feel smart. It's to make you think like a senior engineer, one small decision at a time.

## Token-friendly by design

Plugins that inject thousands of tokens into every prompt cost real money — and chiron is deliberate about keeping that cost low.

**Most commands are small.** `/chiron`, `/hint`, `/explain`, `/level`, `/postmortem`, and `/tour` are each ~1,000–2,500 words. They load once when you invoke the slash command and add negligible cost to a conversation.

**`/challenge` loads language packs on demand.** Rather than bundling all 9 language packs into one massive prompt, `/challenge` detects your file's language and loads only the relevant pack at runtime. A Go challenge loads the Go pack (~200 lines); a TypeScript challenge loads the TypeScript + JavaScript packs. The rest stay on disk.

| Command | Prompt size | Approx. tokens |
|---------|-------------|----------------|
| `/chiron` | ~2,500 words | ~3.3k |
| `/challenge` (core) | ~310 lines | ~4.2k |
| + one language pack | ~200 lines | ~1.5k |
| `/explain` | ~1,000 words | ~1.4k |
| `/hint`, `/level`, `/tour`, `/postmortem` | ~1,000 words each | ~1.3–1.5k |

For comparison, `/challenge` before v0.7.0 loaded all 9 packs on every invocation (~17.5k tokens). The on-demand architecture reduced that by **59–67%**.

## Respect for `CLAUDE.md` / `AGENTS.md`

If your project's `CLAUDE.md` or `AGENTS.md` contains instructions that conflict with chiron's behavior (e.g., *"don't use Socratic questioning, just write the code"*), **your instructions win**. Every chiron skill file states this deferral explicitly at the top.

## Language packs

chiron ships with comprehensive language packs for nine languages. Run `/challenge path/to/file.<ext>` on any supported file:

| Language | Extensions | Pack |
|----------|------------|------|
| Go | `.go` | [`docs/languages/go.md`](docs/languages/go.md) |
| Rust | `.rs` | [`docs/languages/rust.md`](docs/languages/rust.md) |
| Python | `.py` | [`docs/languages/python.md`](docs/languages/python.md) |
| JavaScript | `.js`, `.mjs`, `.cjs` | [`docs/languages/javascript.md`](docs/languages/javascript.md) |
| TypeScript | `.ts`, `.tsx` | [`docs/languages/typescript.md`](docs/languages/typescript.md) |
| Java | `.java` | [`docs/languages/java.md`](docs/languages/java.md) |
| C# | `.cs` | [`docs/languages/csharp.md`](docs/languages/csharp.md) |
| Kotlin | `.kt`, `.kts` | [`docs/languages/kotlin.md`](docs/languages/kotlin.md) |
| Swift | `.swift` | [`docs/languages/swift.md`](docs/languages/swift.md) |

Each pack includes: stdlib anchors, 25–30 idioms, 20–25 common anti-patterns, mental-model deltas, and 12–17 challenge seeds. TypeScript files also match JavaScript seeds — both packs are consulted.

**Want to add Zig, Ruby, Elixir, or something else?** See [`docs/CONTRIBUTING-LANGUAGE-PACKS.md`](docs/CONTRIBUTING-LANGUAGE-PACKS.md) for the authoring guide and start from [`docs/languages/_template.md`](docs/languages/_template.md).

## Roadmap

chiron's development roadmap from empty repo to v0.1 MVP lives in [`ROADMAP.md`](ROADMAP.md). It tracks phase-by-phase progress (scaffolding → commands → language pack → verification → public release) and lists v0.2+ candidate features that are intentionally not in v0.1.

**Shipped:** `/chiron`, `/hint`, `/challenge`, `/level`, `/explain`, `/postmortem`, `/tour` — and nine language packs (Go, Rust, Python, JavaScript, TypeScript, Java, C#, Kotlin, Swift).

**On deck:**

- `chiron-reviewer` agent — review your code the way a senior engineer would
- Pre-edit hook for strict-mode guardrails
- Additional language packs (Ruby, Zig, Elixir — community-driven)

See [`ROADMAP.md`](ROADMAP.md) for the full history and future bundles.

## License

[MIT](LICENSE).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
