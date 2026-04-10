# Messaging concept pack

Message queues, event-driven architecture, and pub/sub patterns. Cross-language seeds for building reliable asynchronous communication between services regardless of broker (Kafka, RabbitMQ, SQS, NATS, Pulsar, etc.). These seeds target the most common reliability and correctness gaps in message-driven systems.

## Messaging pattern tag list (for eyeball fallback reference)

When no seed matches the target file, the step 5 eyeball fallback looks for instances of these named patterns:

### Consumer patterns

- **messaging:idempotent-consumer** — consumers handle duplicate deliveries without side-effect duplication
- **messaging:competing-consumers** — multiple consumers share a queue for horizontal scaling
- **messaging:consumer-group-rebalance** — awareness of partition reassignment during scaling events
- **messaging:batch-consumer** — consuming messages in batches for throughput with per-message error isolation
- **messaging:consumer-offset-management** — explicit commit/ack strategy rather than auto-commit
- **messaging:consumer-timeout** — visibility timeout or ack deadline tuned to actual processing time
- **messaging:selective-consumer** — filtering messages at the broker level rather than discarding after delivery

### Producer patterns

- **messaging:transactional-outbox** — write to DB and outbox in one transaction, publish asynchronously
- **messaging:producer-partitioning** — choosing partition keys for ordering and load distribution
- **messaging:at-least-once-publish** — retry with idempotency key to avoid message loss without duplication
- **messaging:message-batching** — batching publishes for throughput while bounding latency
- **messaging:claim-check** — storing large payloads in blob storage and sending a reference in the message
- **messaging:producer-confirmation** — waiting for broker acknowledgment before considering a publish successful

### Message reliability

- **messaging:dead-letter-queue** — routing unprocessable messages to a DLQ for inspection and replay
- **messaging:retry-with-backoff** — exponential backoff with jitter on transient consumer failures
- **messaging:exactly-once-semantics** — idempotent consumer + deduplication for effective exactly-once
- **messaging:poison-message-isolation** — detecting and quarantining messages that repeatedly fail processing
- **messaging:acknowledgment-strategy** — explicit ack/nack after processing, not before
- **messaging:delivery-guarantee-choice** — consciously choosing at-most-once, at-least-once, or effectively-once per use case
- **messaging:message-deduplication** — broker-side or consumer-side dedup using message ID or content hash

### Queue management

- **messaging:backpressure** — bounded queues or rate limiting to prevent consumer overwhelm
- **messaging:queue-depth-monitoring** — alerting on growing lag between producer and consumer
- **messaging:message-ttl** — expiring stale messages rather than processing outdated work
- **messaging:priority-queue** — routing high-priority messages ahead of bulk work
- **messaging:partitioning-strategy** — choosing partition count and key distribution for balanced throughput
- **messaging:consumer-scaling** — adding or removing consumers dynamically based on queue depth or lag

### Event design

- **messaging:event-schema-validation** — validating message shape at producer and consumer boundaries
- **messaging:event-versioning** — schema evolution without breaking existing consumers
- **messaging:correlation-id** — propagating a trace/correlation ID through the message chain
- **messaging:thin-event** — events carry identity and metadata, consumers fetch full state if needed
- **messaging:event-ordering** — partition key or sequence number for causal ordering guarantees
- **messaging:envelope-pattern** — standard wrapper with metadata (timestamp, source, type, version) around the payload
- **messaging:event-sourcing-integration** — publishing domain events as messages for downstream projections

## Messaging challenge seeds

### `messaging:non-idempotent-consumer`

**Signal:** A message handler or consumer callback performs a side effect (database write, HTTP call, file mutation, counter increment) with no check for whether this specific message has already been processed. There is no deduplication table lookup, no idempotency key check, and no conditional insert/upsert guarding the operation. The handler assumes every delivery is the first delivery. Look for direct INSERT (not INSERT ... ON CONFLICT / upsert), raw counter increments (`count += 1`, `counter.increment()`), or HTTP POST calls without a client-supplied idempotency header.

**Drill:**
- **Task:** Add an idempotency guard so that reprocessing the same message ID produces no duplicate side effects.
- **Constraint:** The guard must be checked before the side effect executes, using a persistent store (not in-memory state that vanishes on restart); the happy path (first delivery) must still complete successfully.

### `messaging:missing-dead-letter-queue`

**Signal:** A message consumer catches processing errors (try/catch, rescue, recover, or error return) and either silently discards the failed message (swallows the error and acknowledges), logs and continues with no routing, or negatively acknowledges without any DLQ/dead-letter configuration visible in the consumer setup or broker config.

**Drill:**
- **Task:** Route messages that fail processing after exhausting retries to a dead-letter queue instead of discarding them.
- **Constraint:** The DLQ destination must be explicitly named in configuration or code; the original message payload and failure reason must both be preserved in the dead-lettered message.

### `messaging:no-ordering-guarantee`

**Signal:** A producer publishes messages related to the same entity (same user, same order, same account) without specifying a partition key, routing key, or message group ID. Messages go to a topic/exchange with multiple partitions or competing consumers, meaning two messages about the same entity can be processed out of order. Common shapes: `producer.send(topic, message)` with no key argument, `channel.publish(exchange, routingKey="", body=...)` with empty or constant routing key, or SQS `sendMessage` without `MessageGroupId` on a FIFO queue.

**Drill:**
- **Task:** Set a partition key (or routing key / message group ID) derived from the entity identifier so that all messages for the same entity are routed to the same partition or consumer.
- **Constraint:** The key must be deterministic from the entity ID; messages for different entities must still distribute across partitions for parallelism.

### `messaging:missing-backpressure`

**Signal:** A consumer reads messages in an unbounded loop and dispatches each to an async worker (goroutine, thread, task, coroutine) with no concurrency limit. There is no semaphore, bounded thread pool, channel with capacity, or rate limiter gating how many messages are in-flight simultaneously. Under load, worker count grows without bound. Common shapes: `while true { msg := consume(); go handle(msg) }` or `for msg in consumer: threading.Thread(target=handle, args=(msg,)).start()` or `consumer.on('message', msg => processAsync(msg))` with no pool.

**Drill:**
- **Task:** Introduce a concurrency bound so that at most N messages are processed simultaneously, where N is configurable.
- **Constraint:** When the concurrency limit is reached, the consumer must stop fetching new messages (backpressure to the broker) rather than buffering them in an unbounded in-memory structure.

### `messaging:fire-and-forget`

**Signal:** A producer publishes a message and immediately proceeds without checking the publish result. The return value or callback from the publish call is ignored, discarded, or not awaited. There is no error handling around the publish operation and no confirmation that the broker accepted the message. Common shapes: bare `producer.send(topic, msg)` with no error check, `channel.basic_publish(...)` with no confirm mode, `await producer.send(...)` where the promise rejection is unhandled.

**Drill:**
- **Task:** Check the publish result and handle failures (retry transient errors, log and alert on persistent failures).
- **Constraint:** The producer must not silently lose messages; at minimum, a failed publish must be logged with enough context to identify the lost message, and transient failures must be retried at least once.

### `messaging:poison-message-loop`

**Signal:** A consumer's error handling for a failed message consists of negatively acknowledging (nack/reject) with requeue enabled, or no ack at all causing redelivery, with no tracking of how many times this specific message has been attempted. A message that always fails processing will be redelivered infinitely, consuming resources and flooding logs. Look for `channel.basic_nack(requeue=True)`, `message.Nack()` in a catch block, or SQS messages returning to the queue after visibility timeout with no `ApproximateReceiveCount` check.

**Drill:**
- **Task:** Track delivery attempts per message and route messages that exceed a maximum retry count to a dead-letter queue or error store instead of requeuing.
- **Constraint:** The retry count must survive consumer restarts (use a message header/property or external store, not an in-memory counter); the maximum attempt threshold must be explicitly configured, not hardcoded.

### `messaging:sync-in-handler`

**Signal:** A message handler performs a long-running synchronous operation (external HTTP call with no timeout, large database query, file I/O, CPU-intensive computation) directly in the message consumption callback. The handler blocks the consumer's polling loop or delivery thread, preventing other messages from being processed during the operation. No timeout is set on the blocking call. Look for `requests.post(...)`, `http.DefaultClient.Do(...)`, `fetch(...)`, or raw SQL queries inside the handler function body with no surrounding timeout or context deadline.

**Drill:**
- **Task:** Offload the long-running work to a separate worker with a bounded timeout, so the consumer thread remains responsive.
- **Constraint:** The consumer must acknowledge the message only after the offloaded work completes successfully (not before dispatch); the timeout must be explicitly set and shorter than the broker's visibility timeout or redelivery interval.

### `messaging:missing-schema-validation`

**Signal:** A message consumer deserializes the incoming payload (JSON parse, protobuf decode, etc.) and immediately accesses fields without validating the message shape or version. There is no schema check, no version field inspection, and no guard against missing or unexpected fields. A malformed message will cause a runtime error deep in business logic rather than being rejected at the boundary. Common shapes: `data = json.loads(msg.body); process(data["orderId"], data["amount"])` with no validation step between parse and field access, or direct cast to a domain type without checking required fields.

**Drill:**
- **Task:** Validate the message payload against an explicit schema or structural check at the consumer entry point, before any business logic executes.
- **Constraint:** Invalid messages must be rejected with a descriptive error (not a raw deserialization stack trace); the validation must check at least message type/version and required fields.

### `messaging:no-retry-strategy`

**Signal:** A message handler encounters a transient error (network timeout, temporary database unavailability, rate limit) and either immediately sends to DLQ, immediately nacks without delay, or discards the message. There is no retry logic, no backoff, and no distinction between transient and permanent failures. The catch/except block treats all errors identically -- a temporary network blip and a malformed payload both take the same code path.

**Drill:**
- **Task:** Add a retry strategy with exponential backoff for transient failures, while routing permanent failures directly to the dead-letter queue.
- **Constraint:** The backoff delay must increase between attempts (not fixed interval); the implementation must distinguish at least one category of transient error from permanent errors; maximum retry count must be bounded.

### `messaging:unbounded-memory-queue`

**Signal:** An in-memory queue or channel (list, array, unbounded channel, ConcurrentLinkedQueue, or similar) is used as a buffer between message consumption and processing, with no capacity limit. Messages are added to this buffer faster than they are drained under load, and there is no mechanism to block or reject when the buffer is full. Memory usage grows proportionally to lag. Common shapes: `queue = []` with `queue.append(msg)` and no max-length check, `make(chan Message)` (unbuffered is fine but `make(chan Message, 0)` used as a pass-through with a separate growing slice behind it is the problem), `new LinkedList<>()` with no capacity wrapper.

**Drill:**
- **Task:** Replace the unbounded buffer with a bounded structure that blocks or rejects when capacity is reached.
- **Constraint:** The capacity must be explicitly configured (not a magic number); when the buffer is full, the producer side must either block until space is available or apply a documented rejection policy (drop oldest, reject new, etc.).

### `messaging:missing-correlation-id`

**Signal:** A message producer creates messages without attaching a correlation ID, trace ID, or request ID that links the message back to the originating request or workflow. When a consumer processes the message, there is no way to correlate the processing logs with the original request that triggered the publish. Debugging cross-service flows requires manual timestamp matching. Look for `publish(topic, {orderId, amount, ...})` where the payload has domain fields but no `correlationId`, `traceId`, or `requestId` field, and no message header/property carrying one either.

**Drill:**
- **Task:** Propagate a correlation ID from the originating request context into every published message, and extract it on the consumer side for logging.
- **Constraint:** The correlation ID must be set as a message header or property (not buried in the payload body); the consumer must log the correlation ID with every processing log statement so that a single grep finds the full trace.

### `messaging:ack-before-process`

**Signal:** A message consumer acknowledges (ack) the message before processing it rather than after. The ack call appears before the business logic, database write, or side effect. If the process crashes between the ack and the completion of processing, the message is lost -- the broker considers it delivered but the work was never done. Common shapes: `msg.ack(); processOrder(msg.body)` or `channel.basic_ack(delivery_tag); handle(body)` where the ack precedes the processing function call.

**Drill:**
- **Task:** Move the acknowledgment to after successful processing, so that a crash mid-processing causes redelivery rather than message loss.
- **Constraint:** The ack must appear after the last side effect in the handler; if processing fails, the message must be nacked or left unacknowledged so the broker redelivers it.
