# Debugging Playbook

Structured reference for /debug. Load on first invocation per session. Use to categorize symptoms, form hypotheses, and guide verification steps.

## Hypothesis Template

Every debugging hypothesis follows this structure:

```
If [specific cause],
then [observable prediction you can test]
when [concrete verification step].
```

Example: *"If the map is being written concurrently without a mutex, then you'd see a `concurrent map writes` panic when running `go test -race ./internal/cache/`."*

A hypothesis that can't be verified in one step is too broad — narrow it.

## Root Cause Categories

### State bug
- **Symptoms:** wrong value returned, stale data displayed, mutation visible in one place but not another
- **Where to look:** shared mutable state, global variables, caches without invalidation, closures capturing loop variables
- **Verification:** add a breakpoint or log at the mutation site; check if the value is what you expect when it's read
- **Example hypothesis:** "If the config is cached at startup and never refreshed, then the stale value will persist after updating the config file until the process restarts."

### Race condition
- **Symptoms:** intermittent failures, different results on each run, panics under load, "impossible" state combinations
- **Where to look:** shared data accessed by multiple goroutines/threads without synchronization, concurrent map writes, unsynchronized counters
- **Verification:** run with a race detector (`go test -race`, `tsan`, `ThreadSanitizer`); add deliberate delays to widen the race window
- **Example hypothesis:** "If two goroutines write to the map concurrently, then `go test -race` will report a data race on the map variable."

### Type / nil mismatch
- **Symptoms:** nil pointer dereference, "cannot convert" errors, unexpected type assertion failures, JSON unmarshalling into wrong type
- **Where to look:** interface assertions without comma-ok, pointer receivers on nil values, JSON fields with wrong types, uninitialized struct fields
- **Verification:** check the concrete type at the failure point; add a nil guard and log the path that reaches it
- **Example hypothesis:** "If the API response has a null `user` field, then the type assertion `resp.User.(UserProfile)` will panic because the interface value is nil."

### Boundary error
- **Symptoms:** off-by-one, empty collection panics, integer overflow, slice out-of-bounds, empty string where non-empty expected
- **Where to look:** loop bounds, slice indexing, string length checks, zero-value handling, max/min edge cases
- **Verification:** test with boundary inputs: 0, 1, max, empty, nil
- **Example hypothesis:** "If the input slice is empty, then `items[len(items)-1]` panics with index out of range because len is 0."

### Configuration drift
- **Symptoms:** works locally but fails in staging/production, "it worked yesterday", environment-specific failures
- **Where to look:** environment variables, config files, feature flags, secret rotation, DNS resolution, certificate expiry
- **Verification:** diff the config between working and broken environments; check if env vars are set and match expected values
- **Example hypothesis:** "If the DATABASE_URL env var is missing in staging, then the connection attempt will use the default localhost URL and fail with 'connection refused'."

### Dependency conflict
- **Symptoms:** compile errors after update, runtime behavior change without code change, "module not found", version mismatch warnings
- **Where to look:** lock files, transitive dependencies, major version bumps in dependencies, breaking changes in changelogs
- **Verification:** diff the lock file against the last working version; check the dependency's changelog for breaking changes
- **Example hypothesis:** "If the `v2.0.0` release of the HTTP client changed the default timeout from 30s to 5s, then requests to the slow endpoint will start timing out after upgrading."

### Resource leak
- **Symptoms:** increasing memory usage over time, too many open files, connection pool exhaustion, "too many open connections"
- **Where to look:** unclosed file handles, HTTP response bodies not closed, database connections not returned to pool, goroutines/threads that never terminate
- **Verification:** monitor resource counts over time (goroutine count, open FDs, connection pool stats); use profiling tools (`pprof`, memory profilers)
- **Example hypothesis:** "If the HTTP response body is not closed after reading, then each request leaks a TCP connection and the pool exhausts after ~100 requests."

### Encoding / serialization
- **Symptoms:** garbled text, wrong characters, JSON parse errors, protobuf decode failures, unexpected Base64 output
- **Where to look:** charset mismatches (UTF-8 vs Latin-1), JSON field name casing (camelCase vs snake_case), time format strings, byte order marks
- **Verification:** hex-dump the raw bytes at the serialization boundary; compare expected vs actual encoding
- **Example hypothesis:** "If the server sends UTF-8 but the client parses as Latin-1, then multibyte characters (accents, emoji) will appear as garbled sequences."

### Network / timeout
- **Symptoms:** connection refused, connection timed out, intermittent 503s, DNS resolution failures, TLS handshake errors
- **Where to look:** firewall rules, DNS records, certificate validity, load balancer health checks, timeout configurations, retry policies
- **Verification:** test connectivity with `curl -v` or `telnet`; check if the target is reachable and responding within the timeout window
- **Example hypothesis:** "If the load balancer health check path returns 404, then the target will be marked unhealthy and all requests will get 503."

### Logic error
- **Symptoms:** wrong output for valid input, incorrect calculation, conditions that should be true evaluating false, wrong branch taken
- **Where to look:** conditional logic (especially negation, AND/OR precedence), comparison operators (< vs <=), algorithm implementation, business rule translation from spec to code
- **Verification:** trace the exact input through the logic step by step; check if each condition evaluates as expected
- **Example hypothesis:** "If the discount condition checks `quantity > 10` but the spec says `quantity >= 10`, then orders of exactly 10 items miss the discount."

## Debugging Anti-Patterns

When guiding the user through debugging, flag these if they appear:

- **Shotgun debugging** — changing random things until the bug disappears. The bug isn't fixed; it's hiding. Form a hypothesis first.
- **Printf-only debugging** — adding log statements without a hypothesis about what you're looking for. Logs are verification tools, not discovery tools.
- **Fix-then-understand** — shipping a fix without knowing the root cause. The fix may be a band-aid that masks a deeper issue.
- **Blame-the-framework** — assuming the bug is in a library or framework before checking your own code. It's almost always your code.
- **Scope creep** — fixing unrelated issues discovered during debugging. Note them, file them, but don't fix them in the debugging session. Stay focused on the reported bug.
- **Confirmation bias** — only testing scenarios that confirm your hypothesis. Actively try to *disprove* it — test the case where your hypothesis predicts the bug should NOT appear.
