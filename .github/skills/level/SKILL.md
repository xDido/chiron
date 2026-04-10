---
name: level
description: Set or show chiron's voice level (gentle, default, or strict). Persists to ~/.chiron/config.json across sessions. Affects voice tone, hint ladder progression, and refusal behavior — not anti-patterns or the never-refuse rule.
user-invocable: true
argument-hint: "[gentle|default|strict]"
---

# /level — set or show chiron's voice level

The user's input (one of `gentle`, `default`, `strict`, blank, or an invalid value):

```
$ARGUMENTS
```

## CRITICAL — user instructions always win

If the current project's `.github/copilot-instructions.md` says to ignore level settings or pin chiron to a specific level, follow those instructions. User config always overrides.

---

## What this command does

`/level` is the sole interface for chiron's voice level. It reads and writes `~/.chiron/config.json`. Other chiron skills (`/chiron`, `/challenge`, `/hint`) read the same file at invocation time to pick up the configured level.

Every response from this command uses the **three-level list format** with a `→` marker in the left margin pointing at the currently active level. The active level is read from `~/.chiron/config.json` (or defaults to `default` if the file is missing or invalid).

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

Show the three-level list with `→` on the current active level. Header shows the current level with `(no config file yet)` suffix if the file is missing.

```
Current chiron level: <current>  [(no config file yet) if file missing]

  gentle   — warmer, more encouraging; L4 after 1 attempt
  default  — A+B blend (v0.1 baseline); L4 after L3 attempt or request
  strict   — sharper, more demanding; L4 after 2 attempts or request

To change: /level gentle | /level default | /level strict
```

Replace `  ` (two spaces) with `→ ` on the row matching `<current>`. Leave the other two rows with the two-space indent.

Do NOT modify the config file in this case.

### Case B — valid argument (`gentle`, `default`, or `strict`)

1. Ensure `~/.chiron/` directory exists (create if missing).
2. Read existing config file if it exists; preserve all other fields.
3. Update (or add) `voice_level` to the new value.
4. If the file didn't exist, create it with this minimal schema:
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

- `schema_version` — integer, reserved for future migrations. Always `1` in v0.2.x.
- `voice_level` — one of `"gentle"`, `"default"`, `"strict"`.

**Invariants:**

- Always preserve other fields in the config file when updating `voice_level`. Future v0.2.x releases will add fields (drill sizing, grading threshold, etc.); this command must not clobber them.
- Never crash on corrupt input. Fall back to `default` silently.
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

`/level` only manages the `voice_level` field. Other fields in `~/.chiron/config.json` (drill sizing as of v0.2.1, future tunables in later releases) can be edited directly with any text editor. See the README Configuration section for the current schema and field documentation.

Drill sizing fields added in v0.2.1:

- `drill.max_lines_changed` — default 20, clamped [1, 100]
- `drill.max_functions_touched` — default 1, clamped [1, 5]
- `drill.time_minutes_min` — default 5, clamped [1, 60]
- `drill.time_minutes_max` — default 15, clamped [1, 60]

Invalid values silently fall back to defaults — no crashes.

## Cross-platform note

`~/.chiron/config.json` expands correctly on Linux, macOS, and Windows (via bash). Same mechanism as `~/.chiron/profile.json` — verified in v0.1. Use forward slashes in paths.

The `→` character (U+2192 RIGHTWARDS ARROW) renders cleanly on modern terminals across all three platforms. No fallback needed for v0.2.0; if future feedback shows render issues, switch to `*` (asterisk) or `>` (greater-than).
