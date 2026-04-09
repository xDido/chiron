# fan_out golden transcript (CI copy)

This is a machine-readable copy of chiron's v0.1 acceptance contract, used by CI / verification tooling. The canonical human-readable version with framing and notes lives at [`docs/GOLDEN-TRANSCRIPT.md`](../../docs/GOLDEN-TRANSCRIPT.md).

**Contract:** any built behavior that diverges from this transcript *in shape* (structure, not wording) is a bug.

## Transcript

```
$ claude
> /chiron I need a Go function that fans out N workers on a channel and collects results.

[chiron] Before we write it — a few questions that matter more than the code:

  1. Is N bounded? If yes, a fixed worker pool. If no, you probably don't
     want unbounded goroutines.
  2. What does "collects results" mean — do you need order preserved, or
     just every result eventually?
  3. What happens on error in one worker? Cancel the others, or keep going?

Answer any one and I'll take the next step with you. Or run `/hint` for an
L1 nudge, or say "just write it" if you need the code.

> bounded N=8, order doesn't matter, one error cancels all

[chiron] Good. That gives you three primitives to reach for from the stdlib.
Think about which one fits each concern:

  - bounded fan-out of N workers  →  ?
  - collecting results from many senders  →  ?
  - cancelling siblings on first error  →  ?

Hint: one of these is in `golang.org/x/sync`, not the stdlib proper.

> errgroup for the third one I think? not sure about the others

[chiron] Yes — `errgroup.Group` with `WithContext` gives you the
cancel-on-first-error for free. That's the hardest of the three.

For the other two: you already know one answer and just haven't said it.
What's the idiomatic Go primitive for "many-to-one communication"?

> channel

[chiron] Right. So the shape is: errgroup for lifecycle, a buffered result
channel for collection. The worker pool itself is just `g.Go` called 8
times in a loop. Want to try a first draft, or should I hand you a
signature to fill in?

> signature please

[chiron]
    func fanOut(ctx context.Context, inputs []Task) ([]Result, error) {
        g, ctx := errgroup.WithContext(ctx)
        results := make(chan Result, len(inputs))
        // TODO: start 8 workers, each reading from `inputs` and writing
        //       to `results`. Respect ctx.Done().
        // TODO: after workers finish, close results and drain.
        return collected, g.Wait()
    }

Two blanks. Fill them in and I'll review.

> [writes solution]

[chiron] Runs. One thing to notice: you ranged over `inputs` inside each
goroutine, which means every worker processes every input. That's a
classic fan-out bug — the workers need a *shared* source. Want an L1
hint, or want to see the fix?

> /hint

[chiron] The shared source is itself a channel. Workers read from it; the
main goroutine writes `inputs` into it and closes it. This is the
canonical Go worker-pool shape. Try the rewrite.

> [fixes it]

[chiron] Good. That's idiomatic. Two things worth saving for next time:
  - errgroup.WithContext is the go-to for "cancel siblings on error"
  - worker pools use a shared input channel, not ranging inside each goroutine

Run `/challenge` if you want a drill on the same pattern with a twist.
```

## Shape requirements

The built behavior must match the transcript on these structural points (wording is free):

1. **First chiron turn:** 3 clarifying questions before any code. Footer mentions `/hint` option and a "just write it" escape.
2. **Second chiron turn:** Three primitives enumeration with at least one Socratic blank the user can fill in.
3. **Third chiron turn:** Confirm the user's partial answer (`errgroup`), then extract the remaining answer from them via a leading question.
4. **Fourth chiron turn:** Offer the user a choice between drafting themselves or getting a signature with blanks.
5. **Fifth chiron turn:** Signature with explicit `// TODO:` blanks, NOT a complete implementation.
6. **Sixth chiron turn:** Review the user's attempt. Catch the ranging-inside-goroutine bug. Offer L1 hint OR full fix.
7. **Seventh chiron turn (`/hint`):** Describe the shared-input-channel pattern conceptually, do NOT write the code.
8. **Eighth chiron turn:** Acknowledge the fix, close with 1–2 idioms worth saving, hand off to `/challenge`.
