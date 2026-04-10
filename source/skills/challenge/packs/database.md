# Database concept pack

Cross-language patterns for SQL/NoSQL data access: query safety, transactions, connection management, schema evolution, and query optimization. Seeds target the data-access layer regardless of language or ORM.

## Database pattern tag list (for eyeball fallback reference)

### Query safety

- **db:parameterized-query** — use bind parameters instead of string interpolation for all user-supplied values
- **db:sql-injection-concat** — string concatenation or template literals building SQL with untrusted input
- **db:unvalidated-identifier** — table or column names injected from user input without an allow-list check

### Transaction management

- **db:transaction-boundary** — wrap multi-statement mutations in an explicit transaction with rollback on error
- **db:transaction-retry** — serialization failures and deadlocks require retry loops, not a single attempt
- **db:long-running-txn** — transactions held open across I/O waits, user interaction, or network calls
- **db:savepoint** — use savepoints for partial rollback within a larger transaction

### Connection management

- **db:connection-pool** — acquire connections from a pool, never open raw connections per request
- **db:connection-leak** — connections acquired but not released on all return paths (including error paths)
- **db:pool-exhaustion** — unbounded concurrency against a fixed-size pool without backpressure or timeout

### Query optimization

- **db:n-plus-one** — a query inside a loop that could be replaced by a single batch/join query
- **db:missing-index** — filter or join on a column with no index, scanning the full table
- **db:select-star** — `SELECT *` when only a few columns are needed, pulling unnecessary data across the wire
- **db:unbounded-result-set** — query with no `LIMIT` or pagination that can return millions of rows

### Schema patterns

- **db:nullable-column** — nullable column used where a default or NOT NULL + migration would be safer
- **db:soft-delete** — soft-delete via a `deleted_at` column with proper index and query filtering
- **db:migration-safety** — schema migrations that lock tables or are not backward-compatible with running code
- **db:enum-as-string** — free-form strings storing a fixed set of values instead of an enum or check constraint

## Database challenge seeds

### `db:sql-injection-concat`

**Signal:** A SQL query string is built by concatenating or interpolating a variable that originates from function parameters, HTTP request fields, or any external input. Look for patterns like `"SELECT ... WHERE id = " + userId`, f-string/template-literal SQL, or `fmt.Sprintf` / `String.format` with `%s`/`%d` placeholders dropped into a query string. The variable is NOT passed through a parameterized placeholder (`?`, `$1`, `:name`).

**Drill:**
- **Task:** rewrite the query to use parameterized placeholders and pass the variable as a bind parameter.
- **Constraint:** zero string concatenation or interpolation inside any SQL string; every external value flows through the driver's parameter binding.

### `db:transaction-boundary`

**Signal:** Two or more write statements (INSERT, UPDATE, DELETE) execute sequentially against the database within the same function, but no explicit transaction (BEGIN/COMMIT or the ORM's transaction API) wraps them. If the second statement fails, the first is already committed.

**Drill:**
- **Task:** wrap the writes in an explicit transaction; roll back on any error.
- **Constraint:** on error, none of the writes persist; the rollback must execute on all error paths including panics/exceptions.

### `db:connection-leak`

**Signal:** A database connection, cursor, statement, or result-set is acquired (opened, prepared, or queried) but is not closed on every return path. Look for missing `defer`/`try-finally`/`using`/`with`/`try-with-resources` around the resource, or an early return between acquisition and close.

**Drill:**
- **Task:** guarantee the resource is closed on every exit path using the language's idiomatic cleanup mechanism (defer, context manager, using, try-with-resources).
- **Constraint:** no path through the function — including exceptions and early returns — can leak the resource.

### `db:n-plus-one`

**Signal:** A query executes inside a loop body where the loop iterates over the results of a prior query. For example: fetch a list of orders, then for each order, query its line items individually. The inner query's WHERE clause uses a value from the outer result set.

**Drill:**
- **Task:** replace the loop of individual queries with a single batch query (IN clause, JOIN, or equivalent bulk fetch) and map results in application code.
- **Constraint:** exactly one query replaces the N inner queries; the outer loop no longer issues any database calls.

### `db:migration-safety`

**Signal:** A schema migration adds a NOT NULL column without a default value to an existing table, or renames/drops a column that running application code still references, or adds a unique constraint to a column that may have duplicates. The migration will fail or break the live application during a rolling deploy.

**Drill:**
- **Task:** split the migration into backward-compatible steps: add the column as nullable with a default, backfill, then tighten the constraint in a subsequent migration.
- **Constraint:** at no point does an in-flight request fail because of schema mismatch; old code and new code both work during the migration window.

### `db:batch-insert`

**Signal:** Individual INSERT statements execute inside a loop — one row inserted per iteration. The loop processes a collection of known size (list, array, slice). No batching, multi-row INSERT, or bulk API is used.

**Drill:**
- **Task:** replace the loop of single inserts with a single batch insert (multi-row VALUES clause, bulk insert API, or the ORM's batch create method).
- **Constraint:** exactly one round-trip to the database replaces N round-trips; transaction wrapping is preserved or added.

### `db:query-timeout`

**Signal:** A database query or transaction executes without any timeout or context deadline. The call uses no statement timeout, no context with deadline/timeout, and no connection-level query timeout setting. A slow query or lock wait could block the request indefinitely.

**Drill:**
- **Task:** add a timeout to the query — via a context deadline, statement timeout, or driver-level option.
- **Constraint:** the timeout value is explicit and bounded (not zero/infinite); the caller handles the timeout error distinctly from other failures.

### `db:orm-lazy-loading`

**Signal:** An ORM entity's related collection or reference is accessed outside the session/context that loaded it (the classic "lazy load triggers N+1 in the template" or "detached entity" error). Alternatively, a lazy-loaded relationship is accessed inside a loop without eager loading, producing N+1 queries visible in logs.

**Drill:**
- **Task:** switch the relationship access to eager loading (join fetch, include, prefetch_related, or equivalent) at the query site where the parent entity is loaded.
- **Constraint:** accessing the related data issues no additional queries beyond the initial load; the number of SQL statements is verifiable in a query log or debug output.

### `db:nullable-column-handling`

**Signal:** Code reads a database column value and uses it directly without checking for NULL. The column is nullable in the schema (or the query includes an outer join that can produce NULLs), but the application code treats the value as always present — no nil/null/None check, no COALESCE, no nullable type wrapper.

**Drill:**
- **Task:** handle the NULL case explicitly — either check for null in application code and provide a default, or use COALESCE/IFNULL in the query itself.
- **Constraint:** a NULL value from the database never causes a null-pointer exception, type error, or silent wrong behavior.

### `db:soft-delete-filter`

**Signal:** A table uses soft deletes (a `deleted_at`, `is_deleted`, or `status` column marks rows as deleted), but at least one query against that table lacks the corresponding filter. The query returns logically deleted rows alongside live ones.

**Drill:**
- **Task:** add the soft-delete filter (`WHERE deleted_at IS NULL` or equivalent) to every query that should exclude deleted rows.
- **Constraint:** queries that intentionally include deleted rows (admin, audit, undelete) are left unchanged; all user-facing queries filter correctly.

### `db:read-replica-routing`

**Signal:** A codebase has both a primary and read-replica database configuration (two connection strings, two pool instances, or a router/proxy setup), but read-only queries (SELECT with no side effects) are sent to the primary instead of the replica. Look for SELECT queries using the write connection/pool when a read pool is available.

**Drill:**
- **Task:** route the pure-read query to the read replica connection.
- **Constraint:** only SELECT queries with no writes, no transaction requirements, and no immediate-consistency needs move to the replica; write queries stay on the primary.

### `db:missing-index-awareness`

**Signal:** A query filters (WHERE), joins (ON), or orders (ORDER BY) on a column, and there is no corresponding index visible in the migration files or schema definition. The table is expected to grow large (not a small lookup/enum table). No comment or documentation acknowledges the missing index as intentional.

**Drill:**
- **Task:** add a migration that creates the appropriate index (single-column, composite, or partial as warranted by the query pattern).
- **Constraint:** the index covers the filter/join/sort columns in the correct order; if the query uses multiple columns, a composite index is preferred over multiple single-column indexes.

### `db:select-star-overhead`

**Signal:** A `SELECT *` query in application code (not in an ad-hoc debug/admin script) where the consuming code only uses a subset of the returned columns. The table has columns that are large (TEXT, BLOB, JSON) or numerous (10+ columns) and the query result is mapped to an object or struct that does not need all of them.

**Drill:**
- **Task:** replace `SELECT *` with an explicit column list matching the fields actually used by the calling code.
- **Constraint:** every column in the SELECT list is read by the application; no unused columns cross the wire.

### `db:unbounded-query`

**Signal:** A query returns a result set with no LIMIT, no pagination cursor, and no application-level cap on row count. The table it queries is not a small bounded reference table. The result is collected into an in-memory list/array/slice.

**Drill:**
- **Task:** add a LIMIT (or equivalent pagination) to the query and surface a pagination mechanism (offset, cursor, or keyset) to the caller.
- **Constraint:** no single query can return more than a configured page size; the caller can request subsequent pages.
