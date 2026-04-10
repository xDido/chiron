# Caching concept pack

Cache patterns, invalidation strategies, stampede prevention, and TTL management. Cross-language seeds for building reliable caches in any backend system regardless of cache provider (Redis, Memcached, in-process LRU, CDN, etc.). These seeds target the most common correctness and efficiency gaps in cache implementations.

## Caching pattern tag list (for eyeball fallback reference)

When no seed matches the target file, the step 5 eyeball fallback looks for instances of these named patterns:

### Invalidation

- **caching:write-through** — update cache synchronously on every write, keeping it consistent with the source
- **caching:write-behind** — buffer writes in cache and flush to the source asynchronously
- **caching:cache-aside** — application reads from cache, fills on miss, invalidates on write
- **caching:event-driven-invalidation** — invalidate cache entries in response to domain events or CDC streams
- **caching:tag-based-invalidation** — associate cache entries with tags so related entries can be purged together
- **caching:delete-then-write** — invalidate cache before writing to DB to minimize stale window under race conditions
- **caching:cascading-invalidation** — invalidating dependent cache entries when a parent entity changes

### Performance

- **caching:stampede-prevention** — lock, probabilistic early expiry, or request coalescing to avoid thundering herd
- **caching:read-through** — cache fetches from source on miss transparently, callers never see the source directly
- **caching:multi-tier-cache** — L1 in-process + L2 distributed cache for latency and hit-rate balance
- **caching:hot-key-detection** — identifying and specially handling keys with disproportionate access frequency
- **caching:cache-warming** — pre-populating cache entries before traffic arrives after deploy or cold start
- **caching:lazy-population** — populate cache entries only on first access, not proactively
- **caching:stale-while-revalidate** — serve stale value immediately while refreshing in the background

### Key management

- **caching:key-namespacing** — prefixed, structured keys that prevent collision across domains
- **caching:key-hashing** — hashing long or complex keys to a fixed-length representation
- **caching:versioned-keys** — embedding a version in the key to invalidate on schema change without flush
- **caching:key-enumeration-avoidance** — designing keys so bulk invalidation does not require scanning all keys
- **caching:composite-key** — combining multiple dimensions (tenant, entity, variant) into a single structured key
- **caching:key-length-budget** — keeping keys short to reduce memory overhead in key-heavy workloads

### Availability

- **caching:fallback-on-failure** — graceful degradation to source when cache is unreachable
- **caching:circuit-breaker-on-cache** — stop hitting a failing cache and go direct to source until recovery
- **caching:replication-awareness** — understanding read-after-write consistency in replicated cache clusters
- **caching:local-fallback** — in-process fallback cache when the distributed cache is temporarily unavailable
- **caching:graceful-cold-start** — rate-limiting source queries during cache rebuild to avoid overwhelming the backend
- **caching:cache-health-check** — probing cache availability before routing read traffic through it

### Memory management

- **caching:ttl-strategy** — choosing appropriate TTL values based on data volatility and staleness tolerance
- **caching:eviction-policy** — selecting LRU, LFU, or TTL-based eviction appropriate to the access pattern
- **caching:memory-budget** — setting explicit max-memory or max-entry-count limits on the cache
- **caching:serialization-efficiency** — compact serialization formats to reduce cache memory and network overhead
- **caching:large-object-avoidance** — keeping individual cache values small to avoid eviction pressure and latency
- **caching:ttl-jitter** — randomizing TTL slightly to prevent synchronized mass expiration
- **caching:negative-caching** — caching "not found" results with short TTL to avoid repeated source misses

## Caching challenge seeds

### `caching:missing-invalidation`

**Signal:** Code writes or updates a record in a database (INSERT, UPDATE, DELETE, or ORM equivalent) and does not touch the cache entry that corresponds to the same data. A read path elsewhere populates the cache from the database, but the write path has no cache delete, cache update, or cache invalidation call. The cache will serve stale data until TTL expires or the process restarts. Look for a `cache.set(...)` or `cache.get(...)` in a read function paired with a write function in the same module that mutates the same entity but has no corresponding `cache.delete(...)`, `cache.invalidate(...)`, or `cache.set(...)` call.

**Drill:**
- **Task:** Add cache invalidation (delete or update) on the write path so the cache does not serve stale data after a mutation.
- **Constraint:** The invalidation must happen after the database write succeeds (not before); if the cache delete fails, it must not cause the write operation to fail (fire-and-forget delete or catch-and-log).

### `caching:stampede`

**Signal:** On a cache miss, the code fetches the value from the source (database query, API call, computation) and writes it back to the cache, with no locking, request coalescing, or early recomputation. If N concurrent requests hit the same missing key simultaneously, all N will independently query the source and race to populate the cache, causing a thundering herd on the backend. The classic shape is: `value = cache.get(key); if value is None: value = db.query(...); cache.set(key, value)` -- the gap between the miss check and the set is unprotected.

**Drill:**
- **Task:** Add a mechanism so that only one request computes the value on cache miss while others wait for the result.
- **Constraint:** The solution must use an explicit lock, singleflight/request-coalescing pattern, or probabilistic early expiry; simply shortening the TTL does not count. Waiters must receive the computed value, not trigger their own source query.

### `caching:no-ttl`

**Signal:** A cache set/put call that does not specify a TTL, expiration time, or expiry option. The entry is written with the cache's default expiration (often infinite or very long). There is no explicit duration, `EX`, `EXPIRE`, `ttl`, `timeout`, `maxAge`, or equivalent parameter in the set call. The data will remain cached indefinitely even if the source data changes. Common shapes: `redis.set(key, value)` without `ex=` or `EX`, `cache.put(key, value)` with no duration argument, `localStorage.setItem(key, value)` with no surrounding expiry logic.

**Drill:**
- **Task:** Add an explicit TTL to every cache write, chosen based on how frequently the underlying data changes.
- **Constraint:** The TTL must be explicitly passed in each set call (not relying on a global default); the value must be finite and documented with a brief comment explaining the staleness tolerance.

### `caching:key-collision`

**Signal:** Cache keys are constructed by simple string concatenation or interpolation without a namespace prefix, separator convention, or type discriminator. Examples: `cache.get(userId)`, `cache.get(f"{id}")`, `cache.set(name, value)`. Two different domains or entity types that happen to share an ID format (both use integer IDs, both use UUIDs) will collide in the same cache namespace. Also matches when multiple call sites construct keys with different ad-hoc formats (`"user_" + id` in one place, `"user:" + id` in another) for the same logical entity.

**Drill:**
- **Task:** Add a structured key format with a namespace prefix and consistent separator so different entity types cannot collide.
- **Constraint:** The key format must include at least entity type and identifier (e.g., `user:profile:{id}`); the key-building logic must be a shared helper function, not ad-hoc string formatting at each call site.

### `caching:caching-errors`

**Signal:** Code caches the result of an operation without distinguishing success from failure. When the source call fails (throws an exception, returns an error, returns null/empty), the error result or empty value is written to the cache with the same TTL as a successful result. Subsequent requests will be served the cached error/empty response for the full TTL duration instead of retrying the source. Common shapes: `result = fetch_from_api(); cache.set(key, result, ttl=300)` where `result` could be an error response or empty body, cached for the same 5 minutes as a valid response.

**Drill:**
- **Task:** Only cache successful results; for errors, either skip caching entirely or cache with a much shorter TTL (seconds, not minutes).
- **Constraint:** The short TTL for error responses must be at most 1/10th of the normal TTL; the code must explicitly check the result status before deciding whether and how long to cache.

### `caching:no-fallback`

**Signal:** A cache read failure (connection refused, timeout, deserialization error) is either unhandled (crashes the request) or returns a generic error to the caller. There is no fallback path that bypasses the cache and reads directly from the source. A cache outage becomes a full service outage. Look for `cache.get(key)` calls where the surrounding code has no try/catch for connection errors, or where a Redis/Memcached timeout propagates directly as an HTTP 500 to the end user.

**Drill:**
- **Task:** Add a fallback path that reads from the source when the cache is unavailable, so the service degrades gracefully instead of failing.
- **Constraint:** The fallback must catch cache-specific errors (connection, timeout, serialization) without catching business logic errors; the response time will be slower but the request must succeed. Log the cache failure so operators can detect the degradation.

### `caching:over-caching`

**Signal:** A function caches a value that is trivially cheap to compute or fetch -- an in-memory lookup, a constant, a value derived from local configuration, or a database query that takes under 1ms on an indexed primary key. The cache infrastructure overhead (serialization, network round-trip to cache, deserialization) is comparable to or exceeds the cost of the original operation. The cache adds complexity without meaningful latency benefit. Also matches caching of values that change on every request (e.g., current timestamp, random nonce) where the cache is never actually hit.

**Drill:**
- **Task:** Remove the cache for this value and fetch it directly from the source on every request.
- **Constraint:** Justify the removal with a brief comment noting why caching is unnecessary (e.g., "sub-ms indexed PK lookup, cache overhead exceeds query cost"); if there is a legitimate throughput reason to keep the cache, document it instead of removing.

### `caching:no-warming`

**Signal:** After a deployment, restart, or cache flush, all cache entries start empty. The first wave of requests after startup all experience cache misses simultaneously, causing a load spike on the backend (database, upstream API). There is no pre-population or warming step in the application startup path, and the data being cached is predictable (e.g., top-N products, configuration, feature flags). Look for an application main/init function that starts the HTTP server immediately with no cache pre-population, combined with a cache-aside read path that fetches from DB on miss.

**Drill:**
- **Task:** Add a cache warming step that pre-populates known high-traffic keys during application startup, before the service accepts live traffic.
- **Constraint:** The warming must complete before the health check endpoint reports ready (or before the readiness probe passes); the set of keys to warm must be explicitly defined, not a full cache rebuild.

### `caching:serialization-overhead`

**Signal:** Cache get/set operations serialize and deserialize large objects using a verbose format (default JSON serialization of a full ORM model, XML, or `pickle`/native serialization that includes class metadata). The cached value includes fields that the consumer never reads, or the serialization format is significantly larger than the data requires. Cache memory usage and network transfer are inflated. Look for `cache.set(key, json.dumps(user.__dict__))` or `cache.set(key, serialize(fullEntity))` where only 2-3 fields from the object are ever accessed after deserialization.

**Drill:**
- **Task:** Cache only the fields the consumer actually needs, using a compact representation (DTO, projection, or a leaner serialization format).
- **Constraint:** The cached structure must have fewer fields than the full source object; the serialized size must be measurably smaller (estimate the reduction in a code comment).

### `caching:unbounded-size`

**Signal:** An in-process cache (dictionary, hash map, ConcurrentHashMap, module-level dict, or similar) grows without any eviction policy or size limit. Entries are added on cache miss but never removed, expired, or evicted. Over time, memory usage grows proportionally to the number of distinct keys ever cached, with no upper bound. There is no max-size configuration, no LRU/LFU eviction, and no periodic cleanup. Common shapes: `_cache = {}` at module level with `_cache[key] = value` in a function, `private static final Map<K,V> CACHE = new HashMap<>()` with `put` but no `remove` or size check, `sync.Map{}` with `Store` but no periodic sweep.

**Drill:**
- **Task:** Replace the unbounded structure with a size-bounded cache that evicts entries when a maximum capacity is reached.
- **Constraint:** The maximum capacity must be explicitly configured (not a magic number); the eviction policy must be named (LRU, LFU, or TTL-based); the replacement must be a single-line swap or minimal refactor, not a custom eviction implementation.

### `caching:stale-serving-without-revalidation`

**Signal:** A cache-aside read path returns stale data after TTL expiry by catching the miss and returning the last known value from a secondary store, but never triggers a background refresh. The stale value is served indefinitely with no mechanism to eventually converge to the current source value. This is distinct from a proper stale-while-revalidate pattern because there is no revalidation step -- the cache entry is simply never updated after the initial population. Look for `cache.get(key) || fallbackCache.get(key)` or `cache.get(key, allowExpired=True)` with no corresponding async refresh trigger.

**Drill:**
- **Task:** When serving a stale value, trigger an asynchronous background refresh so the cache converges to the current source value within one additional TTL window.
- **Constraint:** The stale value must be returned immediately to the caller (no blocking on the refresh); the refresh must be deduplicated so that N concurrent stale reads trigger at most one source query, not N.

### `caching:ttl-without-jitter`

**Signal:** Multiple cache entries of the same type are all set with the same fixed TTL value, and these entries are populated in bulk or in a tight loop (e.g., warming a batch of product records, caching search results for multiple queries). When the TTL expires, all entries expire simultaneously, causing a coordinated stampede of source queries at the same instant. The TTL has no randomized offset or jitter component. Look for `for item in items: cache.set(key(item), value, ttl=3600)` where every entry gets exactly the same 3600-second TTL.

**Drill:**
- **Task:** Add jitter to the TTL so that entries expire at staggered times, spreading the load of cache repopulation across a time window.
- **Constraint:** The jitter must be a random offset of at least 5% and at most 20% of the base TTL (e.g., for a 1-hour TTL, jitter of 3-12 minutes); the randomization must use a proper random source, not a hash of the key (which would produce the same "jitter" every time for the same key).
