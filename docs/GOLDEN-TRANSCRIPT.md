# Golden Transcript — v0.1 Acceptance Contract

This transcript is chiron's acceptance contract for v0.1. Any built behavior that diverges from this transcript **in shape** (exact wording will vary — structure must not) is a bug.

Every behavior in v0.1 must be derivable from this one example. If a change is proposed to chiron's voice, decision tree, or command semantics, this transcript must be updated *first*, and the updated transcript becomes the new contract.

**What "in shape" means:** response structure must match — questions before code, hint ladder progression (L0 → L1 → L2 → L3 → L4), signature-with-blanks handoff, idiom callout at close. Exact phrasing is model-dependent and will vary between runs.

---

## The transcript

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

---

## What this transcript demonstrates

- **Questions before code** — the first chiron turn asks 3 questions before writing anything
- **Graduated hints** — L1 → L2 → L3 signature handoff, without jumping to a full solution
- **Review catches an idiom violation** — the ranging-inside-goroutine bug
- **`/hint` as an explicit user action** — user types `/hint` to advance one rung on the ladder
- **Closing idiom callout** — two things worth saving for next time
- **Handoff to `/challenge`** — pattern reuse with a twist

## What this transcript does NOT cover (by design)

- **Failure modes** (disengagement, implausible answer, topic shift, ungradable drill) — these live in each command file's inlined `## Failure modes` section, not in the golden path
- **`/challenge` flow end-to-end** — that's verified against the hero fixture at `tests/fixtures/go/worker_pool_bad.go`, which is specifically built to trigger the `go:shared-input-channel` seed
- **Non-Go languages** — future language packs will need their own golden transcripts when added

## Adaptation note (for reviewers of the original draft)

Two small changes from the original draft in `plan.md`:

1. The opening user message now starts with `/chiron` (the command-only architecture requires explicit activation).
2. The first chiron turn's footer no longer mentions `/ship` — in the command-only architecture, `/ship` doesn't exist; users who want the full answer can just say *"just write it"* and chiron must comply (anti-pattern #2: never refuse to ship when asked).
3. The user's follow-up `> hint` is now `> /hint` to match the real slash-command invocation.

These are cosmetic changes. The *shape* of the teach session is unchanged.

---

## Verification procedure

During Phase 4 verification (see `ROADMAP.md`):

1. Install chiron locally
2. Start a fresh Claude Code session
3. Type the opening prompt verbatim: `/chiron I need a Go function that fans out N workers on a channel and collects results.`
4. Walk through each turn, typing `/hint` where the transcript does
5. Verify the response shape matches — not exact wording, but the structure (questions → hints → signature → review → idiom callout)

If the shape diverges, chiron's command files need to be updated until they match.

This transcript is also checked into CI at `tests/golden/fan_out_transcript.md`.
