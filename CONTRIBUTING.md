# Contributing to chiron

Thanks for your interest in contributing. chiron is a small, opinionated plugin and contributions are most valuable in three areas.

## 1. Language packs

The biggest contribution opportunity. v0.1 ships only with Go. Adding a new language is typically a single-file PR against `docs/languages/<language>.md`.

See [`docs/CONTRIBUTING-LANGUAGE-PACKS.md`](docs/CONTRIBUTING-LANGUAGE-PACKS.md) for the detailed authoring guide. Use [`docs/languages/_template.md`](docs/languages/_template.md) as a starting point.

A good language pack includes:

- **5 canonical idioms** — stdlib primitives, architectural patterns, or design principles with concrete examples
- **5 common pitfalls** — anti-patterns the mentor should flag
- **Mental-model deltas** — things that work differently in this language than in C-family defaults
- **Challenge seeds** — at least 3 seed entries that `/challenge` can pattern-match against. Each seed needs a `Signal` (regex or structural description) and a `Drill` (task + constraint)

Submit the pack as a PR against `main`. Maintainers will review for accuracy and tone.

## 2. Bug reports

Use the bug issue template. Include:

- Your OS and Claude Code version
- The exact command you ran
- What you expected
- What happened instead
- Any relevant excerpt from `~/.chiron/profile.json` (if applicable)

## 3. Golden transcript adherence

chiron has an acceptance contract at [`docs/GOLDEN-TRANSCRIPT.md`](docs/GOLDEN-TRANSCRIPT.md). If you find a case where chiron's behavior diverges from the transcript **in shape** (exact wording will vary — structure must not), please file a bug. This is how we keep the plugin honest.

## What's not welcome (for v0.1)

- **Scope expansion.** chiron is intentionally small. New commands (`/explain`, `/postmortem`, `/tour`, `/level`) are in the v0.2 roadmap and not accepted in v0.1 PRs.
- **Tone softening.** The A+B voice blend (strict content, neutral framing) is the product. Suggestions to soften it into "friendlier" territory will be declined — chiron is opinionated and users who want gentler mentoring should use a different plugin.
- **Feature flags and configurability.** v0.1 ships with one voice. Adding `/level gentle` or config files is deferred until there's strong community signal.

## Development setup

```bash
git clone https://github.com/Dido/chiron.git
cd chiron
claude plugins install .
```

Test your changes with the three commands (`/chiron`, `/challenge`, `/hint`) in a fresh Claude Code session. For language pack work, create a test fixture in `tests/fixtures/<language>/` and verify `/challenge <fixture>` finds your seeds and generates correct drills.

## Code of Conduct

See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Short version: be kind, be concrete, be patient with new contributors.
