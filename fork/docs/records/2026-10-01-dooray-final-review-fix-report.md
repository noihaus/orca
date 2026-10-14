# Final whole-branch review fixes — report

Branch `feature/dooray-integration`, start HEAD `9e0a1a0b75`, end HEAD `02b25d8710`. 11 commits, nothing pushed.

## Per item

1. **Done** — `5526a26687`. `client.ts` calls `httpClient.fetch(url, init)` directly (misleading orcad comment replaced). The audit test can't name Dooray (the fork-seams name-leak test forbids `dooray` outside extensions), so the allowlist entry lives in the new `src/main/extensions/installed-audited-fetch-calls.ts` (`['main/extensions/dooray/client.ts', 1]` plus a one-line reason). It is spread into `AUDITED_NON_NET_FETCH_CALLS` next to Jira's entry through the new seam `audited-extension-fetch-calls` (2 marked hunks), which is registered in FORK_SEAMS and SEAMS.md. `DoorayTransport.send` is kept.
2. **Done** — `912611e269`. `TaskBranchSwitchResult` 'created' gains `fetchFailed?: true` and `baseFallback?: 'head'`. `fetchBaseRef` reports a real fetch failure; `switchTarget` reports a base that did not resolve. The renderer warns with the target names ("Created X from current HEAD because B was not found: …" / "Fetch failed; created X from local B: …") and suppresses the plain success toast. Base-ref and per-target git helpers were split into `task-branch-base-ref.ts` and `task-branch-target-git.ts` (max-lines). Tests: real-git (offline-remote fetch failure, missing base, updated expectations) and a renderer toast test.
3. **Done** — `1a52c1b129`. `translateDoorayError` now uses `compactIpcErrorMessage`. The new `readDoorayErrorMessage(error, fallback)` uses `readIpcErrorMessage` and is applied at every listed site plus `use-dooray-new-task-form`, `DoorayConnectDialog` and `DoorayIntegrationCard`. Literal keys were added for 'Failed to load task.', comments, tasks, projects, 'Connection failed.', 'Test failed.' and viewer 'unknown'. The slice uses `translateDoorayLabel`, so no static i18n import is needed. Tests: `readDoorayErrorMessage` maps the IPC-wrapped "boom" to "boom", and the start-flow toast shows "boom".
4. **Done** — `dc8b64c039`. The overlapping element is the floating-workspace launcher (`FloatingTerminalToggleButton`, 72px bottom gap + 36px). No other right-sidebar panel has a clearance pattern, so the Dooray panel's scroll container gets `pb-24` (96px). The composer can now scroll clear of the launcher.
5. **Done** — `d19ae3cdc4`. `DoorayBaseRefRequest.workspaceLabel` (`<worktree label> · <project>`) is shown as "Workspace: …" in the dialog description. Dialog and flow tests were updated.
6. **Done** — `2f2e299631`. Only https is accepted, plus http to localhost, 127.0.0.1 or [::1]. Other schemes are rejected with "Enter a valid Dooray URL." Tests added.
7. **Done** — `88a57fc2d4`. `doorayRequest` uses `AbortSignal.timeout` (30s default; 120s for the upload call), combined with any caller signal through `AbortSignal.any`. The timer starts inside the concurrency slot. A timeout raises `DoorayApiError('Dooray did not respond in time.')`, which is localized. The slot is released through the existing `finally`. New `dooray-request.test.ts` checks that four hung requests time out, the queued fifth one proceeds, and a caller abort is honored.
8. **Done** — `af4784e18f`. A switch that fails after a stash reports "<error> Your changes are in the stash entry "orca: <branch>"." The switch-result toasts moved to `dooray-switch-result-toasts.ts` (max-lines). Test added.
9. **Done** — `df25362eb4`. `deferredLazyComponent` wraps `lazyWithRetry` (optional `reloadKey`) and still creates it on first render. The useGrabMode upstream test stays green. The deferred test now waits with `vi.waitFor`.
10. **Done** — `5144bccab3`. `methods/index.ts`, `core-typed-method-contract.test.ts`, `rpc-params-type-parity.ts` and `generate-rpc-params-catalog.mjs` are byte-identical to upstream/main. The single seam is in `rpc/dispatcher.ts`: `buildRegistry(withMainExtensionRpcMethods(methods, ALL_RPC_METHODS))`. Extension methods are appended only when the dispatcher is built from the full core list, which covers the default, `runtime-rpc-state`, `ipc/runtime` and the SSH dispatchers. An explicit subset is left as given. The fixture test now dispatches `fixture.ping` through `RpcDispatcher` and asserts the method is absent from `ALL_RPC_METHODS`, and so from the catalog. `verify:rpc-params-catalog` passes.
11. **Done** — `02b25d8710`. The `appProviders` slot became `appSurfaces` (`ComponentType[]`, rendered as siblings by `ExtensionAppSurfaces`). The App.tsx diff against upstream is now 1 import plus 2 JSX lines (marker and element). The Dooray base-ref prompt is a module-level queue (`dooray-task-base-ref-context.ts`, `useSyncExternalStore`). `DoorayTaskBaseRefDialogHost` registers itself and shows the head of the queue, and the last host to unmount cancels any orphaned prompts. The seam `app-providers` was renamed to `app-surfaces` in FORK_SEAMS, SEAMS.md and the plan doc. Host tests: sibling queueing and the cancel-on-unmount behaviour.

## Seam file count (`node fork/scripts/check-fork-seams.mjs`)
- Before: 80 changed upstream files, 0 unmarked.
- After item 1: 81 (the audit test is a new seam file).
- After item 10: 78. Item 11 shrinks App.tsx but keeps it a seam file.
- Final: **78, 0 unmarked**.

## Verification (Node 24)
- `pnpm tc`: clean.
- `pnpm test` over src/shared/extensions, src/main/extensions, src/preload, src/renderer/src/extensions, src/renderer/src/components/right-sidebar, src/main/ipc/register-core-handlers, both fetch audits, persistence-settings-ui-defaults, persistence-source-control-ai-migration, check-runtime-electron-ratchet.test.mjs, useGrabMode and src/renderer/src/web: 369 files, 3045 passed, 3 skipped.
- `pnpm test src/main/runtime/rpc src/main/runtime/mobile-rpc-allowlist.test.ts` (after item 10): 335 files, 3106 passed, 1 skipped.
- `check:runtime-electron-ratchet` passed. `verify:rpc-params-catalog` passed. `verify:localization-catalog` and `verify:localization-extraction` exit 0.
- `ORCA_CODE_QUALITY_BASE=upstream/main pnpm run check:code-quality:changed`: 0 findings across 274 files.

## Concerns
- Disk hit ENOSPC once mid-run: free space dropped to 0, then recovered to about 1.1GB. Something outside this task is consuming space.
- The Dooray main tests leak temp dirs (`orca-dooray-*`, about 195 per full run; about 1,200 had piled up). The likely source is the harness or credential-store tests not removing `mkdtemp` homes. I deleted the leftovers but did not fix the cause.
- Item 4 is padding only. It is not verified visually (no app run). A user can still drag the launcher anywhere.
- Item 10 relies on reference identity (`methods === ALL_RPC_METHODS`). A future upstream caller that copies the list (e.g. `[...ALL_RPC_METHODS]`) would silently drop extension methods. The fixture test covers only the default and identical-list paths.
- No new worktrees were created.
