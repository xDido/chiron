// Hero fixture for the TypeScript language pack.
//
// Intentional bugs seeded for /challenge:
//   1. `ts:any-everywhere`            — any as params, return types, vars
//   2. `ts:as-assertion-escape`       — as User without runtime validation
//   3. `ts:non-null-assertion-abuse`  — map.get(id)! without narrowing
//   4. `ts:json-no-validation`        — JSON.parse typed via annotation
//   5. `ts:catch-unknown`             — catch(e) using e.message without narrowing
//   6. `ts:discriminated-union`       — union without a discriminant
//   7. `ts:exhaustive-never`          — switch lacks exhaustive default
//
// This file is NOT meant to be idiomatic. Treat it as a practice target.

interface User {
  id: number;
  name: string;
  email: string;
}

// Bug 6: no discriminant field on the union — every consumer has to
// use `"value" in x` or similar to narrow.
type ApiResult = { value: User } | { error: Error };

// Bug 1: any everywhere.
// Bug 4: JSON.parse result typed via annotation, not validated.
export async function loadUsersFromJson(path: string): Promise<User[]> {
  const fs: any = await import("node:fs/promises");
  const raw: any = await fs.readFile(path, "utf-8");
  const parsed: User[] = JSON.parse(raw); // the annotation is a lie
  return parsed;
}

// Bug 2: `as User` assertion — no runtime validation.
export function parseUser(data: unknown): User {
  return data as User;
}

// Bug 3: non-null assertion on Map.get which could return undefined.
export function findUser(users: Map<number, User>, id: number): User {
  return users.get(id)!;
}

// Bug 1 again: any params. Bug 5: catch(e) accesses .message without narrowing.
export async function runTask(task: any): Promise<any> {
  try {
    return await task.run();
  } catch (e) {
    console.error("task failed:", (e as any).message);
    return null;
  }
}

// Bug 7: switch over a discriminated-by-prop-existence union, no exhaustive default.
export function handleResult(r: ApiResult): string {
  if ("value" in r) {
    return r.value.name;
  } else {
    return r.error.message;
  }
  // If we added a `{ retryAfter: number }` variant, this function would
  // silently break at runtime — no compile error telling us to update it.
}

// Bug 1: any[] where a proper type would do. Bug 3: non-null assertion on array index.
export function firstAdmin(users: any[]): User {
  return users.find((u) => u.role === "admin")!;
}
