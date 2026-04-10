# Realtime concept pack

WebSockets, Server-Sent Events, and streaming patterns for bidirectional or push-based communication. Cross-language seeds for building reliable realtime connections regardless of transport (raw WebSocket, Socket.IO, SSE, gRPC streaming, etc.). These seeds target the most common reliability and security gaps in realtime systems.

## Realtime pattern tag list (for eyeball fallback reference)

When no seed matches the target file, the step 5 eyeball fallback looks for instances of these named patterns:

### Connection lifecycle

- **realtime:heartbeat-ping-pong** — periodic ping/pong frames or application-level heartbeats to detect dead connections
- **realtime:connection-upgrade-validation** — verifying origin, protocol, and headers during the HTTP-to-WebSocket upgrade
- **realtime:connection-limit** — bounding the number of concurrent connections per server or per client to prevent resource exhaustion
- **realtime:graceful-draining** — stopping new connections and closing existing ones cleanly before server shutdown
- **realtime:session-resumption** — allowing clients to resume a dropped session without replaying the full state
- **realtime:connection-timeout** — idle timeout that closes connections with no recent activity
- **realtime:connection-metadata** — tracking per-connection state (user ID, subscriptions, connect time) for debugging and accounting
- **realtime:subprotocol-negotiation** — agreeing on a WebSocket subprotocol during the upgrade handshake for structured communication
- **realtime:per-connection-resource-cleanup** — releasing all resources (timers, subscriptions, buffers, DB watchers) tied to a connection when it closes
- **realtime:max-message-rate-per-connection** — capping inbound messages per second per connection to protect server-side handler throughput

### Message handling

- **realtime:message-framing** — structured envelope around each message with type, ID, and timestamp for reliable processing
- **realtime:message-ordering** — sequence numbers or monotonic IDs so consumers can detect and handle out-of-order delivery
- **realtime:large-payload-chunking** — splitting oversized messages into smaller frames to avoid blocking the connection
- **realtime:message-compression** — per-message deflate or application-level compression for bandwidth-sensitive channels
- **realtime:binary-vs-text-framing** — choosing the correct frame type for the payload to avoid encoding overhead or corruption
- **realtime:message-acknowledgment** — application-level ack/nack so the sender knows the receiver processed the message
- **realtime:message-type-dispatch** — routing incoming messages by type field to dedicated handlers rather than one monolithic callback
- **realtime:message-size-limit** — rejecting inbound messages exceeding a maximum size to prevent memory exhaustion from malicious clients
- **realtime:idempotent-message-delivery** — deduplicating messages by ID on the receiver side so at-least-once transport does not cause double processing

### Backpressure

- **realtime:bounded-send-buffer** — capping the outbound message queue per connection to prevent memory exhaustion on slow clients
- **realtime:slow-consumer-detection** — identifying clients that fall behind and shedding them before the server is affected
- **realtime:rate-limited-inbound** — throttling messages from a single client to prevent abuse or accidental flooding
- **realtime:broadcast-fan-out-control** — bounding the cost of broadcasting to N subscribers so one publish does not block the event loop
- **realtime:flow-control-signal** — signaling the producer to pause when the consumer cannot keep up
- **realtime:write-deadline** — per-write timeout on outbound sends so a single slow client does not block the writing goroutine or thread indefinitely
- **realtime:adaptive-rate-limit** — dynamically adjusting inbound message rate limits based on current server load or client behavior
- **realtime:backpressure-disconnect** — disconnecting clients whose send buffer has been full for longer than a configurable threshold

### Authentication

- **realtime:upgrade-auth** — authenticating the client during the WebSocket upgrade handshake, not after the connection is open
- **realtime:token-expiry-on-open-connection** — re-validating or closing connections whose auth token expires mid-session
- **realtime:per-channel-authorization** — checking permissions when a client subscribes to a channel, not just at connection time
- **realtime:origin-validation** — rejecting WebSocket upgrades from unexpected origins to prevent cross-site hijacking
- **realtime:ticket-based-auth** — short-lived ticket exchanged during upgrade to avoid sending long-lived tokens over the socket
- **realtime:rate-limit-by-identity** — per-user or per-tenant message rate limits that survive reconnections by keying on identity, not connection
- **realtime:connection-scoped-encryption** — encrypting message payloads end-to-end so intermediaries (load balancers, proxies) cannot read them

### Resilience

- **realtime:reconnection-strategy** — automatic reconnect with backoff and jitter after unexpected disconnection
- **realtime:missed-message-recovery** — fetching messages missed during a disconnection gap using a last-seen offset or timestamp
- **realtime:server-side-close-reason** — sending a meaningful close code and reason phrase so the client can decide whether to reconnect
- **realtime:error-frame-handling** — processing WebSocket close and error frames explicitly instead of letting them crash the handler
- **realtime:fallback-transport** — degrading from WebSocket to SSE or long-polling when WebSocket is unavailable
- **realtime:connection-state-machine** — explicit state transitions (connecting, open, closing, closed) that prevent illegal operations on a half-closed connection
- **realtime:last-event-id** — SSE `Last-Event-ID` header support so the server can resume the stream from where the client disconnected
- **realtime:circuit-breaker-on-reconnect** — stopping reconnection attempts when the server is persistently unavailable to avoid wasting client resources
- **realtime:stale-connection-reaper** — periodically scanning for connections that passed heartbeat checks but hold no active subscriptions or sessions
- **realtime:event-replay** — replaying historical events from a durable log when a client subscribes to catch up to the live stream

## Realtime challenge seeds

Each seed below describes a cross-language realtime anti-pattern. Signals are structural -- they describe what the code looks like, not which library or framework it uses. A seed matches when the described shape is visible in the target file.

### `realtime:missing-heartbeat`

**Signal:** A WebSocket or persistent-connection handler that maintains long-lived connections but sends no periodic ping/pong frames, no application-level heartbeat messages, and has no keepalive timer. Dead connections (client silently departed, intermediate proxy timed out, network changed) are never detected until the next write fails. Look for a WebSocket accept/upgrade followed by a read loop with no timer, no ping scheduler, and no periodic write — the server waits passively for client data forever. Common shapes: `while true { msg = conn.read() }` with no surrounding deadline or ping goroutine/task.

**Drill:**
- **Task:** Add a periodic heartbeat (ping frame or application-level message) that detects and closes dead connections within a bounded time window.
- **Constraint:** The ping interval and pong timeout must be named constants; if a pong is not received within the timeout, the connection must be closed and resources released.

### `realtime:no-reconnection-strategy`

**Signal:** A client-side WebSocket or SSE connection handler that opens a connection and registers message handlers but has no logic for what happens when the connection drops. The `onclose`, `onerror`, or equivalent event callback either does nothing, logs a message, or sets a state variable but never initiates a new connection attempt. After an unexpected disconnection, the client stays disconnected permanently. Look for `ws.onclose = () => { console.log("closed") }` or `EventSource` with no `onerror` handler that recreates the source, or a connection setup function that is called once at startup and never again.

**Drill:**
- **Task:** Add automatic reconnection with exponential backoff and jitter so the client recovers from transient disconnections without manual intervention.
- **Constraint:** The backoff must increase between attempts with a capped maximum delay; the reconnection must re-establish any subscriptions or authentication that the original connection had; there must be a maximum retry count or total duration after which the client gives up and notifies the user.

### `realtime:unbounded-message-buffer`

**Signal:** A WebSocket server or realtime gateway maintains a per-connection outbound message queue (list, array, channel, or buffer) with no size limit. When the server wants to send a message to a client, it appends to this buffer without checking its length. A slow client that reads infrequently causes the buffer to grow without bound, consuming server memory proportionally to the message rate times the client's lag. Common shapes: `client.sendQueue.append(msg)` with no length check, `outbound = []` with unbounded `push`, or a goroutine/task writing to an unbuffered channel that blocks the broadcaster while another uses an ever-growing slice as a workaround.

**Drill:**
- **Task:** Add a capacity limit to the per-connection send buffer and define the behavior when the buffer is full (drop oldest messages, drop the connection, or send a backpressure signal).
- **Constraint:** The buffer capacity must be a named configuration value; when the limit is exceeded, the action taken must be logged with the connection identifier; silently dropping messages without logging is not acceptable.

### `realtime:missing-upgrade-auth`

**Signal:** A WebSocket endpoint accepts the HTTP upgrade request without checking authentication. The upgrade handler does not read an `Authorization` header, does not validate a cookie or session, and does not check a query-parameter token before calling the upgrade function. Authentication, if present at all, happens in a message after the connection is already established — meaning an unauthenticated client can hold an open connection and consume server resources. Look for a route handler that immediately calls `upgrader.Upgrade(...)`, `new WebSocketServer(...)`, or `ws.accept()` with no preceding auth middleware or token validation.

**Drill:**
- **Task:** Validate authentication credentials during the HTTP upgrade handshake, before the WebSocket connection is established; reject unauthorized requests with HTTP 401 or 403.
- **Constraint:** The auth check must happen before the upgrade call; the rejection must use a standard HTTP error response (not a WebSocket close frame, since the connection should never be opened); the auth mechanism must be the same one used for the service's REST endpoints.

### `realtime:broadcast-without-backpressure`

**Signal:** A broadcast or fan-out function iterates over all connected clients and sends a message to each one synchronously or in a tight loop, with no concurrency limit and no handling for slow receivers. If any single client's send blocks (full buffer, slow network), it delays the broadcast to all subsequent clients. The broadcast function holds a lock on the client list or blocks the event loop for the duration of the entire fan-out. Common shapes: `for client in clients: client.send(msg)`, `clients.forEach(c => c.send(data))`, or a loop over a map of connections calling write on each with no timeout or non-blocking send.

**Drill:**
- **Task:** Make the broadcast non-blocking per client by sending through a buffered channel, async write, or dedicated per-client send goroutine/task, with a timeout on each individual send.
- **Constraint:** A slow or unresponsive client must not delay delivery to other clients; if a per-client send exceeds the timeout, that client must be flagged or disconnected rather than blocking the broadcast loop.

### `realtime:no-connection-limit`

**Signal:** A WebSocket or SSE server accepts new connections without any upper bound on the total number of concurrent connections. There is no counter, semaphore, or configuration that limits how many clients can be connected simultaneously. Under a connection flood (legitimate traffic spike or denial-of-service), the server will accept connections until it runs out of file descriptors, memory, or both. Look for an accept/upgrade path that has no check like `if connections >= maxConnections { reject }` and no middleware that counts active connections.

**Drill:**
- **Task:** Add a configurable maximum connection limit that rejects new connections with an appropriate HTTP status (503) when the limit is reached.
- **Constraint:** The limit must be a named configuration value; the rejection must happen before the upgrade (not after establishing the WebSocket); the current connection count must be tracked accurately across connect and disconnect events.

### `realtime:missing-graceful-draining`

**Signal:** A server shutdown handler (signal handler, shutdown hook) for a WebSocket or SSE server either exits immediately (killing all connections without warning) or has no shutdown handler at all. Connected clients receive no close frame, no notification, and no opportunity to reconnect to another instance. During a rolling deployment, clients experience hard disconnects and may lose in-flight messages. Look for `process.on('SIGTERM', () => process.exit())` or a server with no signal handling, combined with long-lived WebSocket connections.

**Drill:**
- **Task:** Add a graceful draining sequence that (1) stops accepting new connections, (2) sends a close frame with a "going away" reason to all connected clients, (3) waits for a grace period for in-flight messages to complete, and (4) forcibly closes remaining connections after the deadline.
- **Constraint:** The grace period must be a named constant; the close frame must include a reason code (1001 Going Away) that clients can use to decide to reconnect immediately to another server; the server must exit after the grace period even if some clients have not acknowledged the close.

### `realtime:large-payload-no-chunking`

**Signal:** A WebSocket or streaming endpoint sends large payloads (file contents, bulk data exports, large JSON arrays, binary blobs) as a single message frame with no size checking or fragmentation. The entire payload is serialized into memory and written as one WebSocket frame. This blocks the connection for the duration of the write, can exceed receiver buffer limits, and prevents interleaving control frames (ping/pong, close) during the transfer. Look for `conn.send(json.dumps(large_list))`, `ws.send(Buffer.from(entireFile))`, or `conn.WriteMessage(websocket.TextMessage, bigPayload)` where the payload size is unbounded or can exceed tens of kilobytes.

**Drill:**
- **Task:** Add chunking that splits large payloads into smaller fragments sent as a sequence of messages, with metadata (sequence number, total chunks, message ID) so the receiver can reassemble.
- **Constraint:** Each chunk must be smaller than a configurable maximum size; the chunking protocol must include enough metadata for the receiver to detect missing chunks and request retransmission or abort; control frames must be able to interleave between chunks.

### `realtime:no-ordering-guarantee`

**Signal:** A realtime system publishes messages to clients from multiple sources (multiple goroutines, threads, event handlers, or microservices) through the same WebSocket or SSE connection without attaching sequence numbers, timestamps, or logical clocks to the messages. The client receives messages in whatever order they arrive, with no way to detect reordering, duplication, or gaps. Look for multiple producers calling `conn.send(msg)` or `client.emit(event, data)` from different contexts where the message payload has no sequence field, no monotonic ID, and no vector clock.

**Drill:**
- **Task:** Add a monotonically increasing sequence number to each outbound message so the client can detect out-of-order delivery and gaps.
- **Constraint:** The sequence must be per-connection (not global) and must be assigned atomically; the client must be able to detect a gap (missing sequence number) and either request a replay or surface the gap to the application layer.

### `realtime:missing-close-frame-handling`

**Signal:** A WebSocket connection handler reads messages in a loop but does not explicitly handle close frames or error events. When the remote side sends a close frame (normal closure, going away, protocol error), the code either ignores the close and continues trying to read (causing repeated errors), or treats it as an unexpected error and logs a stack trace rather than a clean shutdown. Look for a read loop with no case for close/error message types, no `on('close', ...)` handler that differs from the error handler, or a try/catch that treats `ConnectionClosedError` the same as any other exception.

**Drill:**
- **Task:** Add explicit handling for close frames and error frames that distinguishes normal closure from error conditions and performs appropriate cleanup in each case.
- **Constraint:** Normal closure (1000) and going-away (1001) must trigger a clean shutdown of the connection without error logging; abnormal close codes (1006, 1011, etc.) must be logged with the close code and reason; in both cases, connection resources (timers, subscriptions, buffers) must be released.
