"""Hero fixture for the Python language pack.

Intentional bugs seeded for /challenge:
  1. `py:mutable-default-arg`       — results=[] default
  2. `py:bare-except`               — bare except: that swallows everything
  3. `py:os-path-legacy`            — os.path.join instead of pathlib
  4. `py:open-no-encoding`          — open() without encoding=
  5. `py:string-concat-loop`        — += concat building a summary string
  6. `py:blocking-in-async`         — time.sleep inside async def
  7. `py:print-debugging-in-prod`   — print() used as logging

This file is NOT meant to be idiomatic. Treat it as a practice target.
"""

import asyncio
import os
import time


class Job:
    def __init__(self, id, payload):
        self.id = id
        self.payload = payload


def load_jobs(data_dir, results=[]):
    """Load all `.json` files from `data_dir` into `results`.

    Bugs:
      - `results=[]` mutable default: every call without the arg shares the
        same list.
      - `os.path.join` instead of `pathlib`.
      - `open()` without `encoding=`.
      - Bare `except:` that hides real failures (KeyboardInterrupt, SystemExit).
    """
    for name in os.listdir(data_dir):
        if not name.endswith(".json"):
            continue
        path = os.path.join(data_dir, name)
        try:
            f = open(path)
            try:
                data = f.read()
            finally:
                f.close()
            results.append(Job(name, data))
        except:
            print(f"skipping {path}")
            continue
    return results


def summarize(jobs):
    """Build a comma-separated summary of job ids.

    Bugs:
      - `+=` string concat in a loop — quadratic time.
      - `print()` used as a "log" channel.
    """
    summary = ""
    for j in jobs:
        if summary != "":
            summary += ", "
        summary += j.id
    print("summary built: " + summary)
    return summary


async def process_all(jobs):
    """Process jobs concurrently.

    Bugs:
      - `time.sleep(1)` inside an `async def` — blocks the event loop for the
        duration of the sleep, killing concurrency.
      - `print` instead of `logging`.
    """
    for j in jobs:
        print(f"processing {j.id}")
        time.sleep(1)  # should be asyncio.sleep(1)
    return len(jobs)


def main():
    data_dir = os.path.join(os.path.expanduser("~"), ".myapp", "data")
    jobs = load_jobs(data_dir)
    summary = summarize(jobs)
    count = asyncio.run(process_all(jobs))
    print(f"done: {count} jobs ({summary})")


if __name__ == "__main__":
    main()
