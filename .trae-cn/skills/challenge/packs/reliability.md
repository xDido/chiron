# Reliability concept pack

Resilience and reliability patterns for backend services — retries, circuit breakers, timeouts, graceful degradation, and backpressure. Cross-language: seeds describe structural patterns, not language-specific syntax.

## Reliability pattern tag list (for eyeball fallback reference)

When no seed matches the target file, the step 5 eyeball fallback looks for instances of these named patterns:

### Retry patterns

- **reliability:retry-with-backoff** — exponential or polynomial backoff between retry attempts
- **reliability:retry-jitter** — randomized jitter added to backoff intervals to prevent thundering herd
- **reliability:retry-budget** — capping total retries per time window to avoid retry storms
- **reliability:idempotent-retry-guard** — retries only on operations safe to repeat (idempotent or with idempotency keys)
- **reliability:retry-on-transient-only** — retry logic that distinguishes transient errors (network timeout, 503) from permanent ones (400, 404)
- **reliability:max-retry-count** — hard upper bound on retry attempts to prevent infinite loops
- **reliability:retry-on-transient-classification** — distinguishing retryable errors (5xx, timeout, connection reset) from non-retryable (4xx, validation failure)

### Circuit breaking

- **reliability:circuit-breaker** — trip-open after N consecutive failures, half-open probe before full recovery
- **reliability:circuit-breaker-per-endpoint** — separate breaker state per downstream dependency, not one global breaker
- **reliability:bulkhead-isolation** — resource pools partitioned per dependency so one slow callee can't exhaust all threads/connections
- **reliability:half-open-probe** — controlled single-request probe in half-open state before restoring full traffic
- **reliability:failure-count-reset** — resetting the failure counter after a successful request in closed state

### Timeout management

- **reliability:explicit-timeout** — every outbound call (HTTP, RPC, DB query) has a finite timeout
- **reliability:deadline-propagation** — upstream deadline forwarded to downstream calls so total latency budget is respected
- **reliability:timeout-shorter-than-caller** — downstream timeouts strictly shorter than the caller's own deadline
- **reliability:connect-vs-request-timeout** — separate timeouts for connection establishment and overall request completion
- **reliability:idle-timeout** — close idle connections or sessions after a period of inactivity to free resources

### Graceful degradation

- **reliability:fallback-on-dependency-failure** — static default, cached value, or degraded response when a dependency is down
- **reliability:health-check-endpoint** — liveness and readiness probes that reflect actual dependency health
- **reliability:graceful-shutdown** — drain in-flight requests and release resources before process exit
- **reliability:feature-flag-kill-switch** — ability to disable non-critical features at runtime without redeployment
- **reliability:partial-success-response** — return successful parts of a multi-item request even when some items fail
- **reliability:degraded-response-marker** — response metadata that signals to the consumer that the result is degraded (stale cache, missing enrichment)

### Backpressure

- **reliability:bounded-queue** — work queues with a fixed capacity that reject or block when full
- **reliability:load-shedding** — rejecting excess traffic early (e.g., HTTP 503) rather than degrading all requests
- **reliability:rate-limiting** — per-client or per-endpoint rate limits to protect shared resources
- **reliability:admission-control** — adaptive throttling based on current system load (CPU, latency, queue depth)
- **reliability:backpressure-signal** — upstream producer informed when downstream consumer is overwhelmed (not just silently dropping)

## Reliability challenge seeds

Each seed below describes a cross-language reliability anti-pattern. Signals are structural — they describe what the code looks like, not which library it uses. A seed matches when the described shape is visible in the target file.

### `reliability:retry-without-backoff`

**Signal:** A retry loop (for/while that re-attempts an operation after a failure) where the delay between retries is either absent (immediate retry) or a fixed constant (e.g., `sleep(1)` on every attempt) — no exponential increase, no multiplication of the wait interval between successive attempts. Common shapes: `for i in range(max_retries): try: ... except: sleep(1)` or `while retries < 3 { err = doCall(); if err != nil { time.Sleep(time.Second) } }`.

**Drill:**
- **Task:** add exponential backoff to the retry loop so each successive attempt waits longer (e.g., 1s, 2s, 4s, 8s).
- **Constraint:** the backoff factor and maximum delay must be named constants or configuration values, not magic numbers inlined in the loop body.

### `reliability:missing-circuit-breaker`

**Signal:** A function makes calls to an external service (HTTP client, RPC stub, database query via network) inside a retry loop or on every incoming request, but there is no mechanism to stop calling the dependency after repeated failures — every request still attempts the call regardless of recent error rate. No breaker library import, no failure-count tracking variable, no "open/closed" state machine guarding the call. The function optimistically calls the dependency every time, even when the last 50 calls all timed out.

**Drill:**
- **Task:** wrap the external call with circuit breaker logic that opens after N consecutive failures and short-circuits for a cooldown period before probing with a single test request.
- **Constraint:** the breaker must have three observable states (closed, open, half-open) and the failure threshold and cooldown duration must be configurable, not hardcoded.

### `reliability:no-timeout-on-external-call`

**Signal:** An outbound HTTP request, RPC call, or database query is made without an explicit timeout — no timeout parameter, no context deadline, no socket-level deadline set on the client or connection. The call could block indefinitely if the remote side hangs. Look for: HTTP clients created with default settings, database connections opened without a query timeout, gRPC calls with no deadline in the context, raw TCP/socket operations with no read/write deadline.

**Drill:**
- **Task:** add an explicit timeout to every outbound call in the function (via context deadline, client-level timeout, or per-request timeout parameter).
- **Constraint:** the timeout value must be shorter than the caller's own request deadline (if one exists); if the caller has no deadline, add one.

### `reliability:missing-health-check`

**Signal:** A service entrypoint (HTTP server, gRPC server, worker process) starts and begins accepting traffic but exposes no health check endpoint — no `/healthz`, `/health`, `/ready`, `/livez`, or equivalent route registered in the router. Liveness and readiness are not distinguishable by an external orchestrator. If the server's database goes down, nothing reports that to the load balancer or container orchestrator — requests continue to be routed to the unhealthy instance.

**Drill:**
- **Task:** add a health check endpoint that returns healthy only when critical dependencies (database connection, required downstream services) are actually reachable.
- **Constraint:** the endpoint must distinguish liveness (process is running) from readiness (process can serve traffic); a service that cannot reach its database must report not-ready, not unhealthy.

### `reliability:cascading-failure-risk`

**Signal:** A function calls a downstream service synchronously on the critical request path, and a failure or timeout in that downstream service causes the current function to return an error (or throw/propagate an exception) directly to its caller with no fallback, degraded response, or cached alternative. The error propagation is direct: catch/if-error followed by return-error or re-throw, with no alternative code path. A single downstream outage would cascade through every caller in the chain.

**Drill:**
- **Task:** add a fallback path so that when the downstream call fails or times out, the caller returns a degraded response (cached data, default value, or partial result) instead of propagating the error.
- **Constraint:** the fallback must be visually distinct in the code (separate code path, not just a catch-all swallowing the error), and the response must indicate to the consumer that it is degraded.

### `reliability:graceful-shutdown-missing`

**Signal:** A server or long-running process handles an interrupt/termination signal (SIGTERM, SIGINT, Ctrl+C) by either ignoring it entirely or exiting immediately (e.g., `process.exit(1)`, `os.Exit(1)`, `System.exit(1)`) — no draining of in-flight requests, no closing of database connections, no flushing of buffers before exit. Also matches: a `main` function that starts an HTTP server but registers no signal handler or shutdown hook.

**Drill:**
- **Task:** add a shutdown handler that (1) stops accepting new requests, (2) waits for in-flight requests to complete up to a deadline, and (3) closes resources (DB pools, file handles, message consumers) before exiting.
- **Constraint:** the shutdown must have a maximum grace period (e.g., 30 seconds); if in-flight work doesn't finish by then, force exit. The grace period must be a named constant.

### `reliability:retry-on-non-idempotent`

**Signal:** A retry loop wraps an operation that mutates state — POST request (not PUT), INSERT query (not upsert), payment or charge API call, message publish, email send — without any idempotency protection. No idempotency key header, no client-generated deduplication token, no check-before-write pattern. Retrying the operation could create duplicate records, send duplicate emails, or charge a customer twice.

**Drill:**
- **Task:** either (a) add an idempotency key to the outbound request so the receiver can deduplicate, or (b) guard the retry with a check that the prior attempt did not already succeed.
- **Constraint:** the idempotency key must be deterministic for the same logical operation (not a fresh random value on each retry).

### `reliability:missing-deadline-propagation`

**Signal:** A function receives a request with a deadline or timeout context from its caller, but when it makes downstream calls, it creates a fresh context (background context, new timeout, or no context at all) instead of deriving from the incoming one — the caller's deadline is silently dropped. Common shapes: `context.Background()` used for an outbound HTTP call inside a request handler, `new CancellationTokenSource()` created from scratch instead of linking to the incoming token, `setTimeout` on an outbound call that ignores the request's remaining budget. If the upstream caller has a 5-second deadline and this function spends 4 seconds locally, the downstream call should have at most 1 second — but instead it gets a fresh 10-second timeout.

**Drill:**
- **Task:** derive the downstream call's context from the incoming request context so the caller's deadline propagates through the entire call chain.
- **Constraint:** the downstream timeout must be strictly less than the remaining time on the incoming deadline, leaving headroom for local processing.

### `reliability:unbounded-queue`

**Signal:** A work queue, channel, or in-memory buffer has no capacity limit — items can be added without bound. Under load, this queue will grow until it exhausts memory. Common shapes: `make(chan Task)` with no buffer size for a producer-consumer pattern, `list.append(item)` in a queue with no size check, `new LinkedBlockingQueue<>()` with no capacity argument, `asyncio.Queue()` with no maxsize, `new Queue()` or array used as a queue with no length guard.

**Drill:**
- **Task:** add a capacity bound to the queue and define the behavior when the queue is full (block the producer, drop the oldest item, or return a backpressure error to the caller).
- **Constraint:** the capacity must be a named configuration value, and the full-queue behavior must be explicit in the code (not silently unbounded).

### `reliability:missing-jitter`

**Signal:** A retry or polling loop uses exponential backoff (or any computed delay) but the delay is deterministic — the wait time is a pure function of the retry count (e.g., `delay = base * 2^attempt`) with no random component. Every instance of the service computes exactly the same wait time for the same retry count. Under correlated failures (e.g., a downstream service restarts), all client instances retry at exactly the same instant, creating a thundering herd that can re-crash the recovering service.

**Drill:**
- **Task:** add randomized jitter to the backoff delay so that concurrent retriers spread their attempts across the wait window.
- **Constraint:** jitter must be bounded (e.g., random value in `[0, current_backoff]` or `[base, current_backoff]`), not unbounded random; the maximum total delay must still respect the retry budget.

### `reliability:missing-fallback-for-degraded-dep`

**Signal:** A function calls a non-critical dependency (feature flag service, recommendation engine, analytics API, A/B test provider, personalization service, CDN origin) and if that call fails, the entire request fails or returns an error — even though the core business logic does not depend on the result. The non-critical call is on the same error-propagation path as the critical business logic: its failure is not caught and handled separately, but bubbles up and aborts the whole request.

**Drill:**
- **Task:** add a fallback that returns a safe default value when the non-critical dependency is unavailable, allowing the request to succeed with reduced functionality.
- **Constraint:** the fallback must be logged or metricked (so operators know the dependency is degraded), and the default value must be explicitly defined (not a zero value or null that could cause downstream surprises).

### `reliability:single-point-of-failure`

**Signal:** A critical resource (database connection, cache client, external service client) is initialized once as a single instance with no redundancy — a single global variable holding one connection object, one client handle, or one socket. If that instance fails (connection dropped, host unreachable, TLS handshake timeout), all operations depending on it fail immediately with no recovery path. No connection pool, no reconnect-on-error logic, no failover to a secondary.

**Drill:**
- **Task:** add connection pooling or a reconnection strategy so that a single connection failure does not take down the entire service.
- **Constraint:** the pool size or reconnection parameters must be configurable; the code must handle the case where the pool is exhausted (return an error, not hang indefinitely).
