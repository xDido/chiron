# API design concept pack

Cross-language patterns for HTTP/REST/gRPC API design: status codes, input validation, error responses, pagination, security headers, and request lifecycle. Seeds target the handler/controller layer regardless of framework or language.

## API design pattern tag list (for eyeball fallback reference)

### Status codes and responses

- **api:incorrect-status-code** — returning 200 for errors, 500 for client mistakes, or generic codes that hide the real outcome
- **api:error-response-inconsistency** — error payloads that vary in shape across endpoints (sometimes `{error}`, sometimes `{message}`, sometimes plain text)
- **api:leaking-internal-errors** — stack traces, SQL errors, or internal paths exposed in HTTP error responses
- **api:missing-content-type** — responses without a Content-Type header, or returning JSON with `text/plain`

### Input handling

- **api:missing-input-validation** — request body or query parameters used without any type, range, or format checking
- **api:overly-permissive-parsing** — silently accepting unknown/extra fields in a request body instead of rejecting or stripping them
- **api:missing-idempotency-key** — state-changing endpoints (POST for create, payment, etc.) that have no idempotency mechanism

### Pagination and streaming

- **api:missing-pagination** — list endpoints that return all records with no limit, offset, or cursor
- **api:large-unbounded-response** — endpoints that serialize an entire database table or collection into one response
- **api:inconsistent-pagination** — some list endpoints use offset, others use cursors, with no project-wide convention

### Security headers

- **api:overly-permissive-cors** — `Access-Control-Allow-Origin: *` or `Allow-Credentials: true` with a wildcard origin
- **api:missing-security-headers** — responses lacking standard hardening headers (Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options)
- **api:auth-middleware-gap** — routes that should require authentication but are not covered by the auth middleware chain

### Request lifecycle

- **api:missing-request-id** — no request ID generated or propagated, making distributed tracing impossible
- **api:missing-request-timeout** — handler executes with no deadline; a slow downstream call blocks the server indefinitely
- **api:missing-rate-limiting** — public-facing endpoints with no rate limit or throttle mechanism
- **api:versioning-absence** — API has no version prefix, header, or negotiation strategy; breaking changes will affect all clients

## API design challenge seeds

### `api:incorrect-status-code`

**Signal:** A handler or controller returns HTTP 200 for an operation that failed (error branch returns 200 with an error message in the body), or returns HTTP 500 for a client input error (bad request, not found, unauthorized). Look for: an `if err != nil` / `catch` / `except` block that writes a 200 response with an error payload, or a validation failure that triggers a 500 instead of 400/422.

**Drill:**
- **Task:** fix the status code to match the actual outcome — 4xx for client errors, 5xx for server errors, 2xx only for success.
- **Constraint:** every error branch returns a semantically correct status code; no 200-with-error-body remains.

### `api:missing-input-validation`

**Signal:** A handler reads a field from the request body, path parameter, or query string and passes it directly to a service or database call without any validation. There is no type assertion, range check, format regex, or schema validation between the raw input and its first use. The field is not a free-text field where any string is valid.

**Drill:**
- **Task:** add input validation for the field before it reaches business logic — check type, length/range, and format as appropriate.
- **Constraint:** invalid input produces a 400/422 response with a message naming the field and what was wrong; valid input passes through unchanged.

### `api:error-response-inconsistency`

**Signal:** Two or more error responses in the same codebase (or even the same file) use different JSON shapes. For example, one endpoint returns `{"error": "msg"}`, another returns `{"message": "msg", "code": 123}`, and a third returns a bare string. There is no shared error-response type or helper.

**Drill:**
- **Task:** define a single error-response shape (e.g., `{"error": {"code": "...", "message": "..."}}`) and refactor both error sites to use it via a shared helper or error type.
- **Constraint:** every error response in the file uses the same JSON structure; the helper is the only place that writes error responses.

### `api:missing-pagination`

**Signal:** A list/index endpoint queries a collection and returns all results in one response. There is no LIMIT in the query, no `page`/`offset`/`cursor` parameter in the handler, and no pagination metadata (`next`, `total`, `has_more`) in the response body.

**Drill:**
- **Task:** add pagination — accept a page-size and cursor/offset parameter, apply a LIMIT to the query, and return pagination metadata in the response.
- **Constraint:** the default page size is bounded (e.g., 20-100); a request with no pagination params returns the first page, not everything.

### `api:overly-permissive-cors`

**Signal:** CORS configuration sets `Access-Control-Allow-Origin` to `*` (wildcard), or reflects the request Origin header without checking it against an allow-list. Alternatively, `Access-Control-Allow-Credentials: true` is set alongside a wildcard or unchecked origin. Look for CORS middleware setup, header-setting code, or framework configuration.

**Drill:**
- **Task:** replace the wildcard with an explicit allow-list of trusted origins; validate the request Origin against the list before reflecting it.
- **Constraint:** `Access-Control-Allow-Credentials: true` is never paired with `*`; unrecognized origins get no CORS headers at all.

### `api:leaking-internal-errors`

**Signal:** An error handler, catch block, or middleware sends the raw error message or stack trace to the client in the HTTP response body. Look for patterns like `res.status(500).json({error: err.message})`, `c.JSON(500, err.Error())`, or `return Response(str(e), status=500)` where `err`/`e` is a database error, file-system error, or uncaught exception.

**Drill:**
- **Task:** replace the raw error with a generic client-facing message (e.g., "Internal server error") and log the real error server-side with the request ID.
- **Constraint:** no internal error detail (SQL syntax, file paths, stack frames) appears in the response body; the server log contains the full detail for debugging.

### `api:missing-request-id`

**Signal:** An HTTP handler or middleware chain does not generate, read from headers, or propagate a request ID. There is no `X-Request-Id` or equivalent header being set on the response, no request-ID extraction from incoming headers, and no correlation ID passed to downstream service calls or log statements.

**Drill:**
- **Task:** add middleware (or modify the existing chain) that generates a UUID request ID if one is not present in the incoming headers, attaches it to the request context, and includes it in the response headers.
- **Constraint:** every response includes the request ID header; the ID is available to downstream log calls and service calls via the request context.

### `api:missing-idempotency-key`

**Signal:** A POST endpoint that creates a resource or triggers a side effect (payment, email, order) accepts and processes the request without any idempotency mechanism. There is no `Idempotency-Key` header check, no client-generated ID, and no deduplication logic. Retrying the same request creates duplicate records or triggers duplicate side effects.

**Drill:**
- **Task:** accept an `Idempotency-Key` header (or a client-provided ID field); check if the key has been seen before; if yes, return the stored response instead of re-executing.
- **Constraint:** a replayed request with the same key returns the same response and causes zero additional side effects; a request without the key is either rejected (strict) or processed normally (lenient) per project convention.

### `api:auth-middleware-gap`

**Signal:** A router or route group registers endpoints, but at least one route that should require authentication is defined outside the authenticated middleware group, or is registered before the auth middleware is applied. Compare the route definitions: some are protected (wrapped in auth middleware), but one or more routes that access user data or mutate state are unprotected.

**Drill:**
- **Task:** move the unprotected route into the authenticated group (or apply the auth middleware to it explicitly).
- **Constraint:** every route that reads or writes user-specific data is covered by the auth middleware; public routes (health check, login, docs) remain unauthenticated.

### `api:missing-request-timeout`

**Signal:** An HTTP handler calls a downstream service, database, or external API without any timeout or context deadline. The call will block until the remote side responds or the TCP connection times out (often minutes). Look for HTTP client calls, database queries, or gRPC calls with no explicit timeout, no context with deadline, and no client-level timeout configuration.

**Drill:**
- **Task:** add an explicit timeout — via a context deadline, client timeout, or middleware-level request deadline.
- **Constraint:** the timeout is finite and appropriate for the operation (seconds, not minutes); timeout errors are handled and returned as 504 Gateway Timeout or 408 Request Timeout.

### `api:large-unbounded-response`

**Signal:** An endpoint serializes an entire collection (all users, all orders, all logs) into a single JSON array response. The query has no LIMIT, and the handler loads all rows into memory before encoding. The endpoint path or name suggests it is a list/search endpoint, not a single-resource fetch.

**Drill:**
- **Task:** add a hard upper limit on the number of items returned and implement streaming or pagination so clients can iterate through the full set.
- **Constraint:** the response size is bounded; memory usage is proportional to one page, not to the total record count.

### `api:missing-rate-limiting`

**Signal:** A public-facing endpoint (login, signup, password reset, API key creation, or any unauthenticated route) has no rate-limiting middleware, no throttle decorator, and no mention of rate limits in its handler chain. The route is reachable without authentication and performs a non-trivial operation.

**Drill:**
- **Task:** add rate limiting to the endpoint — via middleware, a decorator, or a dedicated rate-limiter (token bucket, sliding window).
- **Constraint:** the limit is per-client (by IP or API key); exceeding the limit returns 429 Too Many Requests with a `Retry-After` header.

### `api:versioning-absence`

**Signal:** API routes are defined at bare paths (`/users`, `/orders`) with no version prefix (`/v1/`), no version header (`Accept: application/vnd.myapp.v1+json`), and no versioning strategy visible in the router setup. The API is intended for external or multi-client consumption (not a single internal caller).

**Drill:**
- **Task:** add a version prefix to the route group (e.g., `/v1/users`) and document the versioning convention in a comment or constant.
- **Constraint:** all existing routes move under the version prefix; the old bare paths either redirect or return 404.

### `api:missing-content-type`

**Signal:** A handler writes a JSON body to the response but does not set the `Content-Type` header to `application/json`. The response either has no Content-Type, inherits a default like `text/plain`, or uses the wrong MIME type. Look for manual response-writing code (as opposed to framework helpers that set Content-Type automatically).

**Drill:**
- **Task:** set `Content-Type: application/json` on the response before writing the body (or use the framework's JSON response helper that does it automatically).
- **Constraint:** every JSON response has the correct Content-Type; non-JSON responses (plain text, HTML, binary) use their own correct types.
