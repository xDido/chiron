# Configuration concept pack

Configuration management patterns — environment variable validation, secrets hygiene, centralized config, feature flags, and schema enforcement. Cross-language: seeds describe structural anti-patterns visible in any backend codebase regardless of language or framework.

## Configuration pattern tag list (for eyeball fallback reference)

When no seed matches the target file, the step 5 eyeball fallback looks for instances of these named patterns:

### Validation

- **configuration:env-var-validation** — required environment variables checked at startup with clear error on missing
- **configuration:type-coercion** — config values parsed from strings into typed representations (int, bool, duration) with error handling
- **configuration:range-check** — numeric config values validated against acceptable bounds (e.g., port 1–65535, timeout > 0)
- **configuration:required-vs-optional** — explicit distinction between config that must be present and config with safe defaults
- **configuration:fail-fast-on-invalid** — process refuses to start when required config is missing or malformed, rather than failing later at runtime

### Secrets hygiene

- **configuration:no-secrets-in-config-files** — API keys, passwords, and tokens never appear as literals in config files checked into VCS
- **configuration:secrets-from-env-or-vault** — secrets injected at runtime from environment variables, a vault service, or a secrets manager
- **configuration:gitignore-env-files** — `.env`, `.env.local`, and credential files excluded from version control
- **configuration:no-secrets-in-defaults** — default values for secret config fields are empty or absent, never a working credential
- **configuration:secret-rotation-ready** — config layer supports reloading secrets without process restart

### Centralization

- **configuration:single-source-of-truth** — all config read from one module or entrypoint, not scattered across files
- **configuration:config-injection** — components receive config via constructor or DI, not by reading env vars directly deep in business logic
- **configuration:no-duplicate-reads** — each config key read and parsed once at startup, not re-read from the environment on every request
- **configuration:environment-abstraction** — config layer abstracts the source (env, file, vault) so consumers don't know where values come from
- **configuration:config-as-struct** — configuration loaded into a typed struct or object, not accessed as raw string lookups throughout the codebase

### Feature flags

- **configuration:flag-with-expiry** — feature flags carry an expiration date or review deadline so stale flags get cleaned up
- **configuration:flag-default-off** — new feature flags default to off (disabled) in production, requiring explicit opt-in
- **configuration:flag-naming-convention** — flag names follow a consistent convention (e.g., `enable_<feature>`, `ff_<feature>`) for discoverability
- **configuration:flag-removal-path** — old flags have a documented removal plan; permanently-on flags are removed and replaced with unconditional code
- **configuration:flag-audit-trail** — changes to feature flag state are logged with who changed it and when

### Schema

- **configuration:config-schema-definition** — a formal schema (JSON Schema, struct tags, validation annotations) defines the expected shape of config
- **configuration:schema-validated-on-load** — config is validated against its schema at load time, not assumed correct
- **configuration:documented-config-keys** — each config key has a description, type, default value, and example in a central reference
- **configuration:backwards-compatible-changes** — config schema changes are additive; removing or renaming a key includes a migration path or alias

## Configuration challenge seeds

Each seed below describes a cross-language configuration anti-pattern. Signals are structural — they describe what the code looks like, not which config library it uses. A seed matches when the described shape is visible in the target file.

### `configuration:missing-env-validation`

**Signal:** Environment variables are read at the point of use deep inside business logic (inside a request handler, a service method, or a utility function) with no validation at application startup. The `os.Getenv`, `process.env`, `System.getenv`, `Environment.GetEnvironmentVariable`, or equivalent call appears far from the entrypoint, and there is no init/startup function that checks for required variables before the server starts. If the variable is missing, the code silently gets an empty string and fails later with a confusing error (nil pointer, empty auth header, connection to blank host).

**Drill:**
- **Task:** Add a startup validation step that reads and checks all required environment variables before the application begins serving traffic, failing fast with a clear error message naming the missing variable.
- **Constraint:** The validation must run before any HTTP listener or worker loop starts; a missing required variable must cause process exit with a non-zero code and a message that names the exact variable.

### `configuration:secrets-in-config`

**Signal:** A configuration file (JSON, YAML, TOML, `.properties`, or application config struct) checked into version control contains what appears to be a real secret — a string literal assigned to a key whose name contains `password`, `secret`, `api_key`, `token`, `connection_string`, or `credentials`, and the value is not a placeholder (`"changeme"`, `"TODO"`, `"xxx"`). The file is not in `.gitignore`. Common shapes: `"database_password": "p@ssw0rd123"` in a JSON config, `api_key = "sk-abc123..."` in a TOML file, `spring.datasource.password=realpassword` in `application.properties`.

**Drill:**
- **Task:** Move the secret out of the config file and read it from an environment variable or secrets manager at runtime; replace the literal with a reference (e.g., `${DB_PASSWORD}` or a vault path).
- **Constraint:** The config file must contain zero string literals that look like real credentials after the change; the secret source must be documented in a comment or README entry.

### `configuration:no-defaults-for-optional`

**Signal:** A config value that is genuinely optional (the application can function without it, e.g., a log level, a page size, a cache TTL, a feature toggle) is read from the environment or a config file with no default value. If the value is absent, the code uses the language's zero value (empty string, 0, false, null) rather than a sensible default. Common shapes: `pageSize := os.Getenv("PAGE_SIZE")` with no fallback — an empty string flows into an `Atoi` call that either errors or produces 0. Or `timeout = config.get("REQUEST_TIMEOUT")` returning `None`, later used in a division or passed to a sleep call.

**Drill:**
- **Task:** Add an explicit default value for the optional config key, applied when the value is absent or empty, so the application behaves sensibly without the variable set.
- **Constraint:** The default must be a named constant (not a magic number inlined at the read site), and a comment must document why this default was chosen.

### `configuration:flag-without-expiry`

**Signal:** A feature flag is defined or checked in the code (`if featureFlags.isEnabled("new_checkout")`, `if config.ENABLE_NEW_UI`, `@FeatureFlag("dark_mode")`) with no associated expiration date, removal TODO, or staleness comment. The flag has no ticket reference, no `// TODO: remove after ...` annotation, and no scheduled review date. It could remain in the codebase permanently, accumulating dead code branches. Look for boolean checks on flag-like names (prefixed with `enable_`, `feature_`, `ff_`, `use_new_`, `experiment_`) with no temporal metadata.

**Drill:**
- **Task:** Add an expiry annotation — a comment with a concrete date or ticket reference (e.g., `// Remove after 2026-Q3 — JIRA-1234`) and, if the framework supports it, a runtime check that logs a warning when the flag is past its expiry date.
- **Constraint:** The expiry must reference a specific date or ticket, not a vague "remove eventually"; if the flag is already permanently enabled (always true in all environments), remove the flag check and the dead else-branch entirely.

### `configuration:config-scattered`

**Signal:** Environment variables or config values are read in multiple unrelated files throughout the codebase — a handler file reads `DB_HOST`, a middleware file reads `JWT_SECRET`, a utility reads `CACHE_TTL`, each with its own `os.Getenv` / `process.env` / `System.getenv` call. There is no single config module, no config struct, and no centralized loader. The set of required config keys can only be discovered by grepping the entire codebase. Changing a config key name requires a multi-file search-and-replace.

**Drill:**
- **Task:** Extract all config reads into a single module (e.g., `config.go`, `config.py`, `config.ts`) that loads, validates, and exports every config value as a typed field; replace all scattered reads with imports from this module.
- **Constraint:** After the change, no file outside the config module may call `os.Getenv`, `process.env`, or the equivalent directly; all config access goes through the centralized struct or object.

### `configuration:missing-schema-validation`

**Signal:** Configuration is loaded from a file (JSON, YAML, TOML) or a remote source and passed directly to consumers as a raw dictionary, map, or untyped object with no schema validation. The code trusts that every expected key exists and has the correct type. A typo in the config file (`"databse_host"` instead of `"database_host"`) or a wrong type (`"port": "eight-zero-eight-zero"`) would not be caught at load time — it would surface as a runtime error deep in the application.

**Drill:**
- **Task:** Add schema validation at config load time — either parse into a typed struct with strict decoding (disallow unknown fields), or validate against a JSON Schema / validation library before use.
- **Constraint:** An unknown key or a wrong-type value must produce a clear error at load time naming the offending field; the application must not start with invalid config.

### `configuration:hardcoded-env-values`

**Signal:** A value that is environment-specific — a hostname, port, URL, file path, region, or connection string — appears as a string literal in application code (not in a config file, not read from an environment variable). Common shapes: `http.Get("http://localhost:8080/api")`, `db.Connect("postgres://prod-db:5432/mydb")`, `region = "us-east-1"`, `filePath = "/var/log/app.log"`. The value would need to change between development, staging, and production, but is baked into the source code.

**Drill:**
- **Task:** Extract the hardcoded value into a config key read from an environment variable or config file, with the current value as the development default.
- **Constraint:** The string literal must not remain in application code; the extracted config key must have a descriptive name (e.g., `API_BASE_URL`, not `URL`), and the default (if any) must only apply in development, not silently in production.

### `configuration:no-config-reload`

**Signal:** Configuration is loaded once at process startup and cached in a module-level variable or singleton for the lifetime of the process. There is no mechanism to reload config without restarting — no file watcher, no signal handler (SIGHUP), no admin endpoint, no periodic refresh. For values that legitimately need to change at runtime (feature flags, rate limits, log levels), the only way to pick up a change is a full restart or redeployment.

**Drill:**
- **Task:** Add a reload mechanism for the config values that need to change at runtime — a signal handler, a file watcher, a polling interval, or an admin endpoint that re-reads the config source.
- **Constraint:** The reload must be atomic (consumers never see a half-updated config); immutable startup config (database host, listen port) must NOT be reloadable — only dynamic values (feature flags, rate limits, log levels) should refresh.

### `configuration:missing-config-docs`

**Signal:** A config module or startup function reads multiple environment variables or config keys, but there is no accompanying documentation — no README section, no comments listing the keys, no `.env.example` file, no config schema file. A new developer joining the project cannot determine what environment variables to set without reading every line of the config-loading code. Look for: a config loader that reads 5+ keys with no corresponding `.env.example`, `config.schema.json`, or doc comment block listing the keys, types, defaults, and descriptions.

**Drill:**
- **Task:** Add a `.env.example` file (or equivalent documentation artifact) that lists every config key with its type, default value (if any), whether it is required or optional, and a one-line description.
- **Constraint:** Every key read in the config module must appear in the example file; secret values must use placeholder text (e.g., `DB_PASSWORD=changeme`), never real credentials.

### `configuration:boolean-string-parse`

**Signal:** A config value that represents a boolean (feature toggle, debug flag, verbose mode) is read as a string from the environment and compared via string equality to `"true"`, `"1"`, `"yes"`, or similar — `if os.Getenv("DEBUG") == "true"`, `if process.env.VERBOSE === "1"`, `if config["enable_cache"] == "yes"`. The comparison is case-sensitive and accepts exactly one spelling, so `"True"`, `"TRUE"`, `"YES"`, or `"on"` would silently evaluate to false. There is no canonical parsing function that handles the common truthy/falsy variants.

**Drill:**
- **Task:** Replace the string comparison with a proper boolean-parsing helper that handles common truthy variants (`"true"`, `"1"`, `"yes"`, `"on"`, case-insensitive) and returns a typed boolean, with a clear error or default for unrecognized values.
- **Constraint:** The parser must be a reusable function (not inlined at each check site), must be case-insensitive, and must treat unrecognized non-empty values as an error (not silently false).
