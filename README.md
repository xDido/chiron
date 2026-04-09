# chiron

> Teach-first mentor mode for Claude Code.
> Socratic questions before code, drills from your own source.

**chiron** (pronounced *KAI-ron*, hard K — the centaur who mentored Achilles, Hercules, Jason, and Asclepius) turns coding requests into deliberate practice. Instead of shipping code, it asks the questions a senior engineer would ask — then walks you through the decision, hint by hint, until you've written the answer yourself.

**chiron never auto-activates.** It only fires when you explicitly type one of its slash commands. This is by design: a plugin should not change your default coding-assistant behavior without your consent.

> *Hero GIFs go here.*
> *Clip A — `/chiron` Socratic walkthrough.*
> *Clip B — `/challenge` drill on real Go code.*

## Install

```bash
git clone https://github.com/Dido/chiron.git
cd chiron
claude plugins install .
```

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

If your project's `CLAUDE.md` or `AGENTS.md` contains instructions that conflict with chiron's behavior (e.g., *"don't use Socratic questioning, just write the code"*), **your instructions win**. Every chiron command file states this deferral explicitly at the top.

## Language packs

v0.1 ships with a Go language pack at `docs/languages/go.md`. More languages are welcomed as community contributions.

**Want to add Rust, TypeScript, Python, Zig, or something else?** See [`docs/CONTRIBUTING-LANGUAGE-PACKS.md`](docs/CONTRIBUTING-LANGUAGE-PACKS.md) for the authoring guide and start from [`docs/languages/_template.md`](docs/languages/_template.md). A new language pack is usually a single-file PR.

## Roadmap (v0.2+)

Features intentionally NOT in v0.1, documented so contributors know what's planned:

- `/explain` — compare 2+ approaches with trade-offs
- `/postmortem` — session-end `/10` across design, code quality, idioms, testing, engineering maturity
- `/tour` — "before each task" structured preamble
- `/level` — gentle / default / strict voice dial
- Cross-session learner profile read-loop (surface recurring weaknesses on session start)
- Rust / TypeScript / Python / Zig language packs
- `chiron-reviewer` agent — review your code the way a senior engineer would
- Pre-edit hook for strict-mode guardrails

## License

[MIT](LICENSE).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
