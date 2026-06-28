# R8.4 — Deliverable status re-derivation on subtask add/delete (bug)

**Status:** planned
**Files:**
- `src/lib/actions/deliverables.ts`

**Should land before/with R8.1** (the modal create path calls the same helper).

## Spec

**Problem (observed):** Completing **every** subtask correctly flips the parent deliverable to
`COMPLETE`. But then **adding a new subtask** does **not** re-derive the deliverable's status — it
stays `COMPLETE` until some subtask's status is changed again. The deliverable's derived status goes
stale on subtask **add** (and has the same risk on **delete**).

**Root cause:** the derivation logic lives **only** inside `updateSubtaskStatus`
(`deliverables.ts` ~lines 180–204): it loads the siblings, computes a `derivedStatus`, and updates
the deliverable. `createSubtask` (~line 92) and `deleteSubtask` (~line 231) mutate the subtask set but
**never recompute** the parent. A freshly-created `NOT_STARTED` subtask under an all-complete
deliverable should drop it out of `COMPLETE`, but nothing recomputes it.

**Approach:**

*Extract a shared helper* — pull the derivation out of `updateSubtaskStatus` into
`deriveDeliverableStatus(deliverableId: string)` in `deliverables.ts`:
- Load all subtasks for the deliverable (`select: { status: true }`).
- Compute `derivedStatus` with the **existing** precedence: all `COMPLETE` → `COMPLETE`; any
  `BLOCKED` → `BLOCKED`; any `IN_PROGRESS`/`COMPLETE` → `IN_PROGRESS`; else `NOT_STARTED`.
- Update the deliverable's `status`, `completed`, `completedDate` accordingly (same as today).
- **Empty set (open Q4):** when the deliverable has **no** subtasks (e.g. the last one was just
  deleted), do not force a status — set `completed=false` and **leave** the current `status`, so the
  standalone (manually-editable) status pill returns. (Confirm; alternative: reset to `NOT_STARTED`.)

*Call it on every mutation that changes the subtask set:*
- `updateSubtaskStatus` — replace its inline derivation block with a call to the helper.
- `createSubtask` — call the helper after creating, before `revalidatePath`.
- `deleteSubtask` — call the helper after deleting, before `revalidatePath`.
- (R8.1's modal create/edit go through `createSubtask` / `updateSubtask`; if `updateSubtask` can
  change a subtask's status, it should call the helper too.)

No DB changes; no new columns — pure server-action refactor + added call sites.

## Tests

- [ ] `pnpm build` / typecheck passes
- [ ] App (the reported repro): create a deliverable + subtasks, complete **all** → deliverable shows
      `COMPLETE`; **add a new subtask** → deliverable immediately re-derives **off** `COMPLETE`
      (to `NOT_STARTED`/`IN_PROGRESS`) **without** touching any existing subtask
- [ ] App: delete a subtask such that the remaining set's derived status changes (e.g. remove the only
      `BLOCKED` subtask) → deliverable updates immediately
- [ ] App: delete the **last** subtask → deliverable becomes manually-editable again per the empty-set
      rule (Q4)
- [ ] App: existing status-edit path still derives correctly (regression)

## Notes / log
- 2026-06-27 — Specced. No code written.
