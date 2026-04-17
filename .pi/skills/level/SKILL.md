---
name: level
description: Set or show chiron's voice level (gentle, default, or strict). Zero-arg invocation prints the full config snapshot — voice level plus drill sizing and teaching dials — doubling as a health check. Persists to ~/.chiron/config.json across sessions.
allowed-tools: Read, Write
---

# /level — set or show chiron's voice level

## Step 0 — Load project context

Check if `.chiron-context.md` exists in the project root. **If it exists:** read it. **DO NOT scan the codebase or read additional files.** **If not:** tell the user: *"No project context found. Run `/teach-chiron` first."* Then stop.

**Important:** When this command changes the voice level, update BOTH `~/.chiron/config.json` (global persistence) AND the "Chiron config" section in `.chiron-context.md` (project cache).

The user's input (one of `gentle`, `default`, `strict`, blank, or an invalid value):

```
$ARGUMENTS
```

## CRITICAL — user instructions always win

If the current project's `.pi/settings.json` says to ignore level settings or pin chiron to a specific level, follow those instructions. User config always overrides.

---

## What this command does

`/level` is the sole interface for chiron's voice level. It reads and writes `~/.chiron/config.json`. Other chiron skills (`/chiron`, `/challenge`, `/hint`) read the same file at invocation time to pick up the configured level.

Two behaviors:

- **With an argument** (`gentle`, `default`, or `strict`): writes the new `voice_level` to `~/.chiron/config.json`, preserving all other fields.
- **Without an argument**: prints the full config snapshot — voice level plus drill sizing plus teaching dials — so users can see every knob at a glance. This doubles as a health check.

Every response uses the **three-level list format** with a `→` marker in the left margin pointing at the currently active level. The active level is read from `~/.chiron/config.json` (or defaults to `default` if the file is missing or invalid).

## Standard list format

```
  gentle   — warmer, more encouraging; L4 after 1 attempt
  default  — A+B blend (v0.1 baseline); L4 after L3 attempt or request
  strict   — sharper, more demanding; L4 after 2 attempts or request
```

The row matching the current active level has `→ ` (arrow + space) in the left margin instead of two spaces. Alignment is preserved either way.

---

## Step 1 — Read the current config

Read `~/.chiron/config.json` if it exists. Extract the `voice_level` field.

- Valid values: `"gentle"`, `"default"`, `"strict"`.
- If the file is missing, invalid JSON, `voice_level` is unset, or `voice_level` is an unknown value → treat the current level as `default` (silent fallback, never crash).

## Step 2 — Handle the user's input

### Case A — no argument (`/level` with nothing after)

Print the full config snapshot: voice level, drill sizing, and teaching dials. This doubles as a health check so users can see every knob at once instead of hand-editing `~/.chiron/config.json` to discover what exists.

Read `~/.chiron/config.json`. For any missing/invalid field, show the default value and annotate its source as `(default)`. If the whole file is missing, annotate the voice-level header with `(no config file yet)` and render every field as `(default)`.

```
Current chiron level: <current>  [(no config file yet) if file missing]

  gentle   — warmer, more encouraging; L4 after 1 attempt
  default  — A+B blend (v0.1 baseline); L4 after L3 attempt or request
  strict   — sharper, more demanding; L4 after 2 attempts or request

Drill sizing:
  max_lines_changed      = <val>   [1, 100]  (default 20)
  max_functions_touched  = <val>   [1, 5]    (default 1)
  time_minutes_min       = <val>   [1, 60]   (default 5)
  time_minutes_max       = <val>   [1, 60]   (default 15)

Teaching dials:
  depth             = <val>   [1, 10]  (default 5)   — Socratic question depth
  theory_ratio      = <val>   [1, 10]  (default 3)   — theory vs. practical
  idiom_strictness  = <val>   [1, 10]  (default 5)   — convention pedantry

Config file: ~/.chiron/config.json  [exists | missing]

To change level: /level gentle | /level default | /level strict
To tune dials:   edit ~/.chiron/config.json directly — see README Configuration for field docs
```

Replace `  ` (two spaces) with `→ ` on the three-level list row matching `<current>`. Leave the other two rows with the two-space indent.

Append ` (default)` after any field value that came from the fallback (missing file, missing key, or invalid value silently clamped).

Do NOT modify the config file in this case.

### Case B — valid argument (`gentle`, `default`, or `strict`)

1. Ensure `~/.chiron/` directory exists (create if missing).
2. Read existing config file if it exists. Classify by `schema_version`:
   - **Missing or `schema_version === 1`** → proceed. (A v1 file without `schema_version` is treated as v1; we add the field on write.)
   - **`schema_version` is an integer > 1** → **future** version. DO NOT WRITE. The file was produced by a newer chiron than this one; writing would downgrade it. Respond with: *"~/.chiron/config.json is schema_version `<N>`, but this chiron only understands up to 1. Refusing to write to avoid data loss. Please update chiron or hand-edit the file."* Then stop — do not modify the file.
   - **`schema_version` present but non-integer, negative, or otherwise invalid** → treat as corrupt. Respond with: *"~/.chiron/config.json has an invalid `schema_version` (`<value>`). Refusing to write; please fix the field or delete the file to reset."* Then stop.
   - **File unreadable (bad JSON, IO error)** → respond with: *"~/.chiron/config.json could not be parsed. Refusing to write; delete the file to reset or fix it by hand."* Then stop. **Never rename or delete** the user's config file automatically — it may contain hand-tuned dials worth recovering.
3. Update (or add) `voice_level` to the new value. Preserve every other field verbatim (drill, teaching, and any unknown-to-us fields).
4. Ensure `schema_version: 1` is present (add it if missing). If the file didn't exist at all, create it with this minimal skeleton:
   ```json
   {
     "schema_version": 1,
     "voice_level": "<new value>"
   }
   ```
5. Write the config file back using JSON with 2-space indentation.
6. Respond with the three-level list showing the NEW active level:

```
Level set: <new value>

  gentle   — warmer, more encouraging; L4 after 1 attempt
  default  — A+B blend (v0.1 baseline); L4 after L3 attempt or request
  strict   — sharper, more demanding; L4 after 2 attempts or request

Effective on your next /chiron or /challenge invocation.
```

The `→` marker points at the row matching the new active level.

### Case C — invalid argument (anything other than gentle/default/strict)

Do NOT modify the config. Show an error line plus the three-level list with `→` on the CURRENT active level:

```
Unknown level: "<what the user typed>". Valid: gentle, default, strict.

  gentle   — warmer, more encouraging; L4 after 1 attempt
  default  — A+B blend (v0.1 baseline); L4 after L3 attempt or request
  strict   — sharper, more demanding; L4 after 2 attempts or request
```

Do not moralize. Do not suggest the user *"try harder to type correctly"*. Just show the valid options.

---

## Config schema — `~/.chiron/config.json`

```json
{
  "schema_version": 1,
  "voice_level": "default"
}
```

- `schema_version` — integer, currently `1`. Bumped only on breaking changes (see evolution policy below).
- `voice_level` — one of `"gentle"`, `"default"`, `"strict"`.

**Schema evolution policy:**

- **Additive changes do NOT bump `schema_version`.** New fields (like `drill.*` in v0.2.1, `teaching.*` in v0.12.0) extend the schema without breaking v1 readers — missing fields silently fall back to defaults. A v0.2.0 chiron can read a v0.13.0 file and vice-versa.
- **Breaking changes DO bump `schema_version`.** Renaming a field, changing a type, or removing a field in a way that silent fallback cannot fix triggers a version bump and requires a migration step in `/level` (mirroring the profile.json v1→v2 migration in `/challenge` Step 8).
- **Forward-compat safety:** a future-versioned file is NEVER overwritten. `/level` refuses to write to a file whose `schema_version` is greater than this skill knows about (see Step 2 Case B). This prevents accidental downgrades after a chiron version mix.

**Invariants:**

- Always preserve other fields in the config file when updating `voice_level`. Future releases will add fields (grading thresholds, hint tuning, etc.); this command must not clobber them.
- On write, ensure `schema_version: 1` is present at the top level.
- Never crash on corrupt input. Fall back to `default` silently during reads.
- Never write to `~/.chiron/profile.json` from this command.

---

## Anti-patterns — what NOT to do

1. **Do not moralize** about the chosen level. Never say things like *"strict is the right choice"* or *"gentle is too soft, you should..."*.
2. **Do not refuse** a valid level.
3. **Do not clobber other config fields** when updating `voice_level`. Preserve anything else in the file.
4. **Do not write to profile.json.** This command only touches config.json.
5. **Do not crash on invalid input.** Always show the valid options and the current active level.

---

## Tuning other config fields *(v0.2.1+)*

`/level` only *writes* to the `voice_level` field. Other fields in `~/.chiron/config.json` (drill sizing as of v0.2.1, teaching dials as of v0.12.0) are edited directly with any text editor, but zero-arg `/level` *reads* and *prints* all of them so users can discover what exists without opening the file. See the README Configuration section for the current schema and field documentation.

Drill sizing fields added in v0.2.1:

- `drill.max_lines_changed` — default 20, clamped [1, 100]
- `drill.max_functions_touched` — default 1, clamped [1, 5]
- `drill.time_minutes_min` — default 5, clamped [1, 60]
- `drill.time_minutes_max` — default 15, clamped [1, 60]

Teaching dial fields added in v0.12.0:

- `teaching.depth` — 1–10, default 5. How deep the Socratic questioning goes. 1 = quick answer with minimal questioning, 10 = full architectural discussion before any code. Affects /chiron L0 question count and /explain detail level. Clamped [1, 10]. Invalid values silently fall back to 5.
- `teaching.theory_ratio` — 1–10, default 3. How much theory accompanies code. 1 = practical-only (just the pattern), 10 = theory-enriched (why this pattern exists, what problem it solves, historical context). Affects /chiron idiom callouts and /tour key-concepts depth. Clamped [1, 10]. Invalid values silently fall back to 3.
- `teaching.idiom_strictness` — 1–10, default 5. How pedantic about conventions. 1 = lenient (any working approach is fine), 10 = pedantic (must be the canonical idiomatic form). Affects /challenge grading weight on the idiom-fit dimension and /chiron's willingness to accept non-idiomatic solutions. Clamped [1, 10]. Invalid values silently fall back to 5.

Invalid values silently fall back to defaults — no crashes.

## Cross-platform note

`~/.chiron/config.json` expands correctly on Linux, macOS, and Windows (via bash). Same mechanism as `~/.chiron/profile.json` — verified in v0.1. Use forward slashes in paths.

The `→` character (U+2192 RIGHTWARDS ARROW) renders cleanly on modern terminals across all three platforms. No fallback needed for v0.2.0; if future feedback shows render issues, switch to `*` (asterisk) or `>` (greater-than).
