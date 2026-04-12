# Contributing to chiron

Thanks for your interest in contributing. chiron is a small, opinionated plugin and contributions are most valuable in three areas.

## 1. Language packs

The biggest contribution opportunity. chiron ships nine bundled language packs (Go, Rust, Python, JavaScript, TypeScript, Java, C#, Kotlin, Swift) and 11 skills including `/debug`, `/refactor`, and `/architect`. Community contributions for additional languages (Zig, Ruby, Elixir, etc.) are most welcome. A new language is typically a single-file PR against `docs/languages/<language>.md` plus a mirror into `.claude/skills/challenge/SKILL.md`.

See [`docs/CONTRIBUTING-LANGUAGE-PACKS.md`](docs/CONTRIBUTING-LANGUAGE-PACKS.md) for the detailed authoring guide. Use [`docs/languages/_template.md`](docs/languages/_template.md) as a starting point.

A comprehensive language pack includes (see the six bundled packs for the target density):

- **10–12 stdlib / ecosystem anchors** — doc pointers to the most important libraries and concepts
- **25–30 idioms** — stdlib primitives, architectural patterns, and design principles with concrete examples
- **20–25 anti-patterns** — common pitfalls with the bug, the explanation, and the fix
- **20–25 mental-model deltas** — things that work differently in this language than in C-family defaults
- **12–17 challenge seeds** — pre-authored drills that `/challenge` pattern-matches against. Each seed needs a `Signal` (prose or pseudo-regex) and a `Drill` (task + constraint)

Smaller starter packs are fine too — the authoring guide has the full bar and minimums.

Submit the pack as a PR against `main`. Maintainers will review for accuracy and tone.

## 2. Skill improvements

The newer skill types — `/debug`, `/refactor`, and `/architect` — are open to community variations and improvements. Useful contributions include additional hypothesis templates for the debugging playbook, new named refactorings for the refactoring catalog, additional quality attributes or decision categories for the architecture decisions reference, and corrections to the L0–L4 ladder wording. Submit improvements as a PR against the relevant source file in `source/skills/` and the corresponding reference document in `source/skills/debug/`, `source/skills/architect/`, or wherever the reference lives. Run `bun scripts/build.js` to regenerate all platform outputs before opening the PR.

## 3. Bug reports

Use the bug issue template. Include:

- Your OS and Claude Code version
- The exact command you ran
- What you expected
- What happened instead
- Any relevant excerpt from `~/.chiron/profile.json` (if applicable)

## 4. Golden transcript adherence

chiron has an acceptance contract at [`docs/GOLDEN-TRANSCRIPT.md`](docs/GOLDEN-TRANSCRIPT.md). If you find a case where chiron's behavior diverges from the transcript **in shape** (exact wording will vary — structure must not), please file a bug. This is how we keep the plugin honest.

## What's not welcome

- **Scope creep beyond the roadmap.** chiron is intentionally small. New slash commands outside the shipped set (`/chiron`, `/hint`, `/challenge`, `/level`, `/explain`, `/postmortem`, `/tour`, `/debug`, `/refactor`, `/architect`) need to go through a brainstorm/plan cycle first. Open an issue before the PR.
- **Tone softening of the default voice.** The A+B voice blend (strict content, neutral framing) is the product default. Users who want gentler mentoring can run `/level gentle` — suggestions to soften the `default` level itself will be declined.
- **Speculative configurability.** `~/.chiron/config.json` ships today with `voice_level` and `drill` fields (v0.2.0–v0.2.1). New config fields need a real use case, not "someone might want to tune this."
- **Removing the never-refuse rule.** Anti-pattern #2 (never refuse to ship when asked) is inviolable at every level. PRs that walk this back will be closed.

## Development setup

```bash
git clone https://github.com/xDido/chiron.git
```

Then in Claude Code:

```
/plugin marketplace add /absolute/path/to/chiron
/plugin install chiron@chiron
```

Verify with `/plugin` — `chiron@chiron` should show as enabled. After making changes to skill files, use `/plugin` to disable and re-enable the plugin to reload.

Test your changes with the three commands (`/chiron`, `/challenge`, `/hint`) in a fresh Claude Code session. For language pack work, create a test fixture in `tests/fixtures/<language>/` and verify `/challenge <fixture>` finds your seeds and generates correct drills.

## Code of Conduct

See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Short version: be kind, be concrete, be patient with new contributors.
