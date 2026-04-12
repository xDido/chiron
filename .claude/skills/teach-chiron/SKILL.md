---
name: teach-chiron
description: One-time comprehensive project scan. Reads every important file in the codebase and writes .chiron-context.md — the persistent context file that all other chiron skills reference instead of re-scanning.
user-invocable: true
allowed-tools: Read, Write, Grep, Glob, LS, Bash
---

# /teach-chiron — generate project context for chiron

Run this once per project. It scans the full codebase and writes `.chiron-context.md` — a comprehensive reference that all other chiron skills read instead of re-scanning the project.

**Re-run anytime** to refresh the context (e.g., after major refactoring, adding new modules, or changing project structure).

```
$ARGUMENTS
```

If arguments are provided, treat them as a hint about what changed or what to focus on. Otherwise, do a full scan.

---

## CRITICAL — user instructions always win

Check `CLAUDE.md` or `AGENTS.md` first. If user instructions conflict with this command's behavior, follow the user.

---

## What to include vs. skip

### High signal (ALWAYS include)
- Files that define the **API surface** — routes, handlers, controllers, gRPC service definitions
- Files that define **data models** — DB schemas, ORM models, types, interfaces, protobuf/OpenAPI specs
- Files that **wire the app together** — DI/bootstrap, middleware registration, config loading, app factory
- Files with **business logic** — services, use cases, domain logic, core algorithms
- **Test files** — at least enough to understand the testing patterns (framework, mocking, fixtures)
- **Config files** — project manifest, linter config, CI/CD, Docker, env examples
- **Documentation** — README, CLAUDE.md, AGENTS.md, architecture docs

### Low signal (SKIP these)
- **Generated code** — `node_modules/`, `vendor/`, `dist/`, `build/`, `.next/`, `target/`, `bin/`, `obj/`
- **Lock files** — `package-lock.json`, `yarn.lock`, `go.sum`, `Cargo.lock`, `pom.xml` dependency tree
- **Binary files** — images, fonts, compiled assets, `.wasm`, `.so`, `.dll`
- **IDE config** — `.vscode/`, `.idea/`, `*.code-workspace`
- **Git internals** — `.git/`
- **Chiron's own files** — `.claude/skills/`, `.cursor/skills/`, etc. (don't scan yourself)
- **Auto-generated migrations** — unless they reveal the current schema; prefer the model files instead
- **Duplicate/symlinked content** — if the same code appears via symlinks or copies, note it once
- **Test fixtures/snapshots** — large JSON fixtures, snapshot files (note their existence, don't dump contents)
- **Minified/bundled code** — `.min.js`, `bundle.*`, webpack output

### How to judge borderline files
Ask: "If a mentor were onboarding to this project, would they need to read this file to give good advice?" If yes, include it. If it's just boilerplate they'd skip, skip it.

---

## Scan procedure

### Phase 1 — Map the project

1. Use Glob to find all source files (excluding generated/vendor directories):
   - `**/*.{go,rs,py,js,ts,jsx,tsx,java,cs,kt,swift,rb,ex,exs,zig,scala,clj}`
   - Exclude: `node_modules/**`, `vendor/**`, `dist/**`, `build/**`, `.next/**`, `target/**`, `bin/**`, `obj/**`, `__pycache__/**`
2. Use Glob to find config/infra files:
   - `**/*.{json,yaml,yml,toml,xml}`, `**/Makefile`, `**/Dockerfile*`, `**/docker-compose*`, `**/.env*`
   - Exclude lock files and `node_modules`
3. Use LS to list the full directory tree (3 levels deep)
4. Read `~/.chiron/config.json` if it exists (for voice level and drill config)

**Result:** A complete file inventory. Count the source files. For projects with >100 source files, prioritize by the rules above.

### Phase 2 — Read project configuration (read ALL that exist)

5. **Project manifest:** `package.json`, `go.mod`, `Cargo.toml`, `pom.xml`, `*.csproj`, `build.gradle`, `Package.swift`, `pyproject.toml`, `requirements.txt`, `Gemfile`, `mix.exs`
6. **README:** `README.md` or `README.*` (full file)
7. **AI config:** `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `GEMINI.md`, `.github/copilot-instructions.md`
8. **Docker/infra:** `Dockerfile`, `docker-compose.yml`, `.env.example`, `fly.toml`, `render.yaml`, `railway.json`
9. **CI/CD:** `.github/workflows/*.yml`, `Makefile`, `Justfile`, `.gitlab-ci.yml`, `Jenkinsfile`
10. **Code quality:** `tsconfig.json`, `.eslintrc*`, `prettier*`, `rustfmt.toml`, `.golangci.yml`, `ruff.toml`, `.editorconfig`

### Phase 3 — Read source code (the important files)

Read files in this priority order. For each file, note: path, purpose (1 line), key exports/functions/classes.

11. **Entry points** — `main.go`, `cmd/*/main.go`, `src/main.*`, `app.py`, `manage.py`, `index.ts`, `index.js`, `server.*`, `Program.cs`, `App.kt`, `main.swift`, `lib.rs`
12. **Route/handler definitions** — files containing HTTP routes, API endpoints, controller classes, gRPC service implementations. Use Grep to find: `router`, `app.get`, `app.post`, `@app.route`, `@GetMapping`, `@Controller`, `HandleFunc`, `axum::Router`
13. **Data layer** — database models, ORM definitions, repository/DAO classes, schema files. Use Grep to find: `CREATE TABLE`, `@Entity`, `db.Model`, `Schema`, `migration`, `repository`
14. **Core business logic** — service classes, domain modules, use case implementations. Look in: `services/`, `domain/`, `core/`, `internal/`, `lib/`, `src/`
15. **Config/bootstrap** — dependency injection setup, middleware chains, app factory, config loading. Look in: `config/`, `bootstrap/`, `startup.*`, `container.*`
16. **Shared types** — interfaces, DTOs, API contracts, protobuf definitions, OpenAPI/Swagger specs. Look in: `types/`, `models/`, `dto/`, `proto/`, `api/`
17. **Test patterns** — read 3-5 test files from different areas to understand: testing framework, mocking approach, fixture patterns, assertion style. Look in: `*_test.go`, `*.test.ts`, `test_*.py`, `*Test.java`, `*Spec.kt`

**For large projects (>50 source files):** You won't read every file. Read ALL files from categories 11-16, and a representative sample from each directory. The goal is complete coverage of architecture, not line-by-line reading.

### Phase 4 — Analyze and write `.chiron-context.md`

Synthesize everything into a comprehensive context file. Write to the project root:

```markdown
# Chiron project context
Auto-generated by /teach-chiron — re-run to refresh. Delete to force a full rescan.

## Project
- **Name:** <project name from manifest>
- **Languages:** <all detected, primary first>
- **Framework:** <web framework, ORM, test framework, etc.>
- **Test runner:** <test command and framework>
- **Build system:** <build command and tool>
- **Package manager:** <with version if detectable>
- **Runtime:** <language version from manifest or config>
- **Repository:** <git remote URL if available>

## Dependencies (key libraries)
<ALL important dependencies grouped by category>
Format per group:
- **Category:** lib-name (version) — one-line purpose
Example:
- **HTTP:** gin v1.9 — web framework
- **DB:** sqlx v0.7 — async SQL toolkit
- **Auth:** jwt-go v5 — JWT token handling
- **Test:** testify v1.9 — assertions and mocking

## Directory structure
<full tree, 3 levels deep, with one-line descriptions for every directory>
Skip: node_modules, vendor, dist, build, .git, __pycache__

## Source file map
<every meaningful source file with a one-line description>
Format: `path/to/file.ext` — what it does, key exports
Skip generated/vendor/lock files. Group by directory.

## Entry points
<every way the application starts, with file paths>
- **HTTP server:** `cmd/api/main.go` — starts gin on :8080, loads routes from `internal/routes/`
- **CLI:** `cmd/cli/main.go` — cobra-based CLI with subcommands
- **Worker:** `cmd/worker/main.go` — background job processor

## API surface
<every HTTP route, gRPC service, CLI command, or public interface>
Format: `METHOD /path` → `handler_file.go:FunctionName` — description
Group by resource or domain.

## Data layer
- **Database:** <type — PostgreSQL, MongoDB, SQLite, etc.>
- **ORM/Driver:** <library used>
- **Models:** <list of model files with table/collection names>
- **Migrations:** <strategy — auto-migrate, manual SQL, tool-based>
- **Repositories:** <list of repo/DAO files>

## Architecture overview
<detailed prose — 5-10 sentences covering:>
- Monolith vs microservices
- API style (REST, gRPC, GraphQL, hybrid)
- Request flow (middleware → handler → service → repository → DB)
- Authentication/authorization approach
- Data flow and state management
- Caching strategy (if any)
- Message queue / async processing (if any)
- Error handling philosophy
- Deployment model (containers, serverless, bare metal)

## Key patterns and conventions
<every pattern observed — be specific with examples:>
- **Error handling:** <how errors are created, wrapped, returned, logged — cite specific files>
- **Naming:** <file naming, function naming, variable naming conventions>
- **Code organization:** <by feature, by layer, hybrid — describe the structure>
- **Testing:** <unit vs integration split, mocking approach (mocks vs real DB), fixture patterns, test naming>
- **Dependency injection:** <constructor injection, container, manual wiring — cite the setup file>
- **Logging:** <structured vs printf, log levels used, logger library>
- **Config management:** <env vars, config files, how secrets are handled>
- **Validation:** <input validation approach — middleware, decorators, manual>
- **API response format:** <standard envelope, error format, pagination style>
- **Database access:** <repository pattern, active record, raw SQL — cite examples>

## Infrastructure
- **Containerization:** <Docker setup, base images, multi-stage builds>
- **CI/CD:** <pipeline description — what runs, what deploys>
- **Environments:** <dev, staging, prod — how they differ>
- **Env vars:** <list from .env.example or equivalent, without values>

## Chiron config
- **Voice level:** <from ~/.chiron/config.json, or "default">
- **Drill sizing:** <from config, or "20 lines / 1 function / 5-15 min">
- **Teaching depth:** <from config teaching.depth, or "5">
- **Theory ratio:** <from config teaching.theory_ratio, or "3">
- **Idiom strictness:** <from config teaching.idiom_strictness, or "5">

## Project conventions (from AI config files)
<full relevant content from CLAUDE.md, AGENTS.md, .cursorrules — or "none found">
```

---

## After writing

Confirm to the user:
1. How many files were scanned
2. How many source files mapped
3. The detected language(s) and framework(s)
4. Remind them: *"All chiron skills will now use `.chiron-context.md` instead of re-scanning. Run `/teach-chiron` again anytime to refresh."*
5. Suggest next steps: *"Ready to start? Try `/chiron <your task>` for guided help, or `/tour <topic>` for a quick overview of a concept before diving in."*
