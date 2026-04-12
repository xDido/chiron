# AI Code Tells

Patterns that reveal AI-generated code. Flag these during L3/L4 code review and {{command_prefix}}challenge grading. A "tell" is code that works but signals the author didn't think — a senior engineer would refactor before committing.

## Naming tells

- **Overly verbose names** — `numberOfItemsInTheShoppingCart` instead of `cartSize` or `itemCount`. AI models over-specify because they lack shared context with the reader.
- **Generic placeholders** — `data`, `result`, `response`, `item`, `temp`, `val` in contexts where a domain-specific name is obvious. `userData` when it's clearly a `profile`. `fetchResult` when it's a `transaction`.
- **Inconsistent parameter ordering** — related functions take the same parameters in different order. Copy-paste artifact from generating functions independently.
- **Redundant type-in-name** — `userList`, `nameString`, `countInt` when the type is already clear from context or the type system.

## Comment tells

- **Restating the code** — `// increment counter by 1`, `// return the result`, `// check if null`, `// loop through items`. The comment adds zero information.
- **Section dividers substituting for extraction** — `// --- Handle validation ---` ... 40 lines ... `// --- Handle response ---`. These should be separate functions, not comment-delimited blocks.
- **Stale TODO stubs** — `// TODO: implement`, `// TODO: add error handling`, `// TODO: add tests` left in delivered code. Either implement it or remove the TODO.
- **Narrating the obvious** — `// Create a new user` above `createUser()`. `// Connect to database` above `db.Connect()`. Comments should explain *why*, not *what*.

## Error handling tells

- **Generic error messages** — `"Something went wrong"`, `"An error occurred"`, `"Unexpected error"`, `"Internal server error"`. Error messages must include the failing operation and the specific value or context that caused the failure.
- **Catch-all with no recovery** — `catch (Exception e) { log(e); }` or `if err != nil { return err }` without wrapping context. The caller has no idea what failed or where.
- **Swallowed errors** — empty catch blocks, ignored return values from fallible operations, `_ = riskyOperation()`. If the error doesn't matter, document why. If it does, handle it.
- **Error messages missing context** — `"failed to process request"` instead of `"failed to process order %s for user %s: %w"`. Include the failing entity and operation.

## Structure tells

- **Over-abstraction for single use** — `AbstractFactoryFactory`, one-method interfaces with exactly one implementation, generic wrappers around a single concrete type. Abstraction should emerge from duplication, not precede it.
- **Swiss-army-knife functions** — a single function that handles 5+ unrelated concerns. `handleRequest` that validates, authenticates, fetches data, transforms, caches, and responds. Each concern should be a separate function.
- **Unnecessary defensive checks** — null checks where the type system guarantees non-null, length checks on collections that are always populated by the preceding code, redundant type assertions after a type switch.
- **Symmetric blocks that should be a loop** — three near-identical blocks processing `item1`, `item2`, `item3` instead of iterating over a collection. Copy-paste generation artifact.
- **Unused imports** — import statements for libraries not used in the file. Generation artifact from producing code in multiple passes.
- **Premature configuration** — environment variables, feature flags, or config parameters for values that are used exactly once and have no reason to change. Not everything needs to be configurable.

## Completeness tells

- **Truncation markers** — `// ...`, `// rest of implementation`, `// similar to above`, `// for brevity`, `// omitted for clarity`, `// etc.`, `// and so on`. These are never acceptable in delivered code.
- **Placeholder returns** — `return null`, `return ""`, `return 0`, `return []` in non-stub code where a meaningful value or error is expected.
- **Happy-path-only error branches** — functions that handle the success case in detail but have empty or logging-only error branches. Production code must handle both paths.
- **Skeleton implementations** — functions with the right signature but a body that's clearly a stub: `{ throw new NotImplementedException(); }` or `pass` in Python where real logic is expected.
