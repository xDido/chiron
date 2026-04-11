# Challenge Grading Rubric

Detailed scoring guide for {{command_prefix}}challenge drill grading. Reference when assigning `/10` scores to ensure consistency.

## Point Allocation

The `/10` grade is composed of three weighted dimensions:

| Dimension | Points | What it measures |
|-----------|--------|-----------------|
| **Correctness** | 4–5 | Does the code work? Does it satisfy the drill constraint? |
| **Idiom fit** | 3–4 | Does the code use the language's canonical patterns? |
| **Readability** | 1–2 | Is the code clear, well-named, and appropriately concise? |

Points are not rigidly allocated — use the ranges as guidance. A solution that's perfectly correct but completely non-idiomatic might score 5 + 0 + 1 = 6/10. A beautifully idiomatic solution with a subtle bug might score 3 + 4 + 2 = 9/10.

## Score Bands

### 9–10: Canonical
The solution satisfies the constraint, uses the idiomatic pattern, and reads cleanly. Minor style nits at most. This is what you'd expect from a senior engineer familiar with the language.

Example: *"10/10 — correct `errgroup.WithContext` usage, cancel propagation works, channel is buffered to known capacity, variable names are clear."*

### 7–8: Solid with minor issues
The solution works and shows understanding of the pattern, but has 1–2 non-trivial issues — a subtle footgun, a missed optimization, or a minor idiom deviation.

Example: *"7/10 — works, and errgroup usage is correct. Loses 2 for shadowing `ctx` inside the goroutine (subtle footgun). Loses 1 for unbuffered channel when capacity is known."*

### 5–6: Functional but non-idiomatic
The solution works but doesn't use the language's canonical patterns. It may use a more verbose or fragile approach that a senior engineer would refactor.

Example: *"5/10 — works, but uses manual WaitGroup + mutex instead of errgroup. Error collection is fragile — first error wins but others are silently dropped. The approach is valid Go, but not idiomatic for this pattern."*

### 3–4: Partially correct
The solution has the right general direction but doesn't fully satisfy the constraint or has correctness issues. The user understood the problem but the implementation has gaps.

Example: *"4/10 — right idea with errgroup, but goroutines capture the loop variable by reference (classic Go footgun pre-1.22). Constraint partially met — cancel-on-error works, but the data race means results are unreliable."*

### 1–2: Fundamentally off
The solution doesn't address the drill constraint or has critical correctness issues. The approach suggests a misunderstanding of the underlying concept.

Example: *"2/10 — spawns goroutines but no synchronization mechanism. Results are collected via a shared slice with no mutex — data race. The drill constraint (cancel-on-first-error) is not addressed."*

## Edge Cases

### Creative but non-idiomatic solutions
If the user's approach is unusual but correct, score correctness fully and explain why the idiomatic approach is preferred. Don't penalize creativity — reward correctness and note the idiom gap.

### Partial correctness
If the solution is 80% right but has one critical flaw, score based on what would happen in production. A data race in a concurrent drill is a correctness failure, not a style issue.

### Over-engineering
If the user's solution adds unnecessary abstraction (interfaces, factories, generics) to a simple drill, note it as a readability issue (-1) but don't heavily penalize. The drill constraint is what matters.

### Language version dependencies
If a solution relies on a language feature from a specific version (e.g., Go 1.22 loop variable fix), note the version dependency rather than penalizing. The user may be targeting a newer runtime than the drill assumed.

## Grading Tone by Level

The score itself doesn't change per level — only the phrasing:

- **Gentle:** Frame losses as growth areas. *"works, and here's what could be even better..."*
- **Default:** Name specific points lost. *"Loses 2 for X. Loses 1 for Y."*
- **Strict:** Terse and direct. *"Lost: 2 for X. 1 for Y."*

At every level: be specific, never cruel, never vague.
