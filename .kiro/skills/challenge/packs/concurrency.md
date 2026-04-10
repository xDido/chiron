# Concurrency concept pack

Race conditions, thread safety, lock discipline, and task lifecycle management. Cross-language: seeds describe structural concurrency anti-patterns visible in any backend codebase regardless of language, runtime, or concurrency model (threads, goroutines, async tasks, coroutines).

## Concurrency pattern tag list (for eyeball fallback reference)

When no seed matches the target file, the step 5 eyeball fallback looks for instances of these named patterns:

### Lock discipline

- **concurrency:lock-scope-minimization** — lock held only for the critical section, released before any I/O or blocking call
- **concurrency:consistent-lock-ordering** — multiple locks always acquired in the same global order to prevent deadlock
- **concurrency:lock-granularity** — one lock per logical resource, not a single global lock protecting unrelated state
- **concurrency:rwlock-where-reads-dominate** — read-write lock used when reads vastly outnumber writes, instead of exclusive mutex
- **concurrency:lock-timeout** — lock acquisition with a timeout or try-lock to detect deadlocks instead of blocking forever
- **concurrency:defer-unlock** — lock released via defer, finally, or RAII to guarantee release on all exit paths including panics

### Shared state

- **concurrency:immutable-shared-data** — data shared across threads is immutable after construction, eliminating the need for synchronization
- **concurrency:thread-safe-collection** — concurrent access to maps, lists, or sets uses a concurrent-safe type or external synchronization
- **concurrency:atomic-for-counters** — simple counters and flags use atomic operations instead of a full mutex
- **concurrency:copy-on-share** — data copied before handing to another thread, avoiding shared mutable references
- **concurrency:no-global-mutable-state** — mutable state scoped to a request, task, or actor, not stored in a global/module-level variable accessed by multiple threads

### Task management

- **concurrency:bounded-task-spawning** — concurrency limited by a semaphore, worker pool, or bounded executor, not unbounded goroutine/thread/task creation
- **concurrency:structured-concurrency** — child tasks tied to a parent scope that waits for completion and propagates errors
- **concurrency:graceful-task-shutdown** — long-running tasks respond to cancellation signals and clean up before exiting
- **concurrency:error-propagation-from-tasks** — errors in spawned tasks captured and surfaced to the caller, not silently swallowed
- **concurrency:task-naming** — spawned threads or tasks given descriptive names for debuggability in thread dumps and logs

### Synchronization primitives

- **concurrency:channel-over-shared-memory** — communication between tasks via channels or message passing rather than shared variables with locks
- **concurrency:bounded-channel** — channels or queues created with a finite capacity to apply backpressure when consumers fall behind
- **concurrency:select-with-timeout** — channel receives or async waits include a timeout or cancellation branch to avoid hanging forever
- **concurrency:condition-variable-usage** — proper wait/notify pattern for complex signaling instead of busy-wait polling
- **concurrency:once-initialization** — one-time initialization of shared resources uses sync.Once, std::call_once, or equivalent, not a check-then-set with a flag

### Cancellation

- **concurrency:cancellation-propagation** — cancellation signals (context cancel, CancellationToken, AbortSignal) forwarded from parent to all child operations
- **concurrency:cancellation-check-in-loop** — long-running loops check for cancellation on each iteration, not only at I/O boundaries
- **concurrency:cleanup-on-cancel** — cancelled tasks release resources (connections, file handles, temp files) before exiting
- **concurrency:cancellation-vs-timeout** — distinct handling for "caller cancelled" vs "operation timed out" to allow appropriate cleanup and error reporting

## Concurrency challenge seeds

Each seed below describes a cross-language concurrency anti-pattern. Signals are structural — they describe what the code looks like, not which concurrency library it uses. A seed matches when the described shape is visible in the target file.

### `concurrency:lock-held-across-io`

**Signal:** A mutex, lock, or synchronized block is acquired, and within the locked section the code performs an I/O operation — an HTTP request, a database query, a file read/write, a network call, a sleep/delay, or a channel send that could block. The lock is not released before the I/O begins. Common shapes: `mu.Lock(); result = db.Query(...); mu.Unlock()`, `synchronized(lock) { httpClient.get(url) }`, `async with lock: await fetch(url)`. The I/O latency directly extends the time other threads are blocked waiting for the lock, turning a concurrency bottleneck into a serialization point.

**Drill:**
- **Task:** Restructure the code so the lock protects only the read or write of shared state, and the I/O operation happens outside the locked section — copy what you need from shared state under the lock, release the lock, then perform the I/O.
- **Constraint:** The lock's critical section must contain zero I/O calls (no network, no disk, no sleep); any data needed for the I/O must be copied to a local variable before the lock is released.

### `concurrency:missing-sync-on-shared-state`

**Signal:** A variable, field, or data structure is written by one goroutine/thread/task and read by another, with no synchronization — no mutex, no atomic operation, no channel, no concurrent-safe type protecting the access. Common shapes: a struct field set in a background goroutine and read in a request handler with no lock, a module-level dict populated by a worker thread and iterated by the main thread, a boolean flag set by one task and polled by another without atomic access. The variable is not declared as atomic, volatile, or thread-local, and no lock is acquired around either the read or the write.

**Drill:**
- **Task:** Add synchronization to protect every access to the shared variable — either guard both reads and writes with the same mutex, use an atomic type, or restructure to communicate the value via a channel.
- **Constraint:** Every code path that reads or writes the shared variable must go through the same synchronization mechanism; a code reviewer must be able to identify the single lock or atomic that protects the variable without tracing through multiple files.

### `concurrency:lock-ordering-inconsistency`

**Signal:** Two or more locks are acquired in different orders in different code paths. Function A acquires `lockX` then `lockY`; function B acquires `lockY` then `lockX`. This creates a deadlock risk — if thread 1 holds `lockX` and waits for `lockY` while thread 2 holds `lockY` and waits for `lockX`, both block forever. Look for: two `Lock()` or `synchronized` calls in sequence in one function, and the same two locks acquired in the reverse order in another function within the same file or package. Also matches nested `synchronized(a) { synchronized(b) { ... } }` in one place and `synchronized(b) { synchronized(a) { ... } }` in another.

**Drill:**
- **Task:** Establish a consistent lock ordering — document which lock must always be acquired first (e.g., `lockX` before `lockY`), and rewrite the code path that violates the order to acquire locks in the canonical sequence.
- **Constraint:** After the change, every code path in the file that acquires both locks must acquire them in the same documented order; add a comment at the lock declarations stating the ordering invariant.

### `concurrency:unbounded-task-spawning`

**Signal:** A loop or request handler spawns a goroutine, thread, async task, or coroutine for each incoming item with no upper bound on concurrency — `for item in items: go process(item)`, `items.forEach(item => spawn(async () => handle(item)))`, `for (item : items) { executor.submit(() -> process(item)); }` where the executor has an unbounded thread pool or no concurrency limit. Under high load, this can exhaust memory, file descriptors, or OS threads. There is no semaphore, worker pool, rate limiter, or bounded executor constraining the number of concurrent tasks.

**Drill:**
- **Task:** Add a concurrency bound — use a semaphore, a worker pool with a fixed number of workers, or a bounded executor so that at most N tasks run concurrently, with excess work queued or back-pressured.
- **Constraint:** The concurrency limit N must be a named constant or configuration value, not a magic number; the mechanism must visibly cap the number of simultaneously active tasks (a comment saying "don't spawn too many" does not count).

### `concurrency:shared-map-without-sync`

**Signal:** A map, dictionary, or hash table is accessed from multiple goroutines/threads/tasks without synchronization — no `sync.Map`, no `ConcurrentHashMap`, no `RWMutex` guarding access, no thread-local copy. One code path writes to the map (insert or delete) while another reads or iterates it concurrently. In Go, this is a fatal race (`concurrent map writes`). In Java, this causes `ConcurrentModificationException` or silent corruption with `HashMap`. In Python, it can cause `RuntimeError: dictionary changed size during iteration`. Common shapes: a package-level `map[string]T` with `go func() { m[k] = v }` and a handler reading `m[k]`, or a `dict` shared between threads with no `threading.Lock`.

**Drill:**
- **Task:** Replace the plain map with a concurrent-safe alternative — `sync.Map`, `ConcurrentHashMap`, a map guarded by a `sync.RWMutex`, or a thread-safe dictionary type appropriate to the language.
- **Constraint:** After the change, no read or write to the map may occur without going through the concurrent-safe API or holding the appropriate lock; if using RWMutex, reads must take the read lock (not the write lock).

### `concurrency:missing-cancellation-propagation`

**Signal:** A function receives a cancellation mechanism from its caller (a `context.Context` in Go, a `CancellationToken` in C#, an `AbortSignal` in JavaScript, a `CancellationToken` in Kotlin coroutines) but does not pass it to the operations it invokes — downstream HTTP calls, database queries, or spawned subtasks use a background context, a fresh token, or no cancellation at all. When the caller cancels, the downstream work continues to run to completion, wasting resources. Common shapes: `func Handle(ctx context.Context) { resp, err := http.Get(url) }` — the `ctx` is available but `http.Get` uses no context; `async Task Run(CancellationToken token) { await httpClient.GetAsync(url); }` — the token is not passed to `GetAsync`.

**Drill:**
- **Task:** Thread the cancellation signal through to every downstream call and spawned task, so that cancelling the parent cancels all child work.
- **Constraint:** Every outbound call (HTTP, DB, RPC) and every spawned task within the function must receive the caller's cancellation signal; no call may use a background/default context when the caller's context is available.

### `concurrency:busy-wait`

**Signal:** A loop polls a condition by repeatedly checking a variable, calling a function, or re-querying state with no sleep, no yield, no blocking wait, and no event-based notification — a pure spin loop. Common shapes: `while (!ready) {}`, `loop { if done.load() { break; } }`, `while (queue.isEmpty()) { /* spin */ }`. The loop burns CPU cycles checking a condition that will only change when another thread acts. Even with a short `sleep(1ms)` inside the loop, the pattern is still a busy-wait if a proper signaling mechanism (condition variable, event, channel receive, `WaitGroup.Wait()`) would be more appropriate.

**Drill:**
- **Task:** Replace the busy-wait with a proper blocking synchronization primitive — a condition variable with wait/notify, a channel receive, a `WaitGroup.Wait()`, a `ManualResetEvent`, or an equivalent mechanism that blocks the thread until the condition is actually signaled.
- **Constraint:** The loop body must not contain a sleep or yield as the primary waiting mechanism; the replacement must use a signal-based primitive where the waiter is woken only when the condition changes.

### `concurrency:toctou-race`

**Signal:** A check-then-act sequence where a condition is tested and then acted upon, but the two steps are not atomic — another thread could change the condition between the check and the act. Common shapes: `if !file.exists() { file.create() }` (another thread creates it between check and create), `if map[key] == nil { map[key] = newValue }` without a lock (another thread sets the key between check and set), `if count < limit { count++; doWork() }` without synchronization. The check and the action are separate statements with no lock, CAS operation, or atomic compare-and-swap unifying them.

**Drill:**
- **Task:** Make the check-then-act atomic — either wrap both the check and the action in the same lock/critical section, use an atomic compare-and-swap operation, or use a language-level construct that combines them (e.g., `putIfAbsent`, `setdefault`, `GetOrAdd`, `O_CREAT|O_EXCL`).
- **Constraint:** After the change, no other thread can observe or modify the guarded state between the check and the action; the atomicity must be enforced by the code structure, not by a comment or convention.

### `concurrency:unbounded-channel`

**Signal:** A channel, queue, or async pipe is created with no capacity limit (or an extremely large capacity like `Integer.MAX_VALUE`) in a producer-consumer pattern. The producer can enqueue items faster than the consumer drains them, and the channel will grow without bound until memory is exhausted. Common shapes: `make(chan Task, 1000000)` with a capacity that's effectively unbounded, `new LinkedBlockingQueue<>()` with no capacity argument (defaults to `Integer.MAX_VALUE`), `asyncio.Queue()` with no maxsize, `new Channel<T>(Channel.UNLIMITED)` in Kotlin. The key signal is: the capacity is either absent, zero (unbuffered is fine in Go but not for buffering), or set to a value so large it provides no meaningful backpressure.

**Drill:**
- **Task:** Set a finite, reasonable capacity on the channel and define the producer's behavior when the channel is full — block, drop, or return a backpressure error.
- **Constraint:** The capacity must be a named constant with a comment explaining the sizing rationale (not a magic number); the full-channel behavior must be explicit in the code, not the language's silent default.

### `concurrency:mutex-where-rwmutex-fits`

**Signal:** A `sync.Mutex`, `ReentrantLock`, `threading.Lock`, `lock` statement, or equivalent exclusive lock protects a data structure that is read far more often than it is written. The majority of critical sections only read the shared state (lookups, iterations, length checks), but every access — including reads — takes the exclusive lock, serializing all readers. Look for: a lock guarding a cache, a config map, a registry, or a lookup table where the write path (insert, update, delete) is called infrequently (initialization, periodic refresh) but the read path (get, contains, iterate) is called on every request.

**Drill:**
- **Task:** Replace the exclusive lock with a read-write lock (`sync.RWMutex`, `ReadWriteLock`, `threading.RLock` pattern, `ReaderWriterLockSlim`) so that multiple readers can proceed concurrently while writers still get exclusive access.
- **Constraint:** Every read-only critical section must use the read lock (not the write lock); every mutating critical section must use the write lock; the change must not alter the correctness of any access pattern.

### `concurrency:missing-lock-timeout`

**Signal:** A lock acquisition blocks indefinitely — `mu.Lock()`, `synchronized(obj)`, `lock.acquire()`, `lock (obj)` — with no timeout, no try-lock, and no deadline. If a deadlock occurs or a lock holder hangs, the waiting thread blocks forever with no way to detect the problem. There is no `TryLock`, `tryLock(timeout)`, `acquire(timeout=)`, `Monitor.TryEnter`, or equivalent call that would return or throw after a bounded wait. In production, this manifests as a hung thread that never recovers, eventually exhausting the thread pool.

**Drill:**
- **Task:** Replace the unconditional lock acquisition with a try-lock or timed-lock that gives up after a bounded duration, returning an error or logging a deadlock warning if the timeout expires.
- **Constraint:** The timeout duration must be a named constant; the timeout path must handle the failure gracefully (return an error to the caller, log a warning, or retry with backoff), not silently proceed without the lock.

### `concurrency:thread-unsafe-singleton`

**Signal:** A singleton or lazily-initialized shared resource is created using a check-then-init pattern with no synchronization — `if instance == nil { instance = newService() }`, `if (_instance == null) { _instance = new Service(); }`, `if not cls._instance: cls._instance = cls()`. Multiple threads calling the initialization concurrently can each see `instance` as nil and create separate instances, causing duplicate resource allocation (extra DB connections, duplicate caches, doubled memory) or using a partially-constructed instance. The initialization is not protected by a lock, `sync.Once`, `Lazy<T>`, `std::call_once`, or an atomic compare-and-swap.

**Drill:**
- **Task:** Protect the lazy initialization with a thread-safe mechanism — `sync.Once`, `Lazy<T>`, double-checked locking with a volatile/atomic field, `std::call_once`, a `@Synchronized` annotation, or the language's idiomatic once-initialization pattern.
- **Constraint:** The shared instance must be initialized exactly once regardless of how many threads call the accessor concurrently; the mechanism must be a recognized thread-safe pattern, not a bare mutex around the entire accessor method (which would serialize all reads after initialization).
