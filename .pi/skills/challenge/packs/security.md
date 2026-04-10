# Security concept pack

Cross-language security patterns covering authentication, secrets management, input validation, cryptography, transport security, and access control. Seeds describe structural anti-patterns visible in any backend codebase regardless of language or framework.

When no seed matches the target file, the step 5 eyeball fallback looks for instances of these named patterns:

## Security pattern tag list (for eyeball fallback reference)

### Authentication

- **security:jwt-expiration** — JWT tokens issued with an `exp` claim and a reasonable lifetime
- **security:password-hashing** — passwords stored via a slow adaptive hash (bcrypt, scrypt, argon2), never fast hashes
- **security:mfa-enforcement** — multi-factor authentication on privileged operations
- **security:session-invalidation** — sessions revoked on logout, password change, and privilege escalation
- **security:rate-limit-auth** — brute-force mitigation on login, reset, and token endpoints
- **security:secure-password-reset** — reset tokens are single-use, time-limited, and delivered out-of-band

### Secrets management

- **security:no-hardcoded-secrets** — API keys, tokens, and passwords never appear as string literals in source
- **security:secrets-env-or-vault** — secrets injected at runtime from environment variables or a vault service
- **security:no-secrets-in-logs** — log statements never interpolate credentials, tokens, or keys
- **security:no-secrets-in-vcs** — `.gitignore` or equivalent excludes `.env`, key files, and credential stores

### Input validation

- **security:parameterized-queries** — database queries use parameter binding, never string concatenation
- **security:input-validation-boundary** — all external input validated and sanitized at the service boundary
- **security:output-encoding** — data rendered into HTML, SQL, or shell contexts is properly escaped
- **security:path-traversal-guard** — user-supplied file paths normalized and confined to an allowed directory

### Cryptography

- **security:strong-hash** — SHA-256+ for integrity checks; argon2/bcrypt/scrypt for passwords
- **security:no-ecb-mode** — symmetric encryption uses authenticated modes (GCM, CCM), never ECB
- **security:constant-time-compare** — secret comparisons use constant-time functions to prevent timing attacks
- **security:random-iv** — initialization vectors and nonces generated from a cryptographic random source
- **security:no-custom-crypto** — use audited libraries for cryptographic operations, never hand-rolled implementations

### Transport security

- **security:https-enforcement** — all external-facing endpoints require TLS; HTTP redirects to HTTPS
- **security:strict-cors** — CORS `Access-Control-Allow-Origin` set to explicit origins, never `*` in production
- **security:hsts-header** — `Strict-Transport-Security` header present on HTTPS responses
- **security:csrf-protection** — state-changing requests protected by CSRF tokens or SameSite cookies
- **security:secure-cookie-flags** — session cookies set with `HttpOnly`, `Secure`, and `SameSite` attributes

### Access control

- **security:least-privilege** — permissions, IAM roles, and OAuth scopes scoped to the minimum required
- **security:authz-check-per-endpoint** — every endpoint enforces authorization, not just authentication
- **security:row-level-access** — data queries filter by the authenticated user's tenant or ownership
- **security:default-deny** — access denied by default; only explicitly granted permissions are allowed
- **security:no-direct-object-reference** — resource access validated by ownership, not by guessable IDs alone

## Security challenge seeds

### `security:hardcoded-secret`

**Signal:** A string literal assigned to a variable or constant whose name contains `key`, `secret`, `token`, `password`, `api_key`, or `credentials`, and the literal looks like an actual value (not a placeholder like `"changeme"` or `"TODO"`). Commonly appears as a default argument, a constant at module scope, inline in a configuration struct or dict, or as a hardcoded connection string with embedded credentials. The literal is typically 16+ characters of alphanumeric or base64 content.

**Drill:**
- **Task:** move the secret out of source code and read it from an environment variable or a secrets manager at runtime.
- **Constraint:** the code must fail fast with a clear error message if the secret is missing at startup, not silently fall back to an empty or default value.

### `security:sql-injection-concat`

**Signal:** A database query string built by concatenating or interpolating a variable that originates from user input (HTTP parameter, request body field, CLI argument). The variable appears inside the SQL string via string formatting (`+`, `f""`, `$""`, `format!`, `String.Format`, template literals, or `%s`/`%v` verbs) rather than through a parameter placeholder (`?`, `$1`, `:name`, `@param`).

**Drill:**
- **Task:** rewrite the query to use parameterized binding (prepared statements, query parameters) instead of string interpolation.
- **Constraint:** no user-supplied value may appear inside the SQL string literal; all values must be bound via the driver's parameter mechanism.

### `security:missing-input-validation`

**Signal:** An HTTP handler, RPC method, or CLI entry point reads external input (request body, query parameter, path parameter, form field) and passes it directly to a business-logic function, database call, or file-system operation without any validation, type coercion, or bounds checking. The input variable flows from the request object to a downstream call with no intermediate check — no regex match, no length assertion, no schema validation, and no type conversion.

**Drill:**
- **Task:** add validation at the handler boundary — check type, length, format, and allowed range before the value leaves the handler.
- **Constraint:** invalid input must return an appropriate error response (400-level for HTTP) with a message that does not leak internal details.

### `security:plaintext-password-storage`

**Signal:** A user registration, account creation, or password-update code path stores the password directly in a database field (via an INSERT or UPDATE) without passing it through a hashing function first. The raw password variable flows from input to persistence with no transformation.

**Drill:**
- **Task:** hash the password with a slow adaptive algorithm (bcrypt, scrypt, or argon2) before storing it, and compare using the library's verify function on login.
- **Constraint:** the plaintext password must never be written to the database, log, or any persistent store. The hash work factor must be configurable.

### `security:weak-password-hash`

**Signal:** Password hashing uses MD5, SHA-1, or unsalted SHA-256 — identifiable by calls to `md5(...)`, `sha1(...)`, `hashlib.md5`, `MessageDigest.getInstance("MD5")`, `crypto.createHash('md5')`, or framework equivalents. The hash output is stored alongside user records.

**Drill:**
- **Task:** replace with bcrypt, scrypt, or argon2id using the language's recommended library, and add a migration path for existing hashes.
- **Constraint:** the new hash must include an automatically generated salt; the cost/work factor must meet current OWASP recommendations (bcrypt cost >= 10, argon2 memory >= 64 MB).

### `security:jwt-no-expiration`

**Signal:** A JWT is created or signed without setting the `exp` (expiration) claim, or the `exp` is set to a value more than 24 hours in the future for an access token. Visible in the payload/claims object passed to the signing function.

**Drill:**
- **Task:** add an `exp` claim with a reasonable lifetime (5-60 minutes for access tokens) and implement a refresh-token flow for longer sessions.
- **Constraint:** the token validation logic must reject tokens with missing or expired `exp` claims; clock skew tolerance must not exceed 60 seconds.

### `security:no-https-enforcement`

**Signal:** A web server, reverse proxy config, or application startup binds to an HTTP (non-TLS) port for production traffic without a redirect to HTTPS, or explicitly disables TLS verification in an outbound HTTP client (`verify=False`, `InsecureSkipVerify: true`, `rejectUnauthorized: false`, `-k` flag).

**Drill:**
- **Task:** enforce TLS — either bind only to HTTPS or add an HTTP-to-HTTPS redirect, and remove any TLS verification bypass from production client code.
- **Constraint:** the `Strict-Transport-Security` header must be present with `max-age` of at least 31536000. TLS skip flags may remain only in test code behind an explicit environment check.

### `security:overly-broad-permissions`

**Signal:** An IAM policy, OAuth scope list, database role grant, or file-system permission assignment uses a wildcard or superuser-level access (`*`, `admin`, `SUPERUSER`, `chmod 777`, `GRANT ALL`, `scope: ["*"]`) when the code path only needs a narrow subset of operations.

**Drill:**
- **Task:** reduce to the minimum set of permissions the code actually requires — enumerate specific actions, resources, or tables.
- **Constraint:** the application must still function correctly with the reduced permissions; document each permission with a comment explaining why it is needed.

### `security:cors-wildcard`

**Signal:** CORS configuration sets `Access-Control-Allow-Origin` to `*` (the wildcard) in a service that handles authenticated requests (cookies, bearer tokens, or session headers). May appear as a middleware option, a response header set manually, or a framework configuration value.

**Drill:**
- **Task:** replace the wildcard with an explicit allowlist of trusted origins, validated against the request's `Origin` header at runtime.
- **Constraint:** the `Access-Control-Allow-Credentials` header must only be `true` when the origin is in the allowlist; unknown origins must receive no CORS headers.

### `security:missing-csrf-protection`

**Signal:** A web application handles state-changing requests (POST, PUT, DELETE) using cookie-based authentication but has no CSRF token embedded in forms, no `SameSite` attribute on session cookies, and no custom header requirement (like `X-Requested-With`) that a cross-origin form submission cannot produce. The form or AJAX handler accepts the request based solely on the session cookie with no additional proof of origin.

**Drill:**
- **Task:** add CSRF protection via synchronizer tokens, double-submit cookies, or `SameSite=Strict`/`Lax` cookie attributes.
- **Constraint:** every state-changing endpoint must reject requests without a valid CSRF token or equivalent protection; GET requests must remain side-effect-free.

### `security:secrets-in-logs`

**Signal:** A log statement (any log level) interpolates a variable whose name contains `password`, `secret`, `token`, `key`, `credential`, or `authorization`, or logs an entire request/response object that includes an `Authorization` header or credentials field without redaction.

**Drill:**
- **Task:** redact the sensitive field before logging — replace with `"[REDACTED]"` or omit it entirely. If logging full request objects, implement a sanitizer that strips sensitive headers and body fields.
- **Constraint:** no sensitive value may appear in log output at any level, including debug. The redaction must apply consistently across all log call sites.

### `security:missing-rate-limit`

**Signal:** An authentication endpoint (login, password reset, token issuance, MFA verification) accepts unlimited requests per client with no rate-limiting middleware, token bucket, or retry-after response. The handler processes every request unconditionally regardless of how many have arrived from the same source.

**Drill:**
- **Task:** add rate limiting scoped to the client identifier (IP address, user ID, or API key) with a sensible window (e.g., 5 attempts per minute for login).
- **Constraint:** rate-limited responses must return HTTP 429 with a `Retry-After` header. The limiter state must survive individual request lifecycles (use shared state, not per-request counters).
