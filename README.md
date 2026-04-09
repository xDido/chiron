# chiron

> Teach-first mentor mode for Claude Code.
> Socratic questions before code, drills from your own source.

**chiron** (pronounced *KAI-ron*, hard K — the centaur who mentored Achilles, Hercules, Jason, and Asclepius) turns coding requests into deliberate practice. Instead of shipping code, it asks the questions a senior engineer would ask — then walks you through the decision, hint by hint, until you've written the answer yourself.

**chiron never auto-activates.** It only fires when you explicitly type one of its slash commands. This is by design: a plugin should not change your default coding-assistant behavior without your consent.

<!-- Hero GIFs: two ~30s clips will be embedded here before v0.1.0 release -->
<!--   Clip A: /chiron Socratic walkthrough (matches the golden transcript opening) -->
<!--   Clip B: /challenge drill on tests/fixtures/go/worker_pool_bad.go -->

*Once recorded, embed as `![alt](path/to/gif.gif)` after this line.*

## Install

**Option A — directly from GitHub** (recommended once you're comfortable):

```bash
claude plugins marketplace add xDido/chiron
claude plugins install chiron@chiron-dev
```

**Option B — from a local clone** (for development or offline install):

```bash
git clone https://github.com/xDido/chiron.git
cd chiron
claude plugins marketplace add ./
claude plugins install chiron@chiron-dev
```

Verify: `claude plugins list` should show `chiron@chiron-dev` as enabled.

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

## Pervasive mode (optional)

If you want chiron voice across every coding request in a project without typing `/chiron` each time, paste this into your project's `CLAUDE.md`:

```
For coding requests in this repo, follow the teach-first mentor behavior from the chiron plugin: ask Socratic clarifying questions before writing code, use the hint ladder before giving full solutions, and call out idioms worth remembering.
```

This is opt-in via your own configuration — chiron does **not** auto-activate under any circumstances.

## Philosophy

chiron is opinionated. It asks hard questions before writing code. It refuses to give you the full answer until you've tried — even if you insist. **If that's not what you want, just don't type `/chiron`.** Use `/challenge` on its own for the drill mechanism without the conversational mentor, or skip chiron entirely and keep using Claude Code normally.

The plugin's job is not to make you feel smart. It's to make you think like a senior engineer, one small decision at a time.

## Respect for `CLAUDE.md` / `AGENTS.md`

If your project's `CLAUDE.md` or `AGENTS.md` contains instructions that conflict with chiron's behavior (e.g., *"don't use Socratic questioning, just write the code"*), **your instructions win**. Every chiron skill file states this deferral explicitly at the top.

## Language packs

v0.1 ships with a Go language pack at `docs/languages/go.md`. More languages are welcomed as community contributions.

**Want to add Rust, TypeScript, Python, Zig, or something else?** See [`docs/CONTRIBUTING-LANGUAGE-PACKS.md`](docs/CONTRIBUTING-LANGUAGE-PACKS.md) for the authoring guide and start from [`docs/languages/_template.md`](docs/languages/_template.md). A new language pack is usually a single-file PR.

## Roadmap

chiron's development roadmap from empty repo to v0.1 MVP lives in [`ROADMAP.md`](ROADMAP.md). It tracks phase-by-phase progress (scaffolding → commands → language pack → verification → public release) and lists v0.2+ candidate features that are intentionally not in v0.1.

**v0.2+ candidates at a glance:**

- `/explain` — compare 2+ approaches with trade-offs
- `/postmortem` — session-end `/10` across design, code quality, idioms, testing, engineering maturity
- Profile read-loop — surface recurring weaknesses on session start
- Rust / TypeScript / Python / Zig language packs (community contributions welcomed)
- `chiron-reviewer` agent — review your code the way a senior engineer would
- `/level` — gentle / default / strict voice dial
- Pre-edit hook for strict-mode guardrails

See [`ROADMAP.md`](ROADMAP.md) for the full list and the validation gate that must pass before v0.2 work starts.

## License

[MIT](LICENSE).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
