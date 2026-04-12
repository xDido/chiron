# chiron

> Teach-first mentor mode for AI coding tools.
> Socratic questions before code, drills from your own source.

**chiron** (pronounced *KAI-ron*, hard K — the centaur who mentored Achilles, Hercules, Jason, and Asclepius) turns coding requests into deliberate practice. Instead of shipping code, it asks the questions a senior engineer would ask — then walks you through the decision, hint by hint, until you've written the answer yourself.

**chiron never auto-activates.** It only fires when you explicitly type one of its slash commands. This is by design: a plugin should not change your default coding-assistant behavior without your consent.

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

**Start here.** Run `/teach-chiron` once per project. It scans your codebase and writes `.chiron-context.md` — a persistent reference all other commands read instead of re-scanning. Every other command prompts you to run it if missing; re-run anytime to refresh.

```
/teach-chiron
```

Then use any of the ten commands below. Every command preserves three invariants: **never refuses to ship when asked**, **never moralizes**, **never pollutes code with teaching content** (lessons live in chat).

- **`/chiron <request>`** — Socratic mentor mode. Clarifying questions before code, graduated hints (L0–L4), idiom callouts. *Example:* `/chiron implement a worker pool in Go`
- **`/challenge <file>`** — Drills grounded in specific lines of your code, 5–15 min each, graded `/10`. Reads `~/.chiron/profile.json` to bias toward recurring weaknesses. *Example:* `/challenge path/to/worker_pool.go`
- **`/hint`** — Advance one rung on the hint ladder: L0 clarifying → L1 concept → L2 named API → L3 signature with blanks → L4 full solution. Stateless.
- **`/level gentle|default|strict`** *(v0.2.0)* — Dial chiron's voice intensity. Persists via `~/.chiron/config.json`. `strict` is firm, not mean. *Example:* `/level strict`
- **`/explain <question>`** *(v0.3.0)* — Compare 2–3 approaches with trade-offs and a qualified recommendation. Never fence-sits. *Example:* `/explain REST vs gRPC for this service`
- **`/postmortem [summary]`** *(v0.3.0)* — Session-end review with `/10` across 5 axes (design, code, idioms, testing, maturity). Reads profile for cross-session trends. *Example:* `/postmortem`
- **`/tour <topic>`** *(v0.3.0)* — Structured preamble: read-first doc pointers, key concepts, common junior mistakes. Text-only, no code. *Example:* `/tour Go channels`
- **`/debug <error or file>`** *(v0.13.0)* — Hypothesis-driven debugging: observe → categorize → hypothesize → verify → fix. Opts *into* methodology teaching (chiron's built-in debug handler skips Socratic for speed). *Example:* `/debug "connection refused after deploy"`
- **`/refactor <file or smell>`** *(v0.13.0)* — Identify named code smells and guide refactoring transformations. Changes structure without changing behavior. *Example:* `/refactor path/to/handler.go`
- **`/architect <decision>`** *(v0.13.0)* — ADRs with quality-attribute trade-off analysis. The only skill that deliberately writes a file (the ADR is a project document, not teaching content). *Example:* `/architect "event sourcing for order history?"`

**How the commands relate:**
- `/chiron` handles *"how do I..."*. `/explain` handles *"which way should I..."*. `/tour` gives background *before* you start. `/postmortem` reviews *after* you finish.
- `/challenge` drills patterns you know. `/chiron` teaches new ones.
- Inside any chiron response, `/hint` advances one rung on the ladder. Saying *"just write it"* always gets the full answer immediately.

## Pervasive mode (optional)

If you want chiron voice across every coding request in a project without typing `/chiron` each time, paste this into your project's `CLAUDE.md`:

```
For coding requests in this repo, follow the teach-first mentor behavior from the chiron plugin: ask Socratic clarifying questions before writing code, use the hint ladder before giving full solutions, and call out idioms worth remembering.
```

This is opt-in via your own configuration — chiron does **not** auto-activate under any circumstances.

## Configuration (`~/.chiron/config.json`) *(v0.2.0+)*

chiron reads one configuration file: `~/.chiron/config.json`. It's created automatically the first time you run `/level <value>`. Current schema (v0.13.0):

```json
{
  "schema_version": 1,
  "voice_level": "default",
  "drill": {
    "max_lines_changed": 20,
    "max_functions_touched": 1,
    "time_minutes_min": 5,
    "time_minutes_max": 15
  },
  "teaching": {
    "depth": 5,
    "theory_ratio": 3,
    "idiom_strictness": 5
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

- **`teaching`** *(new in v0.12.0)* — teaching intensity overrides. Every field is optional; missing fields fall back to defaults. Read by `/chiron`, `/challenge`, `/explain`, and `/tour`.
  - `teaching.depth` — how deep Socratic questioning goes (default **5**, clamped [1, 10]). 1 = quick answers, 10 = full architectural discussion before code.
  - `teaching.theory_ratio` — how much theory accompanies code (default **3**, clamped [1, 10]). 1 = practical-only, 10 = theory-enriched with historical context.
  - `teaching.idiom_strictness` — how pedantic about language conventions (default **5**, clamped [1, 10]). 1 = any working approach is fine, 10 = must use canonical idiomatic form.

Future v0.2.x releases will add more fields (grading thresholds, hint tuning, etc.) without breaking the schema; existing entries stay valid.

**Not to be confused with `~/.chiron/profile.json`** — that file is the append-only drill log written by `/challenge`. They're independent files with different schemas and lifecycles.

### `.chiron-context.md` (project root) *(v0.10.0)*

Generated by `/teach-chiron`. Contains a comprehensive snapshot of the project — structure, dependencies, architecture, patterns, config. All chiron skills read this instead of re-scanning the codebase.

- **Auto-generated** — don't edit manually
- **Project-specific** — lives in the project root, not global
- **Add to `.gitignore`** — it's machine-generated and developer-specific
- **Delete to refresh** — next `/teach-chiron` run regenerates it

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
| `/challenge` (core) | ~340 lines | ~4.5k |
| + one language pack | ~200 lines | ~1.5k |
| `/explain` | ~1,000 words | ~1.4k |
| `/hint`, `/level`, `/tour`, `/postmortem` | ~1,000 words each | ~1.3–1.5k |
| `/debug` | ~2,200 words | ~2.9k |
| `/refactor` | ~2,100 words | ~2.8k |
| `/architect` | ~2,300 words | ~3.0k |

For comparison, `/challenge` before v0.7.0 loaded all 9 packs on every invocation (~17.5k tokens). The on-demand architecture reduced that by **59–67%**.

**`/teach-chiron` scans once, all skills reuse.** The first `/teach-chiron` invocation reads the full codebase and writes `.chiron-context.md`. Every subsequent skill invocation reads that one file instead of re-scanning. No redundant reads across sessions.

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

## Backend concept packs *(v0.8.0+)*

Beyond language idioms, `/challenge` also detects backend patterns from your imports and loads domain-specific concept packs alongside the language pack. This happens automatically — no extra flags needed.

| Pack | Domain | Seeds | Auto-detects |
|------|--------|-------|--------------|
| `database.md` | SQL/NoSQL patterns | 14 | `database/sql`, `sqlalchemy`, `prisma`, `hibernate`, ... |
| `api-design.md` | HTTP/REST/gRPC | 14 | `net/http`, `express`, `fastapi`, `spring-web`, ... |
| `reliability.md` | Retries, circuit breakers, timeouts | 12 | `gobreaker`, `tenacity`, `resilience4j`, `Polly`, ... |
| `observability.md` | Logging, metrics, tracing | 12 | `zap`, `pino`, `slf4j`, `opentelemetry`, ... |
| `security.md` | Auth, secrets, validation | 12 | `crypto`, `jwt`, `bcrypt`, `spring-security`, ... |
| `testing.md` | Integration & contract testing | 12 | `testcontainers`, `supertest`, `wiremock`, ... |
| `messaging.md` | Queues, events, pub/sub | 12 | `kafka-go`, `amqplib`, `celery`, `spring-kafka`, ... |
| `caching.md` | Cache patterns | 12 | `go-redis`, `ioredis`, `caffeine`, `StackExchange.Redis`, ... |
| `configuration.md` | Env vars, feature flags, config validation | 10 | `viper`, `dotenv`, `pydantic_settings`, `IOptions`, ... |
| `concurrency.md` | Race conditions, locks, thread safety | 12 | `sync.Mutex`, `threading`, `java.util.concurrent`, `tokio::sync`, ... |
| `realtime.md` | WebSockets, SSE, streaming | 10 | `gorilla/websocket`, `socket.io`, `SignalR`, `tokio-tungstenite`, ... |
| `storage.md` | File/object storage, uploads | 10 | `boto3`, `@aws-sdk/client-s3`, `multer`, `Azure.Storage.Blobs`, ... |

Up to 2 concept packs are loaded per invocation (on top of the language pack). If your file doesn't import any backend libraries, only the language pack is used.

## Roadmap

chiron's development roadmap from empty repo to v0.1 MVP lives in [`ROADMAP.md`](ROADMAP.md). It tracks phase-by-phase progress (scaffolding → commands → language pack → verification → public release) and lists v0.2+ candidate features that are intentionally not in v0.1.

**Shipped:** `/teach-chiron`, `/chiron`, `/hint`, `/challenge`, `/level`, `/explain`, `/postmortem`, `/tour`, `/debug`, `/refactor`, `/architect` — eleven skills, nine language packs, twelve backend concept packs, seven reference files, and persistent project context.

**On deck:**

- `chiron-reviewer` agent — review your code the way a senior engineer would
- Pre-edit hook for strict-mode guardrails
- Additional language packs (Ruby, Zig, Elixir — community-driven)

See [`ROADMAP.md`](ROADMAP.md) for the full history and future bundles.

## References

Chiron's design is grounded in pedagogical research and prompt engineering literature. Every core mechanism — the hint ladder, voice levels, drills, grading, session review, profile tracking — is backed by a specific finding from the references below. The full mapping of research to chiron mechanisms lives in [`source/skills/chiron/references/pedagogy.md`](source/skills/chiron/references/pedagogy.md).

### Pedagogical research

- **[Ebbinghaus, H. (1885).](https://psychclassics.yorku.ca/Ebbinghaus/index.htm)** *Über das Gedächtnis: Untersuchungen zur experimentellen Psychologie.* — The forgetting curve. Informs chiron's profile tracking and recency weighting.
- **[Vygotsky, L.S. (1978).](https://archive.org/details/mindinsocietydev00vygo)** *Mind in Society: The Development of Higher Psychological Processes.* Harvard University Press. — Zone of Proximal Development. The hint ladder targets ZPD boundaries: L0 probes them, L1–L3 operate within them, L4 steps outside them.
- **[Wood, D., Bruner, J.S., & Ross, G. (1976).](https://pubmed.ncbi.nlm.nih.gov/932126/)** The Role of Tutoring in Problem Solving. *Journal of Child Psychology and Psychiatry, 17*, 89–100. — Coined "scaffolding." Chiron's hint ladder is contingent tutoring in action — reduce help as the learner succeeds, offer more when they fail.
- **[Deci, E.L., & Ryan, R.M. (1985).](https://link.springer.com/book/10.1007/978-1-4899-2271-7)** *Intrinsic Motivation and Self-Determination in Human Behavior.* Plenum Press. — Self-Determination Theory. The never-refuse rule preserves learner autonomy, which drives intrinsic motivation.
- **[Sweller, J. (1988).](https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog1202_4)** Cognitive Load During Problem Solving: Effects on Learning. *Cognitive Science, 12*(2), 257–285. — Cognitive Load Theory. Chiron's progressive disclosure (one rung at a time) manages extraneous load and frees germane load for learning.
- **[Ericsson, K.A., Krampe, R.T., & Tesch-Römer, C. (1993).](https://psycnet.apa.org/record/1993-40718-001)** The Role of Deliberate Practice in the Acquisition of Expert Performance. *Psychological Review, 100*(3), 363–406. — Deliberate practice. `/challenge` drills are targeted, feedback-equipped, edge-of-ability tasks — the four conditions for expertise development.
- **[Chi, M.T.H., De Leeuw, N., Chiu, M., & LaVancher, C. (1994).](https://onlinelibrary.wiley.com/doi/10.1207/s15516709cog1803_3)** Eliciting Self-Explanations Improves Understanding. *Cognitive Science, 18*(3), 439–477. — Self-explanation effect. L0 clarifying questions force learners to articulate their own thinking before receiving guidance.
- **[Kalyuga, S., Ayres, P., Chandler, P., & Sweller, J. (2003).](https://www.tandfonline.com/doi/abs/10.1207/S15326985EP3801_4)** The Expertise Reversal Effect. *Educational Psychologist, 38*(1), 23–31. — Instructional techniques that help novices harm experts. Chiron's voice levels (gentle/default/strict) and domain-vocabulary detection address this directly.
- **[Roediger, H.L., & Karpicke, J.D. (2006).](https://pubmed.ncbi.nlm.nih.gov/26151629/)** The Power of Testing Memory: Basic Research and Implications for Educational Practice. *Perspectives on Psychological Science, 1*(3), 181–210. — Testing effect. Retrieval practice outperforms re-study by 50–80% for long-term retention. Drills are a retrieval practice.
- **[Cepeda, N.J., Pashler, H., Vul, E., Wixted, J.T., & Rohrer, D. (2006).](https://pubmed.ncbi.nlm.nih.gov/16719566/)** Distributed Practice in Verbal Recall Tasks: A Review and Quantitative Synthesis. *Psychological Bulletin, 132*(3), 354–380. — Modern meta-analysis of spacing effect. Profile read-loop's recency weighting (30-day window, 50% weight for older entries) follows this research.
- **[Paul, R., & Elder, L. (2006).](https://www.criticalthinking.org/store/products/the-thinkers-guide-to-socratic-questioning/231)** *The Thinker's Guide to the Art of Socratic Questioning.* Foundation for Critical Thinking. — Six types of Socratic questions. `/chiron`'s L0 questions draw from the clarification, assumptions, and implications categories most often.
- **[Bjork, E.L., & Bjork, R.A. (2011).](https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/04/EBjork_RBjork_2011.pdf)** Making Things Hard on Yourself, But in a Good Way: Creating Desirable Difficulties to Enhance Learning. In *Psychology and the Real World* (pp. 56–64). Worth Publishers. — The hint ladder withholding answers is a desirable difficulty; never refusing when asked keeps it from becoming undesirable.
- **[Kapur, M. (2014).](https://onlinelibrary.wiley.com/doi/10.1111/cogs.12107)** Productive Failure in Learning Math. *Cognitive Science, 38*(4), 627–658. — Struggling before receiving instruction yields deeper learning. L3's signature-with-blanks creates exactly this kind of productive failure.

### Prompt engineering research

- **[Wei, J., Wang, X., Schuurmans, D., Bosma, M., Ichter, B., Xia, F., Chi, E., Le, Q., & Zhou, D. (2022).](https://arxiv.org/abs/2201.11903)** Chain-of-Thought Prompting Elicits Reasoning in Large Language Models. *arXiv:2201.11903.* — The hint ladder's progressive reasoning steps are chain-of-thought prompting applied to teaching.
- **[Wang, X., Wei, J., Schuurmans, D., Le, Q., Chi, E., Narang, S., Chowdhery, A., & Zhou, D. (2022).](https://arxiv.org/abs/2203.11171)** Self-Consistency Improves Chain of Thought Reasoning in Language Models. *arXiv:2203.11171.* — Sampling multiple reasoning paths and taking consensus reduces noise. `/challenge`'s self-consistency grading runs the evaluation three times internally before delivering.
- **[Diao, S., Wang, P., Lin, Y., Pan, R., Liu, X., & Zhang, T. (2023).](https://arxiv.org/abs/2302.12246)** Active Prompting with Chain-of-Thought for Large Language Models. *arXiv:2302.12246.* — Uncertainty-targeted clarification beats uniform questioning. `/chiron`'s ambiguity detection at L0 fires one clarification cycle when the user's answer is vague, surfacing 2–3 interpretations.
- **[Shinn, N., Cassano, F., Labash, B., Gopinath, A., Narasimhan, K., & Yao, S. (2023).](https://arxiv.org/abs/2303.11366)** Reflexion: Language Agents with Verbal Reinforcement Learning. *arXiv:2303.11366.* — Persistent memory across episodes enables targeted improvement. Chiron's profile read-loop (`/challenge` + `/postmortem`) is Reflexion adapted for deliberate practice — past failures inform future drill selection.

### Additional inspirations

- **[taste-skill](https://github.com/Leonxlnx/taste-skill) by Leonxlnx** — frontend design-quality plugin whose techniques (anti-pattern enumeration, pre-flight checklists, named pattern arsenal, output completeness enforcement, control dials, self-verification loops, multi-level specification) were adapted for chiron's backend teaching context in v0.12.0.
- **[Prompt Engineering Guide](https://github.com/dair-ai/Prompt-Engineering-Guide) by dair-ai** — comprehensive reference on prompting techniques that informed v0.14.0's self-consistency grading, Active-Prompt ambiguity detection, and context engineering audit.

### How to cite chiron

If you use chiron in research or writing, please cite:

```bibtex
@software{chiron2026,
  author = {Haitham, Ahmed},
  title = {Chiron: A Teach-First Mentor Plugin for AI Coding Tools},
  year = {2026},
  url = {https://github.com/xDido/chiron}
}
```

## License

[MIT](LICENSE).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
