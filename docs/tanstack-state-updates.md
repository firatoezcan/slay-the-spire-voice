# Stable dashboard updates with TanStack DB

Research baseline: 22 September 2026, before the dashboard update changes. Inspected the installed packages (`@tanstack/react-db` 0.4.1, `@tanstack/db` 0.9.2, `@tanstack/query-db-collection` 1.2.15), their bundled skills, and current first-party documentation. The skills retain an older `library_version` label; installed source is authoritative for exact behavior.

## Findings

The dashboard does not use React Suspense. It uses ordinary `useLiveQuery`, and its module-level collections already have stable identities. The interruption has concrete application causes: `App.act` sets one global pending flag, all action controls consume it, and the success/error banner is inserted above the page content. The pending flag freezes unrelated controls; adding and removing the banner moves the page. Keep controls mounted, reserve feedback space or use an overlay, and track pending work per action or entity. These findings come from [App.tsx](../apps/dashboard/src/App.tsx) and [RunView.tsx](../apps/dashboard/src/RunView.tsx), rather than an inferred TanStack defect.

`refresh()` invalidates every Query key and waits for unrelated active requests. TanStack Query supports exact-key and prefix targeting; invalidation ordinarily refetches in the background. Broad invalidation alone does not prove that rows are cleared. The installed Query Collection reconciles rows by key, compares values deeply, and retains the previous ready snapshot after a refetch error. Sources: [dashboard data layer](../apps/dashboard/src/data.ts), [Query invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation), and installed adapter `src/query.ts`, `applySuccessfulResult` / `makeQueryResultHandler`.

There is also a real stale-read boundary. `PUT /api/game/cards/protection` returns an authoritative card and `PUT /api/game/settings` returns authoritative settings, but `/api/state` returns the companion's cached snapshot. That snapshot updates in `tick()` on a one-second interval. Immediately refetching `/api/state` can therefore return the value from before a successful write. Sources: [GamePort](../mod/VoiceDirector/GamePort.cs), [companion routes](../apps/companion/src/app.ts), [tick](../apps/companion/src/jobs.ts), [polling schedule](../apps/companion/src/main.ts).

## Collection and query identity

- Keep one stable collection per resource and business scope. Use a cached factory for `jobs(runId)`, `events(runId)`, and `transcripts(runId)`, with keys such as `['runs', runId, 'jobs']`. Capture `runId` in the query function. The existing `forRun()` reads it indirectly from another query's cache while keeping a global key; a run change does not change that key, and previous-run rows can remain until polling finishes. Disable these queries when there is no run. Filter related jobs and pile counts by the active run as well. Sources: [Query keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys), [installed Query adapter reference](../node_modules/.bun/@tanstack+db@0.9.2+1fb4c65d43e298b9/node_modules/@tanstack/db/skills/db-core/collection-setup/references/query-adapter.md).
- Prefer `useLiveQuery({ query: q => ... })`. Structured conditions such as `eq(card.runId, runId)` become part of the derived identity. Inline callback allocation is not itself a collection reset. Explicit `queryKey` is needed for opaque `.fn.where` / `.fn.select` captures, or a measured hot path. Dependency arrays are deprecated in this installed release. Sources: [React query identity](https://tanstack.com/db/latest/docs/framework/react/overview#query-identity), installed `@tanstack/react-db/src/useLiveQuery.ts`.
- Include run identity in materialized card keys, for example `runId:pile:instanceId`, and preserve those keys while values update. Keep selection as UI state; reset it only when the selected entity is no longer available or the run changes. This prevents an in-flight mutation from sharing a row identity with another run. This is an application recommendation based on the existing card projection and the installed collection's immutable-key contract.
- `states` and `cards` may share the same Query key and extract different rows from the same snapshot. That is a supported read pattern. Their derived projections are unsuitable for direct-write cache reconstruction: neither `[{ ...snapshot, id }]` nor `snapshot.cards.map(...)` returns an existing array by reference. The installed adapter's fallback can choose the first array property. Do not call `states.utils.writeUpdate` or `cards.utils.writeUpdate` and assume the original snapshot remains coherent. Source: [Query Collection response selection](https://tanstack.com/db/latest/docs/collections/query-collection#selecting-rows-from-wrapped-responses), installed adapter `updateCacheDataForKey`.

## Mutations and settlement

Use native optimistic transactions for predictable edits such as protection and director settings. `collection.update` with `onUpdate` suits one collection; `createOptimisticAction` suits one user intent affecting multiple materialized rows. Apply the optimistic changes synchronously, await persistence and an authoritative synchronization boundary, then settle. Catch `transaction.isPersisted.promise` to report rollback errors. This promise means only what the handler actually awaited. Sources: [TanStack DB mutations](https://tanstack.com/db/latest/docs/guides/mutations), [installed mutation skill](../node_modules/.bun/@tanstack+db@0.9.2+1fb4c65d43e298b9/node_modules/@tanstack/db/skills/db-core/mutations-optimistic/SKILL.md).

For the current snapshot architecture, make the snapshot query itself read an authoritative game snapshot through the existing `/api/game/state` route, or make the companion's snapshot refresh guarantee a post-write observation. An isolated direct read followed by continued polling of an older cached snapshot can still revert the display. If keeping `/api/state`, hold the optimistic overlay until the cached snapshot observes the requested field and correct run; a successful stale refetch is insufficient. Do not replace the entire cached snapshot with a mutation's partial card/settings response. Source: the companion and game routes above; this recommendation follows from their separate write and polling paths.

The installed Query Collection automatically refetches after `onInsert`, `onUpdate`, and `onDelete`, unless the handler returns `{ refetch: false }`. Its default refetch does not throw on failure. When correctness depends on read-back, explicitly await `collection.utils.refetch({ throwOnError: true })` and return `{ refetch: false }` to avoid a second request. A `createOptimisticAction` supplies its own mutation function and does not automatically invoke collection handlers, so it must perform its own synchronization. Sources: installed adapter `wrappedOnUpdate` / `refetch`; installed mutation and transaction references.

Use direct writes only for confirmed responses with a compatible collection shape: a returned `JobRecord` can update its run's plain-array jobs collection immediately, followed by targeted polling. Showing “queued” confirms queuing only; it does not mean generation or application finished. Optimistic job cancellation must stay visibly pending until the returned record confirms the status. Sources: [companion job routes](../apps/companion/src/app.ts), [job transitions](../apps/companion/src/jobs.ts), [Query Collection direct writes](https://tanstack.com/db/latest/docs/collections/query-collection#direct-writes).

| Action | Confirmation boundary | Refresh scope |
| --- | --- | --- |
| Protect a card | Game returns protection, authoritative snapshot observes it | Snapshot |
| Save director settings | Game returns settings, authoritative snapshot observes them | Snapshot |
| Queue/cancel/retry generation | Companion returns the updated job | That run's jobs |
| Add/transcribe inspiration | Companion returns the transcript | That run's transcripts; affected jobs if queued |
| Save provider settings | Companion returns saved settings | Provider settings and health |
| Play/end turn/choose/use potion | `dispatched` means accepted for game dispatch | Snapshot and that run's events |

Gameplay effects should remain server-driven. `GamePort.Execute(..., dispatchOnly: true)` deliberately returns `dispatched` with no completion timestamp for play, end-turn, choice, and potion actions. Do not optimistically remove cards, adjust health, or claim “played” / “turn ended” on that response. Show the request's dispatch status, then let snapshots and events describe the outcome. Console operations can complete only when their own operation reports `succeeded`; even that is not a substitute for reading resulting game state. Source: [GamePort.Execute and command methods](../mod/VoiceDirector/GamePort.cs).

## Existing validation to exercise

Observe a protection toggle on a slow connection, a rejected protection request, and a failed post-write read; unrelated inputs should remain usable and feedback should not move content. Check a run switch while history is fetching, a poll during a pending mutation, and a card moving between piles. Confirm that a dispatched gameplay request never produces a fabricated completed-gameplay message. These are verification scenarios, not claims of completed runtime validation.

## Installed skills read

- `apps/dashboard/node_modules/@tanstack/react-db/skills/react-db/SKILL.md`
- `node_modules/.bun/@tanstack+db@0.9.2+1fb4c65d43e298b9/node_modules/@tanstack/db/skills/db-core/SKILL.md`
- Under that `db-core` directory: `collection-setup/SKILL.md`, `collection-setup/references/query-adapter.md`, `mutations-optimistic/SKILL.md`, and `mutations-optimistic/references/transaction-api.md`.

The local package source also establishes the exact refetch and projection behavior above; current website documentation is useful context but does not replace the installed contract.
