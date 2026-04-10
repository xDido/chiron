# Python language pack (inlined)

This is the runtime source of truth for chiron's Python knowledge. The canonical human-readable explanation of each idiom and anti-pattern lives at `docs/languages/python.md`.

## Python idiom tag list (for eyeball fallback reference)

### Control flow and data

- `py:comprehension` — list/dict/set comprehensions over `for`/`append` loops
- `py:f-string` — f-strings over `%`/`.format(...)`
- `py:with-context-manager` — `with` for any resource that needs cleanup
- `py:pathlib` — `pathlib.Path` over `os.path`
- `py:generator` — `yield`-based generators for lazy iteration
- `py:enumerate` — `enumerate(xs)` over manual index counting
- `py:zip-parallel` — `zip(xs, ys, strict=True)` for parallel iteration
- `py:itertools` — `chain`, `groupby`, `islice`, `tee` for composable iteration

### Data structures

- `py:dataclass` — `@dataclass(frozen=True)` for immutable records
- `py:property` — `@property` for computed attributes
- `py:named-tuple` — `typing.NamedTuple` for simple records

### Typing

- `py:type-hints` — annotations on all public functions
- `py:protocol` — `Protocol` for structural subtyping
- `py:optional-type` — `X | None` for missing values

### Error handling

- `py:specific-except` — narrow `except` clauses, not bare `except:`
- `py:eafp` — try/except over pre-condition checks
- `py:context-manager-cleanup` — context managers over try/finally
- `py:custom-exception` — domain-specific exception hierarchies

### Async

- `py:asyncio-gather` — concurrent I/O via `asyncio.gather`
- `py:async-with` — async context managers for async resources
- `py:asyncio-queue` — producer/consumer with bounded queues

### Testing

- `py:pytest-fixture` — `@pytest.fixture` for test setup/teardown
- `py:pytest-parametrize` — table tests via `@pytest.mark.parametrize`
- `py:pytest-monkeypatch` — `monkeypatch` for test isolation

### Performance and packaging

- `py:lru-cache` — `functools.lru_cache` for memoization
- `py:pyproject-toml` — `pyproject.toml` for package metadata
- `py:venv` — virtual environments for every project
- `py:formatter` — `ruff` or `black` as the formatter
- `py:logging-over-print` — `logging` module instead of `print`
- `py:module-singleton` — module-level singletons over global state

## Python challenge seeds

### `py:mutable-default-arg`

**Signal:** A function signature contains a mutable default argument — `def f(x=[])`, `def f(x={})`, or `def f(x=set())`.

**Drill:**
- **Task:** replace the mutable default with `None` and initialize inside the function body.
- **Constraint:** no behavior change for callers that pass the argument explicitly; the bug when callers omit it must be gone.

### `py:string-concat-loop`

**Signal:** A `for` loop body contains `s += ...` or `s = s + ...` where `s` is a string accumulator built up across iterations.

**Drill:**
- **Task:** rewrite using `"".join(...)` over a generator or list comprehension.
- **Constraint:** no intermediate string allocations inside the loop.

### `py:comprehension`

**Signal:** A `for` loop whose only body is `result.append(...)` or `result[key] = value`, building up a result collection based on transformation or filtering of the input.

**Drill:**
- **Task:** rewrite as a list / dict / set comprehension.
- **Constraint:** the result must be identical; the comprehension must fit on one or two lines.

### `py:bare-except`

**Signal:** A `try` block with a bare `except:` or `except Exception:` clause that catches more than necessary.

**Drill:**
- **Task:** narrow the `except` to the specific exception(s) the code can meaningfully handle.
- **Constraint:** any unexpected exception must propagate unchanged.

### `py:os-path-legacy`

**Signal:** Uses of `os.path.join`, `os.path.expanduser`, `os.path.exists`, `os.path.dirname`, or `os.path.basename` in a file that does not already use `pathlib`.

**Drill:**
- **Task:** convert to `pathlib.Path` operations (`/` operator for join, `Path.home()` for home, `.exists()`, `.parent`, `.name`).
- **Constraint:** no mixed string-path operations remain in the function; use `Path` throughout.

### `py:open-no-encoding`

**Signal:** A text-mode `open(...)` call (no `"b"` in the mode) without an `encoding=` keyword argument.

**Drill:**
- **Task:** add `encoding="utf-8"` (or the appropriate encoding for the context).
- **Constraint:** if the file is binary, switch to `"rb"`/`"wb"` mode and remove encoding entirely.

### `py:open-without-with`

**Signal:** An `open(...)` call assigned to a variable, with a corresponding `.close()` call later (or no close at all) — not wrapped in a `with` block.

**Drill:**
- **Task:** wrap in a `with` block; remove the explicit `.close()`.
- **Constraint:** the file handle must be guaranteed closed on all exit paths.

### `py:type-hints`

**Signal:** A public function (no leading underscore) with no type annotations on its parameters or return type.

**Drill:**
- **Task:** add complete type hints using 3.10+ syntax (built-in generics like `list[int]`, `X | None`).
- **Constraint:** annotations must match the actual behavior; optional parameters must use `X | None`, not `Optional[X]`, if targeting 3.10+.

### `py:dataclass`

**Signal:** A class with an `__init__` that only stores its parameters as attributes, no other methods, used as a data container.

**Drill:**
- **Task:** convert to `@dataclass` (or `@dataclass(frozen=True)` if the fields shouldn't change).
- **Constraint:** all callers must still work; field order must be preserved for positional construction.

### `py:f-string`

**Signal:** String formatting via `%` (`"%s, %d" % (...)`) or `.format(...)` in a context where f-strings would work.

**Drill:**
- **Task:** rewrite as an f-string.
- **Constraint:** no behavior change; keep any format specifiers (`:.2f`, `:>10`) intact.

### `py:blocking-in-async`

**Signal:** An `async def` function body that calls `time.sleep`, `requests.get`, `open(...).read()`, or other known-blocking operations.

**Drill:**
- **Task:** replace with the async equivalent (`asyncio.sleep`, `httpx.AsyncClient`, `aiofiles`), or wrap in `asyncio.to_thread(...)`.
- **Constraint:** the function remains `async def`; no blocking call on the event loop.

### `py:forgot-await`

**Signal:** An expression statement `some_coroutine(args)` where `some_coroutine` is defined with `async def` and the result is discarded or passed to a non-awaiting context.

**Drill:**
- **Task:** add `await` before the call.
- **Constraint:** the enclosing function becomes `async` if it isn't already.

### `py:is-vs-equal`

**Signal:** `is` used to compare to a literal integer, string, tuple, or any non-singleton value. Examples: `x is 5`, `name is "alice"`, `point is (1, 2)`.

**Drill:**
- **Task:** replace `is` / `is not` with `==` / `!=` — except when comparing to `None`, `True`, or `False`.
- **Constraint:** `is None` / `is not None` stays; all other value comparisons use `==`.

### `py:dict-instead-of-dataclass`

**Signal:** A function that constructs a dict with a fixed set of keys used as a record, passed around to other functions that access specific keys.

**Drill:**
- **Task:** define a `@dataclass` (or `TypedDict` if you genuinely need dict shape) and use it instead.
- **Constraint:** the call sites must benefit from attribute access; add at least one type hint on a function parameter using the new type.

### `py:assert-in-production`

**Signal:** An `assert` statement in non-test code where the condition is an input validation check (not a development invariant).

**Drill:**
- **Task:** replace with an explicit `if ... : raise ValueError(...)` or similar.
- **Constraint:** the check must still run under `python -O`, which strips assertions.

### `py:print-debugging-in-prod`

**Signal:** `print(...)` calls in a library module (not a `__main__` block) used for logging or debug output.

**Drill:**
- **Task:** replace with a module-level `logger = logging.getLogger(__name__)` and appropriate `logger.debug/info/warning/error` calls.
- **Constraint:** each log call uses the right level; no bare `print` remains in library code.

### `py:logging-over-print`

**Signal:** A script or library module with multiple `print(...)` statements used for operational output (progress, errors, warnings).

**Drill:**
- **Task:** introduce a module logger and convert `print` calls to leveled log calls.
- **Constraint:** at least two different log levels used appropriately; use `logger.exception(...)` inside `except` blocks.

