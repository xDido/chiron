# Engineering Arsenal

Named backend patterns organized by domain. Reference when presenting {{command_prefix}}tour preambles, when {{command_prefix}}chiron teaches architectural concepts, or when {{command_prefix}}challenge drills touch system-level patterns. Each entry: pattern name, one-sentence description, when to reach for it.

## API Design

- **Cursor pagination** — encode position as an opaque token instead of offset+limit; immune to insert/delete drift on mutable datasets
- **URL-prefix versioning** — `/v1/resource` for breaking changes; simpler to route and cache than header-based versioning
- **Token-bucket rate limiting** — fixed bucket refilled at steady rate; allows short bursts while enforcing sustained throughput ceiling
- **Idempotency keys** — client-generated key on mutating requests; server deduplicates retries so the same POST can't create two records
- **Content negotiation** — `Accept` / `Content-Type` headers drive response format (JSON, protobuf, CSV) without separate endpoints
- **Request validation at the boundary** — validate shape, types, and ranges at handler entry; business logic trusts its inputs
- **Graceful deprecation** — `Sunset` header + `Link: <migration-guide>` on deprecated endpoints; clients get machine-readable notice before removal

## Concurrency

- **Worker pool** — fixed N goroutines/threads consuming from a shared channel/queue; bounds resource usage regardless of input volume
- **Fan-out/fan-in** — scatter work to N workers, gather results into a single collector; natural fit for map-reduce style processing
- **Circuit breaker** — trips open after N consecutive failures, rejects calls fast; half-open probe tests recovery before closing
- **Bulkhead isolation** — partition resource pools per dependency so one failing downstream can't exhaust the whole process
- **Backpressure via bounded channels** — finite queue capacity forces producers to slow down when consumers can't keep up
- **Structured concurrency** — child tasks scoped to parent lifetime; errors propagate up and cleanup is guaranteed on cancellation
- **Semaphore-bounded parallelism** — acquire token before starting work, release on completion; limits concurrent operations to N

## Data Access

- **Repository pattern** — data access behind an interface; business logic is decoupled from the storage engine
- **Unit of work** — group related DB operations in a single transaction; commit or rollback as an atomic unit
- **Event sourcing** — persist state changes as an append-only event log; derive current state by replaying events
- **CQRS** — separate read model (optimized for queries) from write model (optimized for consistency); trade complexity for performance
- **Saga pattern** — distributed transaction as a sequence of local transactions with compensating actions on failure
- **Connection pooling** — reuse database connections across requests; bounded pool size prevents connection exhaustion under load
- **Optimistic locking** — version column checked at write time; retry on conflict instead of holding locks during reads

## Resilience

- **Retry with exponential backoff + jitter** — increasing delays between retries with random spread to avoid thundering herd on transient failures
- **Circuit breaker with half-open probe** — fail fast when a downstream dependency is unhealthy; periodically test recovery
- **Timeout cascade** — each downstream call has a timeout shorter than the caller's deadline; prevents slow dependencies from consuming the full budget
- **Graceful degradation** — return cached or default data when a non-critical dependency fails; keep the main flow working
- **Health checks (liveness + readiness)** — separate "am I alive" (restart me if not) from "can I serve traffic" (stop sending requests)
- **Load shedding** — reject excess traffic early with 503 rather than degrading response times for everyone
- **Deadline propagation** — pass remaining time budget through the call chain so every layer knows when to stop waiting

## Observability

- **Structured logging** — key-value pairs, not printf strings; machine-parseable, filterable, correlatable
- **Distributed tracing** — propagate trace ID + span ID across service boundaries; reconstruct full request path (OpenTelemetry)
- **Metric cardinality discipline** — bound label/tag values to a known set; unbounded cardinality (user IDs as labels) explodes storage costs
- **Request-scoped context** — request ID, trace ID, user ID flow through the entire call stack via context object
- **Dependency health in readiness probes** — readiness check actually pings DB, cache, and queue; don't report healthy when a critical dependency is down
- **Error rate alerting** — alert on error rate increase, not absolute count; handles traffic fluctuation gracefully

## Security

- **Input validation at trust boundary** — validate all external input at the system's entry point; internal code trusts validated data
- **Secrets from vault, not code** — secrets loaded from environment variables or a secrets manager at startup; never committed to source control
- **RBAC with middleware** — role/permission checks in a middleware layer before the handler executes; handlers assume authorization is done
- **Audit logging** — immutable, append-only log of who did what, when, from where; separate from application logs
- **Defense in depth** — validate at multiple layers (middleware, handler, database constraints); no single layer is the sole gatekeeper
- **Parameterized queries** — always use parameterized/prepared statements; never interpolate user input into SQL strings
- **Principle of least privilege** — services and database users have only the permissions they need; no shared admin credentials across services
