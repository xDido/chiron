// Package workerpool provides a buggy-on-purpose worker pool used as a
// teaching fixture for chiron's /challenge command.
//
// The bugs in this file are intentional. They exist so the /challenge
// command can generate drills against them. Do NOT copy this code into
// production — it is deliberately wrong in several canonical ways.
//
// Known bugs (each should surface as a chiron drill):
//
//   1. ranging-inside-goroutine — every worker processes every input,
//      matching seed `go:shared-input-channel`.
//
//   2. no context cancellation check — workers keep running even if the
//      caller's context is canceled, matching seed `go:goroutine-leak`
//      and `go:context-propagation`.
//
//   3. unbuffered coordination — the results channel is unbuffered and
//      readers/writers can deadlock depending on order. This is a more
//      subtle design issue worth discussing.
//
//   4. manual error collection — uses sync.WaitGroup with ad-hoc error
//      handling instead of errgroup.WithContext, matching seed
//      `go:errgroup-with-context`.
package workerpool

import (
	"context"
	"fmt"
	"sync"
)

// Task is an opaque unit of work to process.
type Task struct {
	ID      int
	Payload []byte
}

// Result is the output of processing one Task.
type Result struct {
	TaskID int
	Output []byte
	Err    error
}

// ProcessAll fans out the given tasks across N worker goroutines, collects
// the results, and returns them.
//
// This implementation has several deliberate bugs that chiron's /challenge
// command is expected to find and drill on. See the package comment.
func ProcessAll(ctx context.Context, tasks []Task, workers int) ([]Result, error) {
	results := make(chan Result)
	var wg sync.WaitGroup
	var firstErr error
	var errMu sync.Mutex

	// BUG #1 (go:shared-input-channel): ranging over the shared `tasks`
	// slice inside each goroutine means every worker processes every task.
	// The canonical fan-out uses a shared input channel fed by the main
	// goroutine.
	//
	// BUG #2 (go:goroutine-leak / go:context-propagation): no select on
	// ctx.Done() anywhere. If the caller cancels ctx, these goroutines
	// keep running until they finish the full tasks slice.
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for _, t := range tasks {
				out, err := doWork(t)
				if err != nil {
					// BUG #4 (go:errgroup-with-context): manual first-error
					// tracking. errgroup.Group with WithContext would give
					// this for free, and would also cancel siblings.
					errMu.Lock()
					if firstErr == nil {
						firstErr = err
					}
					errMu.Unlock()
				}
				results <- Result{TaskID: t.ID, Output: out, Err: err}
			}
		}()
	}

	// BUG #3 (unbuffered channel coordination): the results channel is
	// unbuffered, so goroutines block on send until this main goroutine
	// catches up on receive. Combined with bug #1, every worker is trying
	// to send len(tasks) results, so the total output queue is
	// workers * len(tasks), not len(tasks) — with unbounded buffering
	// (via the collector goroutine below) the program will eventually
	// complete but with wildly duplicated results.
	go func() {
		wg.Wait()
		close(results)
	}()

	var collected []Result
	for r := range results {
		collected = append(collected, r)
	}

	return collected, firstErr
}

// doWork is a placeholder processor. The real implementation is irrelevant
// — what matters is the shape of ProcessAll.
func doWork(t Task) ([]byte, error) {
	if len(t.Payload) == 0 {
		return nil, fmt.Errorf("task %d: empty payload", t.ID)
	}
	return t.Payload, nil
}
