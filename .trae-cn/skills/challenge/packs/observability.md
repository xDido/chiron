# Observability concept pack

Logging, metrics, and distributed tracing patterns for backend services. Cross-language: seeds describe structural observability concerns, not framework-specific APIs.

## Observability pattern tag list (for eyeball fallback reference)

When no seed matches the target file, the step 5 eyeball fallback looks for instances of these named patterns:

### Structured logging

- **observability:structured-log-format** — log entries as key-value pairs (JSON, logfmt) rather than free-form strings
- **observability:log-context-fields** — request ID, user ID, operation name attached to every log entry in a request scope
- **observability:logger-per-module** — named logger instances per module/package for granular filtering
- **observability:static-log-message** — log message is a constant string; all variable data goes in structured fields, not string interpolation
- **observability:log-sampling** — high-volume debug logs sampled (every Nth event or probabilistic) rather than emitted unconditionally

### Metrics

- **observability:request-duration-histogram** — histogram of request latencies per endpoint, not just averages
- **observability:error-rate-counter** — monotonic counter of errors by type and endpoint
- **observability:saturation-gauge** — gauge tracking resource utilization (connection pool size, queue depth, thread count)
- **observability:metric-label-cardinality** — metric labels limited to a bounded set of values to prevent time-series explosion
- **observability:metric-on-all-exit-paths** — metrics recorded on success, error, and panic/exception paths (not just happy path)
- **observability:red-metrics** — Rate, Errors, Duration for every service endpoint (the RED method)
- **observability:use-gauge** — gauge (not counter) for values that go up and down (queue depth, active connections, cache size)

### Distributed tracing

- **observability:trace-context-propagation** — trace ID and span ID forwarded across service boundaries via headers
- **observability:span-per-operation** — each significant operation (DB query, HTTP call, queue publish) wrapped in its own span
- **observability:correlation-id** — a unique request-scoped ID carried through all log entries and spans for a single user request
- **observability:trace-sampling** — sampling strategy that captures error and slow traces while probabilistically sampling the rest
- **observability:span-attributes** — meaningful attributes (HTTP method, status code, DB statement) attached to spans for filtering

### Log hygiene

- **observability:no-sensitive-data-in-logs** — PII, secrets, tokens, and passwords excluded from log output
- **observability:appropriate-log-level** — ERROR for failures requiring human attention, WARN for recoverable anomalies, INFO for state transitions, DEBUG for development detail
- **observability:log-rotation-and-retention** — log output directed to a rotatable sink with a size or time-based retention policy
- **observability:no-log-in-hot-path** — no unconditional logging inside tight loops or per-item batch processing
- **observability:error-log-with-context** — error log entries include operation name, entity ID, and relevant state, not just the error message
- **observability:log-at-boundaries** — log at service entry/exit points and at significant state transitions, not mid-computation

### Alerting

- **observability:alert-on-symptom** — alerts fire on user-facing symptoms (error rate, latency) not internal causes (CPU, thread count)
- **observability:actionable-alert** — each alert has a runbook link or clear next step, not just a metric name
- **observability:alert-threshold-defined** — SLO-based thresholds set on dashboards and alert rules, not implicit "it looks bad"
- **observability:burn-rate-alert** — multi-window burn-rate alerting derived from SLO error budget rather than static thresholds
- **observability:alert-suppression** — inhibit or group related alerts to avoid notification storms during cascading failures

## Observability challenge seeds

Each seed below describes a cross-language observability anti-pattern. Signals are structural — they describe what the code looks like, not which logging or metrics library it uses. A seed matches when the described shape is visible in the target file.

### `observability:unstructured-log-output`

**Signal:** Log statements that build a human-readable string via concatenation or interpolation — `log("User " + userId + " failed to login")` or equivalent — rather than emitting structured key-value fields. The log output is a prose sentence where extracting the user ID or event type would require regex parsing.

**Drill:**
- **Task:** convert the log call to structured format with named fields (e.g., `logger.info("login_failed", user_id=userId, reason=reason)` or the equivalent structured API in your logging library).
- **Constraint:** every variable value must be a named field, not interpolated into the message string; the message string itself must be a static constant (no dynamic parts).

### `observability:missing-correlation-id`

**Signal:** A request handler or service method writes log entries that contain no request-scoped identifier — if two concurrent requests are processed simultaneously, there is no field in the log output that could link all entries belonging to the same request. No `request_id`, `correlation_id`, `trace_id`, or equivalent appears in the log calls or the logger configuration. Look for: log statements inside handlers that include business data (user ID, order ID) but no cross-cutting request identifier; a logger used across multiple functions with no injected context.

**Drill:**
- **Task:** generate or extract a correlation ID at the request entry point (from an incoming header or by generating a UUID) and attach it to every log entry within the request scope.
- **Constraint:** the correlation ID must appear in every log line emitted during the request lifecycle without requiring each call site to pass it manually (use context propagation, thread-local storage, or middleware injection).

### `observability:logging-sensitive-data`

**Signal:** A log statement includes a variable that holds sensitive data — a password, API key, bearer token, credit card number, social security number, email address, session secret, or authentication header. Common shapes: logging the entire request headers map (which includes `Authorization`), logging a user/account object that has a `password` or `secret` field, logging the raw request body of a login or payment endpoint, logging environment variables that may include `DATABASE_URL` with credentials, or `fmt.Sprintf("token=%s", token)` passed to a logger.

**Drill:**
- **Task:** remove or redact the sensitive field from the log output, replacing it with a safe placeholder (e.g., `"[REDACTED]"`, masked last-four characters, or omit the field entirely).
- **Constraint:** the redaction must happen at the log call site or via a log sanitizer — the sensitive value must never reach the log output buffer, not even in DEBUG mode.

### `observability:wrong-log-level`

**Signal:** A log statement uses an inappropriate severity level. Common mismatches: ERROR for a routine, expected condition (e.g., "user not found" returning 404, "cache miss", "no rows returned"), INFO for an unhandled exception or stack trace, DEBUG for a production health event that operators need to see, or WARN for a normal control-flow branch like "using default configuration". The level does not match the operational response the event should trigger — an on-call engineer would either be woken up for non-issues (ERROR too broad) or miss real problems (ERROR too narrow).

**Drill:**
- **Task:** change the log level to match the operational semantics: ERROR means "a human should investigate soon," WARN means "unexpected but handled," INFO means "noteworthy state transition," DEBUG means "useful only during development."
- **Constraint:** after the change, a grep for ERROR-level logs in the codebase should return only events that genuinely require operator attention; no routine "not found" or "cache miss" entries at ERROR.

### `observability:missing-operation-metrics`

**Signal:** A function that performs a significant operation (handles an HTTP request, processes a queue message, executes a database query, calls an external API) completes without recording any metric — no latency histogram, no success/failure counter, no in-flight gauge. The operation is invisible to dashboards and alerting. Look for: request handlers that log but never increment a counter or observe a histogram, background workers that process jobs with no duration tracking, database access layers that return results but never record query time.

**Drill:**
- **Task:** add at minimum (1) a latency histogram that records how long the operation took, and (2) a counter that increments on success or failure with a `status` label.
- **Constraint:** metrics must be recorded on all exit paths (success, error, panic/exception); a failed operation that throws must still record its latency and increment the failure counter.

### `observability:no-trace-context-propagation`

**Signal:** A service receives an inbound request and makes one or more outbound calls (HTTP, gRPC, message publish), but the outbound calls do not carry the trace context (trace ID, span ID, baggage) from the inbound request — the trace is broken at this service boundary. Look for: HTTP client calls that construct a new request from scratch without copying headers from the incoming context, gRPC calls that create fresh metadata instead of inheriting from the incoming call, message publishes that set business attributes but no tracing attributes. The outbound request headers contain no `traceparent`, `X-B3-TraceId`, `X-Request-ID`, or equivalent propagation header.

**Drill:**
- **Task:** propagate the trace context from the inbound request to all outbound calls by injecting trace headers (e.g., `traceparent`, `X-Request-ID`, or your tracing library's propagation mechanism) into outbound request headers or message metadata.
- **Constraint:** propagation must happen automatically via middleware or client interceptor, not manually at each call site; adding a new outbound call in the future must inherit trace context without extra code.

### `observability:logging-in-hot-loop`

**Signal:** A log statement (any level, including DEBUG) inside a tight loop that iterates over a large or unbounded collection — logging per-item in a batch processor, per-row in a query result iteration, per-message in a high-throughput consumer, or per-event in a stream processor. The log call is unconditional (not gated by error or sampling). Under production load with thousands of items per batch or messages per second, this generates an enormous volume of log output that overwhelms log aggregation, inflates storage costs, and can cause backpressure on the application itself if the log sink is synchronous.

**Drill:**
- **Task:** remove the per-iteration log and replace it with a summary log after the loop completes (e.g., `"processed 1,247 items in 320ms, 3 failures"`), or gate the per-item log behind a sampling condition (e.g., log every Nth item or only on error).
- **Constraint:** the loop body must contain zero unconditional log statements; any remaining in-loop logging must be conditional on an error or a sampling gate.

### `observability:missing-error-context`

**Signal:** An error is logged or returned with only the raw error message and no surrounding context — no information about what operation was being attempted, what input caused the failure, or what state the system was in. Common shapes: `logger.error(err)` with no additional fields, `catch(e) { console.error(e.message) }`, `log.Printf("error: %v", err)` with no indication of which user, which endpoint, or which step failed. An operator seeing this log entry would know something failed but not what, where, or for whom.

**Drill:**
- **Task:** enrich the error log or error return with contextual fields: the operation name, the input or entity identifier that triggered the failure, and any relevant state (e.g., retry count, elapsed time).
- **Constraint:** the added context must not include sensitive data (no passwords, tokens, or full request bodies); include only identifiers and operation metadata.

### `observability:metric-cardinality-explosion`

**Signal:** A metric label (tag, dimension) is set to a value drawn from an unbounded set — a user ID, email address, request URL path with embedded path parameters (e.g., `/users/12345` instead of `/users/{id}`), full error message string, stack trace, or UUID. This creates a new time series for every unique value, eventually overwhelming the metrics backend with millions of series. Also look for: labels derived from user input, labels set to raw exception messages, labels containing timestamps or request IDs.

**Drill:**
- **Task:** replace the high-cardinality label with a bounded alternative — normalize URL paths to route templates (e.g., `/users/{id}` not `/users/12345`), replace user IDs with a user tier or cohort, replace raw error messages with an error code enum.
- **Constraint:** the label's cardinality must be bounded to a known, finite set (ideally fewer than 100 distinct values); the original high-cardinality value can be logged but must not be a metric label.

### `observability:missing-alert-threshold`

**Signal:** Metrics are collected and exported (counters, histograms, gauges are recorded in the code) but no alert rule or threshold is defined anywhere — there is no alert configuration file, no threshold constant, no SLO definition, and no comment indicating what value of the metric constitutes a problem that should wake someone up. The metrics exist on dashboards but nobody gets paged when the error rate spikes or latency degrades. Look for: metric registration code with no corresponding alert rule in the same module, configuration directory, or referenced monitoring config.

**Drill:**
- **Task:** define an alert condition alongside the metric: specify the threshold (e.g., error rate > 1% for 5 minutes), the severity, and a one-line runbook note explaining what an operator should do when it fires.
- **Constraint:** the threshold must be based on a stated SLO or SLA (e.g., "99.9% success rate" implies alerting at > 0.1% error rate), not an arbitrary round number; the alert definition must live near the metric code or in a referenced configuration file.

### `observability:sampling-strategy-absence`

**Signal:** A distributed tracing setup captures and exports 100% of traces — every request generates a full trace sent to the collector. Look for: a tracer or tracing SDK initialized with no sampler argument (uses the default always-on sampler), an explicit `AlwaysOnSampler` or `sampler=1.0` configuration, or no sampling configuration at all in the tracing setup code. There is no head-based or tail-based sampling decision logic. At production scale (thousands of requests per second), this will overwhelm the tracing backend with storage and network costs.

**Drill:**
- **Task:** add a sampling strategy that captures a representative fraction of traces — either a fixed probability (e.g., 1% of requests) or a rule-based approach (always sample errors and slow requests, probabilistically sample the rest).
- **Constraint:** error traces and traces exceeding a latency threshold (e.g., > p99) must always be sampled regardless of the probability setting; the sampling rate must be configurable without redeployment.

### `observability:missing-log-rotation`

**Signal:** Application log output is written to a local file (via file appender, output redirection, or file-based logger configuration) with no rotation policy — no max file size, no time-based rotation, no retention limit. Common shapes: `logging.FileHandler("app.log")` with no `RotatingFileHandler`, `lumberjack.Logger{}` with zero `MaxSize`, log4j `FileAppender` with no `SizeBasedTriggeringPolicy`, `fs.createWriteStream("app.log", {flags: "a"})` with no rotation wrapper. The log file will grow until disk space is exhausted.

**Drill:**
- **Task:** configure log rotation with a maximum file size (e.g., 100 MB) and a retention policy (e.g., keep 7 days or 5 rotated files), using the logging framework's built-in rotation or an external log rotation mechanism.
- **Constraint:** the rotation must be configured in the application's logging setup (not assumed to be handled externally); the max file size and retention count must be named configuration values, not magic numbers.
