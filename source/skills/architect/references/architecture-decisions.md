# Architecture Decisions Reference

Structured reference for {{command_prefix}}architect. Load on first invocation per session. Use to identify quality attributes, frame trade-offs, and generate ADR documents.

## Quality Attribute Taxonomy

Eight quality attributes for evaluating architecture decisions. When presenting options, score against the 2–4 attributes most relevant to the decision.

### Performance
- **Definition:** how fast the system responds under expected load
- **Measures:** latency (p50/p95/p99), throughput (requests/sec), time-to-first-byte
- **Tensions:** performance ↔ maintainability (optimized code is harder to read), performance ↔ cost (faster hardware costs more)
- **Resolution:** optimize hot paths, keep cold paths readable. Profile before optimizing. Cache at the right layer.

### Scalability
- **Definition:** how the system handles growing load without redesign
- **Measures:** horizontal scale factor, max concurrent users, data volume limits
- **Tensions:** scalability ↔ simplicity (distributed systems are complex), scalability ↔ consistency (CAP theorem)
- **Resolution:** scale the bottleneck, not everything. Start simple, add distribution when profiling shows need.

### Maintainability
- **Definition:** how easy the system is to understand, modify, and extend
- **Measures:** time-to-onboard new developer, time-to-implement typical feature, test coverage, cyclomatic complexity
- **Tensions:** maintainability ↔ performance (abstractions add overhead), maintainability ↔ flexibility (more options = more code paths)
- **Resolution:** clear boundaries, descriptive names, comprehensive tests. Complexity budget: add complexity only where it serves a measured need.

### Security
- **Definition:** how well the system protects data and resists unauthorized access
- **Measures:** OWASP top-10 coverage, auth/authz boundary clarity, secret management practice, audit log completeness
- **Tensions:** security ↔ usability (more auth steps = more friction), security ↔ performance (encryption adds latency)
- **Resolution:** defense in depth. Validate at boundaries, encrypt in transit and at rest, principle of least privilege.

### Cost
- **Definition:** total cost of ownership including infrastructure, licensing, and engineering time
- **Measures:** monthly cloud spend, engineering hours per feature, licensing fees, operational burden
- **Tensions:** cost ↔ performance (faster = more expensive), cost ↔ reliability (redundancy costs money)
- **Resolution:** right-size infrastructure. Pay for what you use. Managed services trade money for engineering time.

### Operability
- **Definition:** how easy the system is to deploy, monitor, and troubleshoot in production
- **Measures:** deploy frequency, mean-time-to-recovery (MTTR), alert-to-resolution time, runbook completeness
- **Tensions:** operability ↔ simplicity (monitoring adds moving parts), operability ↔ cost (observability tools aren't free)
- **Resolution:** invest in observability early. Structured logging, health checks, and deployment automation pay dividends.

### Testability
- **Definition:** how easy the system is to verify through automated tests
- **Measures:** test coverage, test execution time, ease of writing a new test, mock/stub complexity
- **Tensions:** testability ↔ performance (dependency injection adds indirection), testability ↔ simplicity (interfaces for mocking)
- **Resolution:** design for testability at boundaries. Inject dependencies at construction time. Avoid testing implementation details.

### Simplicity
- **Definition:** how few moving parts the system has relative to what it does
- **Measures:** number of services, number of distinct technologies, lines of configuration, concept count
- **Tensions:** simplicity ↔ scalability (simple = monolith, which has scale limits), simplicity ↔ flexibility (fewer abstractions = fewer extension points)
- **Resolution:** start with the simplest thing that works. Add complexity only when a measured need demands it. Remove complexity when the need passes.

## Common Decision Categories

Typical architecture decisions organized by domain. Each category lists the quality attributes most commonly in tension.

### Data store selection
- **Key tensions:** consistency vs flexibility vs operational cost
- **Typical options:** relational (PostgreSQL, MySQL), document (MongoDB, DynamoDB), key-value (Redis, Memcached), search (Elasticsearch), time-series (InfluxDB, TimescaleDB)
- **Decision drivers:** data model shape, query patterns, consistency requirements, team familiarity, operational burden

### Communication patterns
- **Key tensions:** coupling vs simplicity, latency vs reliability
- **Typical options:** synchronous HTTP/gRPC, asynchronous messaging (queues, events), hybrid
- **Decision drivers:** latency requirements, failure isolation needs, ordering guarantees, team debugging capability

### Deployment model
- **Key tensions:** simplicity vs scalability vs cost
- **Typical options:** monolith, modular monolith, microservices, serverless, hybrid
- **Decision drivers:** team size, deployment frequency, scale requirements, operational maturity

### Authentication strategy
- **Key tensions:** security vs UX vs complexity
- **Typical options:** session-based, JWT, OAuth2/OIDC, API keys, mutual TLS
- **Decision drivers:** client type (browser, mobile, service), session duration, revocation needs, compliance requirements

### Caching layer
- **Key tensions:** performance vs consistency vs complexity
- **Typical options:** application-level cache, distributed cache (Redis), CDN, database query cache, no cache
- **Decision drivers:** read/write ratio, staleness tolerance, cache invalidation complexity, data size

### API style
- **Key tensions:** developer experience vs performance vs tooling
- **Typical options:** REST, gRPC, GraphQL, WebSocket, hybrid
- **Decision drivers:** client types, payload shape variability, streaming needs, team expertise, documentation requirements

### Service boundaries
- **Key tensions:** autonomy vs coordination vs operational overhead
- **Typical options:** single service, vertical slices, domain-bounded contexts, full microservices
- **Decision drivers:** team structure (Conway's law), deployment independence needs, data ownership, scaling units

## ADR Template

Use this template for L3 (with blanks) and L4 (filled in) responses:

```markdown
# ADR-NNN: <Decision Title>

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNN

## Context

What problem does this decision address? What forces are at play — technical, business, team, timeline? What constraints limit the options?

## Decision

What did we decide? One clear statement. Example: "We will use PostgreSQL with JSONB columns for the user profile store."

## Options Considered

### Option 1: <Name>
- Quality attributes: <scored against relevant attributes>
- Pros: <2-3 bullets>
- Cons: <2-3 bullets>

### Option 2: <Name>
- Quality attributes: <scored against relevant attributes>
- Pros: <2-3 bullets>
- Cons: <2-3 bullets>

### Option 3: <Name> (if applicable)
- Quality attributes: <scored>
- Pros / Cons

## Consequences

What becomes easier? What becomes harder? What are we explicitly accepting as a trade-off? What follow-up decisions does this create?
```

## Architecture Anti-Patterns

Flag these when guiding the user through a decision:

- **Analysis paralysis** — over-analyzing options without deciding. If the options are close in quality, pick one and move on. The cost of indecision often exceeds the cost of a suboptimal choice.
- **Resume-driven development** — choosing a technology because it looks good on a resume, not because it serves the problem. Ask: "would we choose this if nobody ever saw our tech stack?"
- **Premature optimization** — optimizing for scale, performance, or flexibility before measuring a need. Profile first. Build the simplest thing, then optimize the measured bottleneck.
- **Cargo-cult architecture** — copying patterns (microservices, event sourcing, CQRS) from companies with different constraints without understanding the forces that led to those choices.
- **Golden hammer** — using one technology or pattern for every problem. Every tool has a sweet spot; recognize when you've left it.
- **Accidental complexity** — adding moving parts (services, queues, caches, abstractions) that don't serve a current, measured requirement. Each moving part has operational cost.
