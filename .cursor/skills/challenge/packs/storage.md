# Storage concept pack

File and object storage, upload handling, and blob lifecycle management. Cross-language seeds for building safe, scalable storage integrations regardless of provider (S3, GCS, Azure Blob, MinIO, local filesystem, etc.). These seeds target the most common security, reliability, and operational gaps in storage-related code.

## Storage pattern tag list (for eyeball fallback reference)

When no seed matches the target file, the step 5 eyeball fallback looks for instances of these named patterns:

### Upload safety

- **storage:content-type-validation** — validating the actual file content (magic bytes) rather than trusting the client-supplied MIME type
- **storage:file-size-limit** — enforcing a maximum upload size before reading the full body into memory
- **storage:filename-sanitization** — stripping or rejecting path traversal sequences, null bytes, and special characters from uploaded filenames
- **storage:upload-rate-limiting** — throttling upload frequency per client to prevent abuse and resource exhaustion
- **storage:antivirus-scan** — scanning uploaded files for malware before persisting or serving them
- **storage:extension-allowlist** — restricting uploads to a known set of safe file extensions rather than denylisting dangerous ones
- **storage:multipart-upload** — using multipart/chunked uploads for large files to support resumability and reduce memory pressure
- **storage:image-reprocessing** — re-encoding uploaded images server-side to strip EXIF metadata and embedded payloads
- **storage:double-extension-guard** — detecting filenames like `payload.php.jpg` that exploit naive extension checks
- **storage:upload-idempotency** — using a client-supplied upload token so retried uploads do not create duplicate objects

### Access patterns

- **storage:presigned-url** — generating time-limited, scoped URLs for direct client-to-storage access without proxying through the backend
- **storage:signed-download** — serving private files through signed URLs rather than exposing the storage bucket publicly
- **storage:streaming-read** — reading large files as a stream rather than loading the entire object into memory
- **storage:streaming-write** — writing uploads directly to storage as a stream rather than buffering the entire file in memory first
- **storage:cdn-integration** — serving public or cacheable files through a CDN rather than directly from the origin storage
- **storage:access-logging** — logging file access events for audit trails and anomaly detection
- **storage:content-disposition** — setting Content-Disposition headers to control whether files are displayed inline or downloaded
- **storage:range-request-support** — honoring HTTP Range headers for partial downloads and video/audio seeking
- **storage:key-prefix-partitioning** — using hashed or randomized key prefixes to distribute load across storage partitions

### Lifecycle management

- **storage:orphan-cleanup** — detecting and removing files that are no longer referenced by any application record
- **storage:lifecycle-policy** — configuring automatic transitions (to cold storage) or expiration for objects that are no longer actively accessed
- **storage:soft-delete** — marking files as deleted with a retention window rather than immediately and irreversibly removing them
- **storage:versioning** — enabling object versioning to recover from accidental overwrites or deletions
- **storage:temporary-upload-expiry** — expiring incomplete or unconfirmed uploads after a bounded time window
- **storage:retention-policy** — enforcing minimum retention periods for compliance or legal hold requirements
- **storage:upload-confirmation** — treating uploads as pending until explicitly confirmed, auto-deleting unconfirmed uploads after a timeout
- **storage:multipart-abort-cleanup** — aborting incomplete multipart uploads so partial parts do not accumulate as hidden storage cost

### Integrity

- **storage:checksum-verification** — computing and verifying checksums (MD5, SHA-256, CRC32C) on upload and download to detect corruption
- **storage:etag-conditional-request** — using ETags or If-None-Match for conditional reads to avoid redundant transfers
- **storage:atomic-upload** — writing to a temporary location and renaming/moving atomically so readers never see a partial file
- **storage:idempotent-upload** — using content-addressable keys or deduplication so re-uploading the same file does not create duplicates
- **storage:encryption-at-rest** — enabling server-side encryption or client-side encryption for sensitive stored objects
- **storage:cross-region-replication** — replicating critical objects to a secondary region for disaster recovery
- **storage:content-hash-key** — using a content-addressable hash as the object key to enable deduplication and immutable references
- **storage:transfer-integrity** — verifying `Content-MD5` or `x-amz-checksum` on upload responses to confirm the bytes the server stored match what was sent

### Configuration

- **storage:externalized-bucket-name** — reading bucket or container names from configuration or environment, not hardcoding in source
- **storage:per-environment-storage** — separate storage buckets or prefixes for dev, staging, and production to prevent cross-environment data leaks
- **storage:iam-scoped-credentials** — using least-privilege IAM roles or service account permissions rather than root or admin credentials
- **storage:cors-policy** — configuring CORS on the storage bucket to restrict which origins can perform direct browser uploads
- **storage:public-access-block** — explicitly disabling public access on buckets that should be private
- **storage:storage-abstraction-layer** — wrapping the storage provider behind an interface so the backend can be swapped without business logic changes
- **storage:endpoint-configuration** — externalizing the storage endpoint URL so the same code works against local MinIO, staging, and production S3
- **storage:connection-pooling** — reusing storage client connections across requests rather than creating a new client per upload or download
- **storage:timeout-on-storage-calls** — explicit timeouts on upload and download operations so a hung storage backend does not block the request indefinitely

## Storage challenge seeds

Each seed below describes a cross-language storage anti-pattern. Signals are structural -- they describe what the code looks like, not which provider SDK it uses. A seed matches when the described shape is visible in the target file.

### `storage:missing-content-type-validation`

**Signal:** An upload handler accepts a file and stores it using the content type provided by the client (from the `Content-Type` header or the multipart form field's declared MIME type) without verifying that the actual file content matches. The client-supplied type is passed directly to the storage call or saved to the database. An attacker can upload an executable or HTML file with a `image/png` content type, and it will be stored and potentially served as the declared type. Look for `contentType = req.file.mimetype` or `content_type = file.content_type` used directly in `s3.putObject({ ContentType: contentType, ... })` or `blob.upload(data, content_type=content_type)` with no magic-byte sniffing or validation step between reading the declared type and using it.

**Drill:**
- **Task:** Validate the uploaded file's actual content type by inspecting the file's magic bytes (file signature) and reject uploads where the detected type does not match the declared type or is not in an allowed list.
- **Constraint:** The validation must read at least the first 512 bytes of the file body (not just the filename extension or client header); the allowed type list must be explicitly defined; rejected uploads must return a descriptive error, not a generic 400.

### `storage:no-file-size-limit`

**Signal:** An upload endpoint reads the request body or multipart file without enforcing a maximum size. There is no `Content-Length` check, no body size limit middleware, no streaming size counter, and no storage-level size constraint. A client can upload an arbitrarily large file, consuming server memory (if buffered) or disk/storage quota. Look for `file = request.files['upload']` with no `MAX_CONTENT_LENGTH` configuration, `io.ReadAll(r.Body)` with no `http.MaxBytesReader` wrapper, or `multer()` with no `limits: { fileSize: ... }` option.

**Drill:**
- **Task:** Enforce a maximum file size that rejects uploads exceeding the limit before the entire body is read into memory.
- **Constraint:** The limit must be enforced at the HTTP layer (not after the file is fully received); the maximum size must be a named configuration value; the rejection must return HTTP 413 (Payload Too Large) with a message stating the limit.

### `storage:local-filesystem-storage`

**Signal:** An application writes uploaded files directly to the local filesystem using file path operations (`fs.writeFile`, `os.Create`, `open(path, 'wb')`, `File.write`) with a path under the application directory, `/tmp`, or a mounted volume — rather than using an object storage service (S3, GCS, Azure Blob, MinIO). The uploaded file's persistence is tied to the server instance's disk. In a horizontally scaled deployment, other instances cannot access the file. A container restart or node failure loses the data.

**Drill:**
- **Task:** Replace the local filesystem write with an object storage client call so that uploaded files are stored in a durable, shared storage backend.
- **Constraint:** The storage backend must be configurable (bucket name and endpoint from environment/config); the local file must not be kept after successful upload to object storage; the code must handle upload failures with a clear error rather than leaving partial state.

### `storage:missing-presigned-urls`

**Signal:** A backend endpoint serves private files by reading them from object storage (S3, GCS) into server memory and proxying the bytes to the client. The handler calls `s3.getObject(...)`, reads the response stream, and pipes it back through the HTTP response. Every download request consumes server bandwidth and memory proportional to the file size. The server acts as a middleman when the client could download directly from storage. Look for a download route that does `s3.getObject().then(data => res.send(data.Body))`, `blob.download_as_bytes()` followed by `return Response(content)`, or `io.Copy(w, s3Object.Body)`.

**Drill:**
- **Task:** Generate a time-limited presigned URL for the object and redirect or return it to the client so the download happens directly between the client and storage.
- **Constraint:** The presigned URL must expire within a short window (5-15 minutes); the URL must be scoped to the specific object (not a wildcard); if the client needs authentication, the presigned URL generation must verify permissions before issuing the URL.

### `storage:no-multipart-upload`

**Signal:** An upload handler for large files reads the entire file into memory (or a single buffer) and sends it to object storage as a single PUT request. There is no multipart upload, no chunked transfer, and no streaming pipe from the request body to the storage API. For files exceeding tens of megabytes, this consumes proportional server memory, risks timeout on slow networks, and offers no ability to resume a failed upload. Look for `body = await request.read()` followed by `s3.putObject(body)`, or `data = file.read()` followed by a single upload call, where the file size is not bounded to small values.

**Drill:**
- **Task:** Use multipart/chunked upload for files above a configurable size threshold, so large files are uploaded in smaller parts that can be retried independently.
- **Constraint:** The chunk size and threshold for switching to multipart must be named configuration values; each part must be retried independently on failure; the upload must be aborted (cleaning up partial parts) if the overall operation fails.

### `storage:missing-orphan-cleanup`

**Signal:** Files are uploaded to storage and a reference (URL, key, or path) is saved to a database record. When the database record is deleted or updated to reference a different file, the old file in storage is not deleted — no cascade, no background cleanup job, no lifecycle rule. Over time, unreferenced files accumulate in storage, consuming space and cost. Look for a delete or update endpoint that removes or changes the database record's file reference without a corresponding `s3.deleteObject(...)`, `blob.delete()`, or `os.remove(...)` call for the old file.

**Drill:**
- **Task:** Add cleanup logic that deletes the old file from storage when its database reference is removed or replaced.
- **Constraint:** The storage deletion must happen after the database transaction commits (not before, to avoid deleting a file the DB still references if the transaction rolls back); if the storage deletion fails, it must be logged and retried or queued rather than silently ignored.

### `storage:path-traversal-in-filename`

**Signal:** An upload handler uses the client-supplied filename directly in a storage path or filesystem path without sanitizing it. The filename from the multipart form data is concatenated into a path like `uploads/ + filename` or used as the object key. A malicious filename containing `../`, `..\\`, null bytes, or absolute path prefixes can escape the intended directory and overwrite arbitrary files. Look for `path = os.path.join(upload_dir, file.filename)`, `key = "uploads/" + req.file.originalname`, or `filepath.Join(baseDir, filename)` where `filename` comes directly from the request with no sanitization step.

**Drill:**
- **Task:** Sanitize the filename by stripping or rejecting path traversal sequences, restricting to a safe character set, and using a generated key (UUID or content hash) as the storage path instead of the raw client filename.
- **Constraint:** The original filename may be stored as metadata for display purposes, but must never be used in the storage path or filesystem path; the sanitization must reject or strip `../`, `..\\`, null bytes, and leading `/` or `\\` at minimum.

### `storage:no-streaming-large-reads`

**Signal:** A download or file-serving endpoint reads an entire object from storage into memory before sending it to the client. The full file content is held in a byte array, string, or buffer variable before being written to the HTTP response. For large files (images, videos, exports), this consumes server memory proportional to file size and can cause out-of-memory errors under concurrent load. Look for `data = s3.getObject(...).read()` followed by `response.write(data)`, `content = blob.download_as_bytes()`, or `bytes, _ = io.ReadAll(objectReader)` where the entire content is materialized before streaming.

**Drill:**
- **Task:** Stream the file content from storage directly to the HTTP response without buffering the entire object in memory.
- **Constraint:** The response must set the `Content-Length` header (from object metadata) before streaming so clients can show progress; the streaming must handle errors mid-transfer (storage read failure) by aborting the response cleanly rather than sending partial data with a 200 status.

### `storage:missing-checksum-verification`

**Signal:** A file is uploaded to storage or downloaded from storage with no checksum computation or verification. Neither the upload path nor the download path computes a hash (MD5, SHA-256, CRC32C) of the file content to compare against a stored or expected value. Bit-rot, truncated transfers, and storage corruption go undetected. Look for `s3.putObject(...)` with no `ContentMD5` or `ChecksumSHA256` parameter, `blob.upload(data)` with no `md5` or `crc32c` option, and download paths that return the bytes without verifying against a stored hash.

**Drill:**
- **Task:** Compute a checksum of the file content during upload, store it as metadata, and verify it on download to detect corruption.
- **Constraint:** The checksum must be computed over the actual bytes written (not the client-declared value); the algorithm must be explicitly chosen (SHA-256 preferred); a checksum mismatch on download must return an error to the client rather than serving corrupted data.

### `storage:hardcoded-bucket-name`

**Signal:** A storage bucket name, container name, or base path is hardcoded as a string literal in application code rather than read from configuration, environment variable, or a settings file. The bucket name appears directly in function calls like `s3.putObject({ Bucket: "my-app-uploads", ... })`, `storage.bucket("prod-assets")`, or `BUCKET = "company-data"` as a constant in the source file. Deploying the same code to a different environment (staging, dev, another region) requires a code change and redeployment.

**Drill:**
- **Task:** Extract the bucket name to an environment variable or configuration file so the same code can target different storage backends per environment without modification.
- **Constraint:** The code must fail fast with a clear error message if the configuration is missing (not silently fall back to a default bucket name); the configuration key must have a descriptive name that includes the purpose (e.g., `UPLOAD_BUCKET`, not just `BUCKET`).
