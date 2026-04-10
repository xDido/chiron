# Testing concept pack

Cross-language testing patterns covering test isolation, integration testing, contract testing, test quality, and test data management. Seeds describe structural anti-patterns in test suites that reduce confidence, slow feedback, or mask real bugs, regardless of language or framework.

When no seed matches the target file, the step 5 eyeball fallback looks for instances of these named patterns:

## Testing pattern tag list (for eyeball fallback reference)

### Test isolation

- **testing:independent-tests** — each test runs independently with no shared mutable state between cases
- **testing:cleanup-teardown** — every resource created during a test is cleaned up, even on failure
- **testing:hermetic-environment** — tests do not depend on machine-specific paths, ports, or external services
- **testing:deterministic-ordering** — test results are identical regardless of execution order
- **testing:transaction-rollback** — database tests wrapped in a transaction that rolls back, leaving no residual state

### Integration testing

- **testing:real-dependencies** — critical-path integration tests run against real databases, queues, and APIs (or faithful containers)
- **testing:test-containers** — disposable containerized dependencies for integration tests instead of shared dev instances
- **testing:api-smoke-tests** — end-to-end tests that exercise actual HTTP/gRPC endpoints against a running server
- **testing:db-migration-tests** — schema migrations tested forward and backward before deployment
- **testing:service-boundary-tests** — tests that exercise the wiring between services (serialization, auth, error mapping)
- **testing:ci-integration-gate** — integration tests run in CI as a merge gate, not only locally

### Contract testing

- **testing:api-contract** — consumer-driven or provider-driven contract tests for every inter-service boundary
- **testing:schema-validation** — request and response payloads validated against a published schema (OpenAPI, protobuf, JSON Schema)
- **testing:backward-compatibility** — API changes verified against existing consumer expectations before deployment
- **testing:versioned-fixtures** — contract test fixtures versioned alongside the API schema they validate
- **testing:event-contract** — async event payloads (message queues, webhooks) validated against a shared schema

### Test quality

- **testing:behavior-over-implementation** — tests assert observable outputs and side effects, not internal method calls or private state
- **testing:edge-case-coverage** — tests cover boundary values, empty inputs, nulls, and error paths — not just the happy path
- **testing:meaningful-assertions** — assertions check specific values and conditions, not just "no exception thrown"
- **testing:no-test-code-in-prod** — test helpers, fixtures, and mocks are confined to test directories, never shipped in production builds
- **testing:flaky-test-quarantine** — flaky tests are identified, quarantined, and tracked rather than retried silently
- **testing:single-concern-per-test** — each test verifies one behavior, with a descriptive name that documents the scenario
- **testing:error-path-tests** — failure modes (timeouts, invalid input, unavailable dependencies) have dedicated test cases
- **testing:test-naming-convention** — test names describe the scenario and expected outcome, not the method under test

### Test data management

- **testing:factory-over-fixtures** — test data built programmatically via factories or builders, not brittle static fixtures
- **testing:minimal-test-data** — each test creates only the data it needs, with sensible defaults for irrelevant fields
- **testing:no-hardcoded-ids** — tests generate or look up identifiers dynamically instead of relying on magic IDs like `id=1`
- **testing:realistic-data-shape** — test data mirrors production shape and constraints (valid foreign keys, realistic string lengths)
- **testing:seeded-randomness** — random test data uses a fixed seed for reproducibility; seed printed on failure for replay
- **testing:ephemeral-test-accounts** — test user accounts and API keys created per run, never shared with other environments

## Testing challenge seeds

### `testing:mock-db-instead-of-container`

**Signal:** An integration-level test (testing a service method or repository that should hit a database) replaces the entire database layer with an in-memory mock or stub. The test file imports a mock library and patches the database client, connection, or repository interface, meaning no real SQL is executed during the test. Typically visible as a mock/stub of a query method that returns a hardcoded result object. The test verifies application logic but silently skips SQL syntax errors, missing columns, broken joins, and constraint violations that would only surface against a real database.

**Drill:**
- **Task:** replace the database mock with a real database instance managed by a test container (e.g., Testcontainers, Docker Compose, or an embedded database) so the test executes actual queries against a real schema.
- **Constraint:** the test must run a real SQL query against the containerized database and verify the result. The container must be created and destroyed per test suite, not shared across suites.

### `testing:missing-test-isolation`

**Signal:** Two or more tests in the same file or suite share mutable state — a package-level variable, a class field mutated across tests, a database table that is written by one test and read by another without reset, or a shared temporary file. The ordering dependency is visible because one test sets up data that another test implicitly relies on without its own setup step. Running the dependent test in isolation fails, or running the suite in reverse order produces different results.

**Drill:**
- **Task:** make each test self-contained by setting up its own state in a setup/before block and tearing it down in a cleanup/after block (or by using transactions that roll back).
- **Constraint:** the tests must pass when run in any order, including in isolation. Run them individually to verify.

### `testing:testing-implementation-details`

**Signal:** A test asserts on internal method call counts, private field values, or the specific sequence of internal function invocations rather than on the observable output (return value, database state, HTTP response, emitted event). Typically visible as mock verification like `verify(mock).someInternalMethod(times=1)` or direct access to a private/protected field.

**Drill:**
- **Task:** rewrite the test to assert on the observable behavior — the return value, the side effect visible to the caller, or the state of an external system — instead of internal call sequences.
- **Constraint:** remove all mock-call-count assertions. The test must still fail if the feature breaks, but must not break if the internal implementation is refactored.

### `testing:no-integration-tests-critical-path`

**Signal:** A critical code path — payment processing, user registration, authentication flow, or data pipeline — has unit tests that mock all external dependencies but zero integration tests that exercise the full path with real (or containerized) dependencies. The test directory for these modules contains only unit-level files; no integration, end-to-end, or acceptance test file references the critical module. The gap means broken wiring, serialization mismatches, and transaction bugs go undetected until production.

**Drill:**
- **Task:** write an integration test that exercises the critical path end-to-end, using real or containerized dependencies for database, HTTP, and messaging layers.
- **Constraint:** the test must cover both the success path and at least one failure path (e.g., payment declined, duplicate registration). External service calls may use a sandbox/test environment, not mocks.

### `testing:hardcoded-test-data`

**Signal:** Test setup contains magic literal values — specific UUIDs, email addresses, timestamps, or numeric IDs — copy-pasted across multiple test functions or files. The same literal (e.g., `"user@test.com"`, `"550e8400-e29b-41d4-a716-446655440000"`, `id: 42`) appears in multiple test files with no factory, builder, or helper generating it.

**Drill:**
- **Task:** extract a test data factory or builder function that generates valid test objects with sensible defaults, allowing each test to override only the fields it cares about.
- **Constraint:** no magic literal ID, email, or timestamp may appear in more than one test file. Each test must be able to create its own unique test data by calling the factory.

### `testing:missing-edge-case-coverage`

**Signal:** A function that handles variable input (strings, collections, numeric ranges, nullable fields) has tests covering only the happy path — normal-length strings, populated collections, mid-range numbers. There are no test cases for empty strings, empty collections, zero, negative numbers, null/nil/None, maximum values, Unicode characters, or special characters. The test file contains only one or two test cases, all using "normal" representative data.

**Drill:**
- **Task:** add test cases for boundary and edge inputs: empty, null/nil, zero, negative, maximum length, single element, and at least one invalid or unusual input (Unicode, special characters, extremely large values).
- **Constraint:** at least four new edge-case test cases must be added, each targeting a different boundary. Each must assert a specific expected outcome, not just "does not crash."

### `testing:no-api-contract-tests`

**Signal:** A service exposes an HTTP or gRPC API consumed by other services, but the test suite contains no contract tests — no schema validation against an OpenAPI spec, no consumer-driven contract (Pact or similar), and no test that deserializes a response and checks it against a known shape. Integration tests, if present, only assert on status codes without validating response body structure. A field rename or type change would silently break consumers.

**Drill:**
- **Task:** add a contract test that validates the API response structure against a published schema (OpenAPI, JSON Schema, or protobuf definition) for at least one endpoint.
- **Constraint:** the test must fail if a required field is removed, a type changes, or a new required field is added without a schema update. Status-code-only checks are not sufficient.

### `testing:test-code-in-production`

**Signal:** Test-only code is present in production source files — a test helper function, a mock implementation, a fixture-loading method, or a conditional block like `if testing` / `if ENV == "test"` / `#[cfg(test)]` in non-test modules that alters production behavior. Alternatively, a test dependency (mock library, test framework utilities) is listed in the main dependency group rather than the dev/test group, or compiled into the production binary.

**Drill:**
- **Task:** move test-only code to test files or a test-only package/module, and move test dependencies to the dev/test dependency group.
- **Constraint:** the production build must not include any test libraries or test helper code. No runtime `if testing` branches may remain in production source.

### `testing:missing-cleanup-teardown`

**Signal:** A test creates external resources — database rows, temporary files, message queue entries, cache keys, or spawned processes — but has no corresponding cleanup in an after/teardown/cleanup hook or deferred call. The test function ends without deleting, closing, or rolling back what it created. Running the test twice in a row may fail due to unique constraint violations, port conflicts, or stale files left behind by the first run.

**Drill:**
- **Task:** add explicit cleanup in a teardown hook, deferred call, or `finally` block that removes every resource the test created, including on test failure.
- **Constraint:** running the test twice in a row must produce the same result. No leftover data from a previous run may cause a subsequent run to fail or behave differently.

### `testing:flaky-test-signal`

**Signal:** A test depends on wall-clock time (`sleep`, `time.After`, `setTimeout` with a fixed duration), network availability (hitting a live external URL without a timeout or fallback), random data without a fixed seed, or filesystem ordering (globbing without sorting). The flakiness source is visible in the test body as a timing assumption, an uncontrolled external call, or `rand` without a seed. Often accompanied by a comment like `// increase timeout if flaky` or `// sometimes fails on CI`.

**Drill:**
- **Task:** remove the source of non-determinism — replace sleeps with event-driven waits or polling with timeout, replace live URLs with a local test server, fix random seeds, and sort filesystem results.
- **Constraint:** the test must pass 100 times in a row on a single machine. No `sleep` for synchronization may remain; use condition-based waiting instead.

### `testing:asserting-internal-state`

**Signal:** A test reaches into an object's private or internal fields (via reflection, friend access, `@VisibleForTesting`, package-private access, or language-specific escape hatches like `_private_field`) to check values that are not part of the public API. The assertion reads a field that no production caller would access. This couples the test to the exact internal representation, making it break on every refactor even when the feature still works.

**Drill:**
- **Task:** replace the internal-state assertion with one that verifies the same invariant through the public API — return values, public getters, observable side effects, or query results.
- **Constraint:** the test must not access any private or internal field. If no public API exposes the needed information, add a minimal public query method rather than testing via reflection.

### `testing:no-load-test-coverage`

**Signal:** A performance-sensitive endpoint or data-processing pipeline (handling high throughput, large payloads, or concurrent users) has functional tests but no load or stress test. The test directory contains no benchmark file, no performance test script, and no configuration for a load-testing tool (k6, Locust, Gatling, wrk, JMH, or the language's built-in benchmark harness). There are no assertions on response time, throughput, or resource usage anywhere in the test suite for this code path.

**Drill:**
- **Task:** add a load test or benchmark that exercises the critical path under realistic concurrency (at least 10 concurrent clients) and asserts on a latency or throughput threshold.
- **Constraint:** the test must define an explicit pass/fail threshold (e.g., p95 latency under 200 ms, throughput above 100 req/s). The test must be runnable in CI, not only manually.
