---
language: python
last_reviewed_against: "3.13"
upstream_version_source:
  type: endoflife
  product: python
---

# Python language pack

Canonical idioms, common pitfalls, mental-model shifts, and challenge seeds for Python. This file is the **human-readable reference** for chiron's Python knowledge base. The content is mirrored into `.claude/skills/challenge/SKILL.md` at runtime for the `/challenge` command's seeded pass.

**Contributors:** when adding idioms or seeds here, also update the corresponding section in `.claude/skills/challenge/SKILL.md`. See [`CONTRIBUTING-LANGUAGE-PACKS.md`](../CONTRIBUTING-LANGUAGE-PACKS.md) for the authoring guide.

---

## Read this first (stdlib and ecosystem anchors)

Docs chiron points to most often. When introducing any of these primitives during a teach turn, offer the corresponding pointer as a "read this first."

| Primitive | Doc pointer | Used for |
|-----------|-------------|----------|
| `pathlib` | `docs.python.org/3/library/pathlib` | Filesystem paths — the modern replacement for `os.path` |
| `typing` | `docs.python.org/3/library/typing` | Type hints: `Optional`, `Union`, `Protocol`, `TypeVar`, `Generic` |
| `dataclasses` | `docs.python.org/3/library/dataclasses` | Immutable-ish data containers via `@dataclass(frozen=True)` |
| `contextlib` | `docs.python.org/3/library/contextlib` | `@contextmanager`, `ExitStack`, `closing`, `suppress` |
| `functools` | `docs.python.org/3/library/functools` | `lru_cache`, `cache`, `partial`, `wraps`, `reduce` |
| `itertools` | `docs.python.org/3/library/itertools` | Lazy iterators: `chain`, `groupby`, `islice`, `tee` |
| `asyncio` | `docs.python.org/3/library/asyncio` | Async/await, tasks, queues, gather, timeouts |
| `concurrent.futures` | `docs.python.org/3/library/concurrent.futures` | Thread/process pools with `Future` API |
| `logging` | `docs.python.org/3/library/logging` | Structured logging; replace every `print()` in production |
| `pytest` | `docs.pytest.org` | Test framework — fixtures, parametrize, monkeypatch |
| `pydantic` | `docs.pydantic.dev` | Runtime-validated models (v2 is the target) |
| `ruff` | `docs.astral.sh/ruff` | Fast linter + formatter replacing flake8/isort/black |

**Meta-resources:**

- **PEP 8** — `peps.python.org/pep-0008` — the style guide everyone defers to
- **PEP 20 (Zen of Python)** — `peps.python.org/pep-0020` — `import this`
- **PEP 257 (Docstrings)** — `peps.python.org/pep-0257` — docstring conventions
- **PEP 484 (Type Hints)** — `peps.python.org/pep-0484` — the type hint grammar
- **PEP 621 (pyproject metadata)** — `peps.python.org/pep-0621` — modern packaging config
- **Hitchhiker's Guide to Python** — `docs.python-guide.org` — ecosystem orientation

---

## Idioms — canonical patterns worth knowing

Each idiom has: what it is, when to use it, a minimal example, and its tag for profile logging.

### Control flow and data manipulation

#### 1. List / dict / set comprehensions

**Tag:** `py:comprehension`

Use a comprehension instead of a `for` loop that just appends to a list. Comprehensions are faster, more idiomatic, and make the shape of the result obvious.

```python
# Good
active_names = [u.name for u in users if u.active]
id_to_user = {u.id: u for u in users}
unique_tags = {tag for post in posts for tag in post.tags}

# Worse
active_names = []
for u in users:
    if u.active:
        active_names.append(u.name)
```

#### 2. f-strings for formatting

**Tag:** `py:f-string`

Prefer f-strings (Python 3.6+) over `%`-formatting, `.format(...)`, or string concatenation. They're faster and read more naturally.

```python
name, count = "Alice", 3
message = f"{name} has {count} tasks"
# Formatted values
price = 9.999
label = f"{price:.2f} USD"
```

#### 3. `with` statements for resource handling

**Tag:** `py:with-context-manager`

Any resource that needs cleanup — files, locks, sockets, database connections — should be acquired via a `with` block. The context manager guarantees cleanup on exceptions.

```python
with open("data.txt", encoding="utf-8") as f:
    contents = f.read()
# file closed here, even if read() raises

with lock:
    shared_state.update(new_values)
```

#### 4. `pathlib.Path` over `os.path`

**Tag:** `py:pathlib`

`pathlib` provides a real `Path` type with methods. Use it everywhere instead of `os.path.join`, `os.path.exists`, `open(str_path)`.

```python
from pathlib import Path

config_dir = Path.home() / ".myapp"
config_dir.mkdir(parents=True, exist_ok=True)

config_file = config_dir / "config.toml"
if config_file.exists():
    contents = config_file.read_text(encoding="utf-8")
```

#### 5. Generators for lazy iteration

**Tag:** `py:generator`

For pipelines that process one item at a time, return a generator (function with `yield`) instead of building a full list. Memory-efficient and composable with other iterators.

```python
def read_lines(path: Path) -> Iterator[str]:
    with path.open(encoding="utf-8") as f:
        for line in f:
            yield line.rstrip()

# Usage: lazy — reads one line at a time
for line in read_lines(Path("big.log")):
    process(line)
```

#### 6. `enumerate` over manual index counting

**Tag:** `py:enumerate`

When you need both the index and the value, use `enumerate(xs)` — not `range(len(xs))` or a manual counter.

```python
for i, value in enumerate(items):
    print(f"{i}: {value}")
```

#### 7. `zip` for parallel iteration

**Tag:** `py:zip-parallel`

`zip(xs, ys)` iterates in lockstep. In Python 3.10+, `zip(xs, ys, strict=True)` raises if the lengths differ.

```python
for name, score in zip(names, scores, strict=True):
    print(f"{name}: {score}")
```

#### 8. `itertools` for composable iteration

**Tag:** `py:itertools`

Instead of hand-rolling index loops, reach for `itertools`. `chain` concatenates iterators; `islice` slices them; `groupby` groups consecutive items; `tee` forks one iterator into two.

```python
from itertools import chain, groupby, islice

first_ten = list(islice(big_iterator, 10))
combined = list(chain(a, b, c))
for key, group in groupby(sorted(items, key=k), key=k):
    ...
```

### Data structures

#### 9. `@dataclass` for plain data containers

**Tag:** `py:dataclass`

`@dataclass` generates `__init__`, `__repr__`, `__eq__` from type-annotated fields. For values that shouldn't change after construction, use `@dataclass(frozen=True)` — the instance becomes hashable and immutable.

```python
from dataclasses import dataclass, field

@dataclass(frozen=True)
class User:
    id: int
    name: str
    email: str
    tags: tuple[str, ...] = ()
```

#### 10. `@property` for computed attributes

**Tag:** `py:property`

Expose computed values as attributes, not methods. Callers read `user.full_name` — they don't need to know it's derived.

```python
class User:
    def __init__(self, first: str, last: str):
        self.first = first
        self.last = last

    @property
    def full_name(self) -> str:
        return f"{self.first} {self.last}"
```

#### 11. Named tuples for simple records

**Tag:** `py:named-tuple`

For small immutable records where you also want tuple semantics (unpacking, indexing), use `typing.NamedTuple` (subclass form) or `collections.namedtuple`.

```python
from typing import NamedTuple

class Point(NamedTuple):
    x: float
    y: float

p = Point(1.0, 2.0)
x, y = p        # unpacks
print(p.x)      # also attribute access
```

### Typing and interfaces

#### 12. Type hints on all public functions

**Tag:** `py:type-hints`

Annotate parameters and return types on every public function. Modern Python tooling (pyright, mypy) uses these to catch bugs at lint time.

```python
def greet(name: str) -> str:
    return f"hello, {name}"

def find_user(users: list[User], id: int) -> User | None:
    return next((u for u in users if u.id == id), None)
```

Python 3.10+ supports `X | None` as shorthand for `Optional[X]`. Python 3.9+ supports built-in generics like `list[int]`, `dict[str, int]`.

#### 13. `Protocol` for structural subtyping

**Tag:** `py:protocol`

Define "duck typing with type safety" — a `Protocol` class specifies the methods/attributes a type must have. Any class that matches structurally is compatible.

```python
from typing import Protocol

class Readable(Protocol):
    def read(self, n: int = -1) -> bytes: ...

def load(src: Readable) -> bytes:
    return src.read()
```

#### 14. `Optional[T]` / `T | None` for missing values

**Tag:** `py:optional-type`

Don't use sentinel values for "missing." Use `Optional[T]` (or `T | None` in 3.10+) and return `None` explicitly.

```python
def find_user(users: list[User], id: int) -> User | None:
    for u in users:
        if u.id == id:
            return u
    return None
```

### Error handling

#### 15. Specific `except` clauses, not bare `except:`

**Tag:** `py:specific-except`

Catch the narrowest exception you can handle. Never `except:` or `except Exception:` at the top of a handler unless you have a documented reason.

```python
try:
    config = load_config(path)
except FileNotFoundError:
    config = default_config()
except PermissionError:
    raise SystemExit(f"no permission to read {path}")
```

#### 16. EAFP over LBYL

**Tag:** `py:eafp`

*Easier to Ask Forgiveness than Permission.* Prefer `try`/`except` over pre-condition checks. It's the idiomatic style and avoids race conditions.

```python
# Good
try:
    value = mapping[key]
except KeyError:
    value = default

# Worse
if key in mapping:  # race condition if mapping mutates
    value = mapping[key]
else:
    value = default
```

#### 17. Context managers for cleanup on error

**Tag:** `py:context-manager-cleanup`

When you need "do X, then always undo X even on error," write a context manager instead of `try`/`finally`. Use `contextlib.contextmanager` for the simple cases.

```python
from contextlib import contextmanager

@contextmanager
def temp_cwd(path: Path):
    old = Path.cwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(old)

with temp_cwd(Path("/tmp")):
    run_build()
```

#### 18. Custom exception classes for domain errors

**Tag:** `py:custom-exception`

Define your own exception hierarchy for application errors. Callers can catch `MyAppError` to handle any domain failure without catching bugs.

```python
class MyAppError(Exception):
    """Base for all application errors."""

class ConfigError(MyAppError):
    pass

class NotFoundError(MyAppError):
    pass
```

### Async

#### 19. `asyncio.gather` for concurrent I/O

**Tag:** `py:asyncio-gather`

For multiple independent async calls that should run concurrently, use `asyncio.gather(...)`. Results come back in order.

```python
import asyncio

async def fetch_all(urls: list[str]) -> list[bytes]:
    return await asyncio.gather(*(fetch(u) for u in urls))
```

#### 20. `async with` for async resource handling

**Tag:** `py:async-with`

Async context managers (`__aenter__`/`__aexit__`) work with `async with`. HTTP clients, database sessions, and async file handles all use this pattern.

```python
async with httpx.AsyncClient() as client:
    response = await client.get(url)
```

#### 21. `asyncio.Queue` + worker tasks for backpressure

**Tag:** `py:asyncio-queue`

The canonical producer/consumer pattern. Bounded queue applies backpressure when workers fall behind.

```python
async def worker(queue: asyncio.Queue[Job]) -> None:
    while True:
        job = await queue.get()
        try:
            await process(job)
        finally:
            queue.task_done()
```

### Testing

#### 22. `pytest` fixtures for setup/teardown

**Tag:** `py:pytest-fixture`

Use `@pytest.fixture` to factor out setup logic. Fixtures can depend on other fixtures, scope their lifetime, and be parameterized.

```python
import pytest

@pytest.fixture
def db():
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()

def test_insert(db):
    db.execute("INSERT ...")
```

#### 23. `@pytest.mark.parametrize` for table tests

**Tag:** `py:pytest-parametrize`

The Python equivalent of Go's table-driven tests. Each parameter set becomes a separate test case with its own report line.

```python
import pytest

@pytest.mark.parametrize("n, expected", [
    (0, 1),
    (1, 1),
    (2, 2),
    (5, 120),
])
def test_factorial(n, expected):
    assert factorial(n) == expected
```

#### 24. `monkeypatch` for isolating units under test

**Tag:** `py:pytest-monkeypatch`

`monkeypatch` replaces attributes/environment for the duration of a test. Safer than manual patching because cleanup is automatic.

```python
def test_home(monkeypatch, tmp_path):
    monkeypatch.setenv("HOME", str(tmp_path))
    assert Path.home() == tmp_path
```

### Performance and packaging

#### 25. `functools.lru_cache` for memoization

**Tag:** `py:lru-cache`

For pure functions with expensive computation and a bounded input space, `@functools.lru_cache` is the one-line memoization.

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)
```

#### 26. `pyproject.toml` for package metadata

**Tag:** `py:pyproject-toml`

Modern Python packaging centralizes config in `pyproject.toml` (PEP 621). `setup.py` is legacy. Use `[project]` metadata, `[tool.*]` per-tool config, and a build backend like `hatchling` or `setuptools`.

```toml
[project]
name = "myapp"
version = "0.1.0"
dependencies = ["httpx>=0.27", "pydantic>=2"]

[tool.ruff]
line-length = 100
```

#### 27. Virtual environments are non-negotiable

**Tag:** `py:venv`

Never install dependencies into the system Python. Use `venv`, `uv`, `poetry`, or `pyenv-virtualenv` — whichever tool fits the project. Every project gets its own isolated environment.

```bash
python -m venv .venv
source .venv/bin/activate  # or: .venv\Scripts\activate on Windows
pip install -e .
```

#### 28. `ruff` or `black` as the formatter

**Tag:** `py:formatter`

Pick one formatter, run it in CI, never argue about style. `ruff format` is the modern default; `black` is the traditional one. Either way, settle it at the top of the project.

#### 29. `logging` over `print`

**Tag:** `py:logging-over-print`

`print()` is fine for scripts. In libraries and applications, use `logging` — it supports levels, structured output, handlers, and can be silenced by the consumer.

```python
import logging

logger = logging.getLogger(__name__)

def process(item):
    logger.info("processing %s", item.id)
    try:
        do_work(item)
    except WorkError:
        logger.exception("work failed for %s", item.id)
        raise
```

#### 30. Module-level singletons over global state

**Tag:** `py:module-singleton`

When you need app-wide state, expose a single configured instance at the module level. Callers `from myapp.config import settings` — they never mutate it.

```python
# myapp/config.py
from functools import lru_cache
from pydantic import BaseSettings

class Settings(BaseSettings):
    database_url: str
    debug: bool = False

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

---

## Common pitfalls (anti-patterns)

Each pitfall has: the bug, why it's bad, the fix, and its tag.

### Mutability and default arguments

#### 1. Mutable default arguments

**Tag:** `py:mutable-default-arg`

```python
# BUG: the list is shared across all calls
def add_item(item, target=[]):
    target.append(item)
    return target
```

The default `[]` is constructed once at function definition time, then reused for every call that omits `target`. Classic footgun.

**Fix:** use `None` as the sentinel.

```python
def add_item(item, target=None):
    if target is None:
        target = []
    target.append(item)
    return target
```

#### 2. Mutating a dict or list during iteration

**Tag:** `py:mutate-during-iteration`

```python
# BUG: skips elements, raises RuntimeError on dicts
for x in items:
    if should_remove(x):
        items.remove(x)
```

**Fix:** build a new list, or iterate over a copy.

```python
items = [x for x in items if not should_remove(x)]
```

### Exception handling pitfalls

#### 3. Bare `except:` or `except Exception:`

**Tag:** `py:bare-except`

```python
# BUG: swallows KeyboardInterrupt, SystemExit, and bugs
try:
    do_thing()
except:
    pass
```

**Fix:** catch the specific exception you can handle.

```python
try:
    do_thing()
except FileNotFoundError:
    logger.warning("file missing, skipping")
```

#### 4. Catch-and-swallow without logging

**Tag:** `py:swallow-exception`

```python
# BUG: error silently disappears
try:
    value = parse(s)
except ValueError:
    pass
```

**Fix:** log, re-raise, or use a default with a visible log line.

```python
try:
    value = parse(s)
except ValueError:
    logger.exception("could not parse %r", s)
    value = None
```

#### 5. `raise Exception("error!")`

**Tag:** `py:raise-bare-exception`

Raising `Exception` directly gives callers nothing to catch specifically. Define a domain exception.

```python
# Good
class ConfigError(Exception): pass
raise ConfigError("missing 'port' field")
```

### String and formatting pitfalls

#### 6. `+` concatenation in loops

**Tag:** `py:string-concat-loop`

```python
# BUG: quadratic time — each iteration allocates a new string
s = ""
for part in parts:
    s += part
```

**Fix:**

```python
s = "".join(parts)
```

#### 7. `%` formatting or `.format(...)` in new code

**Tag:** `py:old-string-formatting`

Unless you specifically need the behavior of `%` or `.format` (e.g., deferred interpolation in logging), use f-strings.

**Note:** logging is the exception — use `logger.info("x=%s", x)`, not `logger.info(f"x={x}")`, so the format string is only rendered when the level is active.

### Path and file pitfalls

#### 8. `os.path` instead of `pathlib`

**Tag:** `py:os-path-legacy`

```python
# BUG: stringly-typed, platform-brittle
import os
config = os.path.join(os.path.expanduser("~"), ".myapp", "config.toml")
if os.path.exists(config):
    with open(config) as f:
        contents = f.read()
```

**Fix:**

```python
from pathlib import Path
config = Path.home() / ".myapp" / "config.toml"
if config.exists():
    contents = config.read_text(encoding="utf-8")
```

#### 9. `open()` without `encoding=`

**Tag:** `py:open-no-encoding`

Relying on the OS default encoding is a portability bug. Windows defaults to cp1252; Linux to UTF-8. Always specify.

```python
with open(path, encoding="utf-8") as f:
    ...
```

#### 10. `open()` without a `with` block

**Tag:** `py:open-without-with`

```python
# BUG: file may not close on exception
f = open("data.txt")
contents = f.read()
f.close()
```

**Fix:** use `with`.

### Type system pitfalls

#### 11. No type hints on public APIs

**Tag:** `py:missing-type-hints`

Public functions without type hints force every caller to read the body to understand the contract. Annotate parameters and return types.

#### 12. `Any` as a lazy type hint

**Tag:** `py:any-as-escape-hatch`

```python
from typing import Any
def process(data: Any) -> Any: ...
```

**Fix:** identify the actual shape. Use `dict[str, Any]`, `Protocol`, or `TypedDict` for structured data. Reserve `Any` for genuinely dynamic data.

#### 13. `is` vs `==` confusion

**Tag:** `py:is-vs-equal`

```python
# BUG: works by accident due to small-int caching
if x is 5:
    ...
```

`is` tests *identity* (same object in memory). `==` tests *equality*. Use `is` only for `None`, `True`, `False`.

```python
if x == 5:     # value comparison
    ...
if x is None:  # identity comparison with singleton
    ...
```

### Async and concurrency pitfalls

#### 14. Forgetting `await` on an async function

**Tag:** `py:forgot-await`

```python
# BUG: the coroutine is created but never run
result = async_fn()  # returns a coroutine object
```

**Fix:** `result = await async_fn()`.

#### 15. Blocking calls inside async code

**Tag:** `py:blocking-in-async`

```python
# BUG: blocks the event loop
async def fetch(url):
    return requests.get(url).text  # sync call!
```

**Fix:** use an async HTTP client (`httpx.AsyncClient`, `aiohttp`), or wrap in `loop.run_in_executor` / `asyncio.to_thread`.

#### 16. Shared mutable state without locks in threads

**Tag:** `py:shared-state-no-lock`

Python threads run real OS threads. While the GIL protects individual bytecodes, it doesn't protect multi-step operations. Use `threading.Lock`, `queue.Queue`, or a lock-free data structure.

### Testing and debugging pitfalls

#### 17. `print()` debugging left in production

**Tag:** `py:print-debugging-in-prod`

**Fix:** use `logging`, or if you really want quick prints, use `print(..., file=sys.stderr)` so they're at least on a separate channel.

#### 18. Asserting via `assert` in production code paths

**Tag:** `py:assert-in-production`

```python
# BUG: asserts are stripped with python -O
def withdraw(user, amount):
    assert amount > 0, "amount must be positive"
```

**Fix:** `if amount <= 0: raise ValueError(...)`. Reserve `assert` for test code and development-time invariants.

#### 19. Tests that depend on test execution order

**Tag:** `py:test-order-dependence`

Tests that break when run in isolation are a sign of hidden global state or mutable fixtures. Fix the state, not the test order.

### Packaging pitfalls

#### 20. `pip install` in system Python

**Tag:** `py:system-pip`

Installing into the system Python pollutes the global environment and breaks OS packages. Always use a virtual environment.

#### 21. Wildcard imports

**Tag:** `py:wildcard-import`

```python
# BUG: hides the origin of every name
from somemodule import *
```

**Fix:** import specific names.

```python
from somemodule import load, save, validate
```

#### 22. Circular imports masked by function-local imports

**Tag:** `py:circular-import-hack`

```python
# Smell: hides a circular import
def process():
    from .other_module import helper  # ew
    return helper()
```

**Fix:** restructure the module graph. A circular import is a design signal, not a configuration annoyance.

### Data model pitfalls

#### 23. Plain dicts for structured data

**Tag:** `py:dict-instead-of-dataclass`

```python
# BUG: no type checking, no IDE autocomplete, easy to misspell
user = {"id": 1, "name": "Alice", "emial": "..."}  # typo!
```

**Fix:** use a dataclass or a TypedDict.

```python
@dataclass
class User:
    id: int
    name: str
    email: str
```

#### 24. Mutating class-level attributes

**Tag:** `py:mutate-class-attr`

```python
class Counter:
    items = []  # BUG: shared across all instances
    def add(self, x):
        self.items.append(x)
```

**Fix:** initialize in `__init__`.

```python
class Counter:
    def __init__(self):
        self.items = []
```

#### 25. `__init__` that does real work

**Tag:** `py:heavy-init`

Constructors that open files, make HTTP calls, or do expensive computation make the class hard to test. Use a classmethod factory or a separate `load` method.

```python
class Config:
    def __init__(self, values: dict):
        self.values = values

    @classmethod
    def from_file(cls, path: Path) -> "Config":
        return cls(tomllib.loads(path.read_text()))
```

---

## Mental-model deltas (for engineers coming from static / compiled languages)

Things that work differently in Python than in Java/C#/Go/Rust. Chiron calls these out when they come up in conversation.

1. **Everything is an object.** Numbers, functions, classes, modules — all first-class objects with attributes. You can pass a function as an argument, assign it to a variable, attach attributes to it.

2. **Duck typing is the default.** A type is "anything with the methods I use." Explicit interfaces (`Protocol`, `ABC`) are opt-in. Type hints are checked by external tools, not at runtime.

3. **Names, not variables.** `x = 5` binds the name `x` to the object `5`. `y = x` binds `y` to the same object. Assignment never copies; mutation through one name is visible through the other.

4. **Mutable vs immutable matters.** Lists, dicts, sets are mutable. Tuples, strings, numbers, frozensets are immutable. Default arguments and shared state surprises come from forgetting this distinction.

5. **Indentation is syntax.** Whitespace isn't cosmetic — it defines blocks. Four spaces, never tabs, by universal convention.

6. **The GIL limits CPU parallelism, not I/O parallelism.** Threads help for I/O-bound code (network, disk). For CPU-bound work, use multiprocessing or a compiled extension.

7. **`list` is not an array; it's a growable sequence.** For numeric work, reach for `array.array`, `numpy`, or `bytes`/`bytearray` — but know that pure-Python lists are the everyday container.

8. **`dict` is ordered since 3.7.** Iteration order matches insertion order. Use this intentionally; don't depend on it for sorted iteration.

9. **`set` has O(1) lookup.** If you're doing `x in list` in a hot path, switch to `x in set`.

10. **`None` is a singleton.** Use `is None` and `is not None`, never `== None`.

11. **Comprehensions bind in their own scope (3.x).** Loop variables from a comprehension don't leak into the enclosing scope. `[x for x in xs]` — the `x` is gone after the expression.

12. **Slicing copies (for lists and strings).** `xs[1:3]` returns a new list. Unlike Rust's slices, Python slices are independent.

13. **Positional vs keyword arguments.** Use keyword arguments for clarity at call sites. Use `/` and `*` in function signatures to force one or the other.

14. **`f(*args, **kwargs)` forwards arbitrary arguments.** The `*`/`**` unpacking operators are both call-site and signature syntax.

15. **Generators are lazy.** A generator function doesn't run until you iterate. This is powerful and surprising — side effects happen at iteration time, not call time.

16. **Closures capture by reference, not by value.** A lambda in a loop captures the loop variable, not its current value. Use a default-argument trick or a factory function if you need per-iteration binding.

17. **`self` is explicit.** Every method's first parameter is `self` (by convention). There's no hidden `this`. Forgetting `self` is a common mistake for newcomers.

18. **No private members.** `_name` is a convention (leading underscore = "don't touch"). `__name` triggers name mangling for subclass collision avoidance, not privacy.

19. **Modules are singletons.** `import mymodule` runs the module's top level exactly once; subsequent imports return the cached object.

20. **`if __name__ == "__main__":`** — the idiom that lets a file act as both a library and a script.

21. **Context managers over try/finally.** For any acquire/release pattern, write or use a context manager.

22. **Iterators are not re-startable.** Once exhausted, they stay exhausted. If you need to iterate twice, materialize with `list(...)` or use `itertools.tee`.

23. **Exceptions are cheap and normal.** EAFP (try/except) is idiomatic Python, unlike languages where throwing is expensive.

24. **`range(n)` is a lazy sequence.** It doesn't allocate a list; it produces values on demand. `list(range(n))` if you need a list.

25. **`pip` installs into the active Python.** There is no global dependency resolver; each virtualenv has its own site-packages.

---

## Challenge seeds

Each seed is a pre-authored drill that `/challenge` pattern-matches against source code. When the seed's `Signal` matches a file, the `Drill` becomes a concrete practice target for the user.

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

---

## Authoring new seeds

When adding a new seed to this pack:

1. **Name it** `py:<idiom-slug>` — consistent with the profile tag format.
2. **Write the Signal** in prose or pseudo-regex — concrete enough that a reader can verify a match by inspection.
3. **Write the Drill** with Task + Constraint — task is what to change, constraint is what makes it bounded (measurable, finite).
4. **Keep it small.** Drills must be ≤20 lines of change, ≤1 function touched, 5–15 minutes of focused work.
5. **Mirror into `.claude/skills/challenge/SKILL.md`.** The runtime source of truth is the command file; this document is the human-readable mirror and the contribution-PR target.
