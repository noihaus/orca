# Task V1 report: integration verification

Branch `feature/dooray-integration` @ `b419047a83`, base `upstream/main` merge-base `45c63a66e9`. Date 2026-10-01.
**Status: DONE_WITH_CONCERNS.** I made no commits and changed no tracked files.

Evidence: screenshots in `v1-screens/`. Driver scripts, the mock API and test logs are in `v1-tools/`.

---

## Step 1: automated verification

| Command | Result |
|---|---|
| `pnpm tc` | PASS |
| `pnpm test src/shared/extensions src/main/extensions src/preload src/renderer/src/extensions src/main/updater src/shared/task-providers.test.ts src/main/global-fetch-call-site-audit.test.ts` | PASS: 100 files, 866 tests (includes `fork-seams.test.ts`) |
| `node fork/scripts/check-fork-seams.mjs` | PASS: `changed upstream files: 77, unmarked: 0` |
| `ORCA_CODE_QUALITY_BASE=upstream/main pnpm run check:code-quality:changed` | PASS: 0 new findings across 263 files, all 7 gates |
| `pnpm verify:localization-catalog` | PASS. The dooray catalog covers 237/237 keys in es/fr/ja/ko/zh. The core catalog is 24 keys short in fr/ja/ko/zh and 2430 short in es. This branch does not touch core locale files, so those gaps come from upstream. |
| `pnpm verify:localization-extraction` | PASS (report-only notes) |

### Full suite (`pnpm test`, 14 min, run under load)
Totals: 25 files failed, 10119 passed. 74 tests failed, 97343 passed.

To separate fork-caused failures from upstream ones, I re-ran every failing `src/` and `config/` file in isolation. I ran them once on HEAD and once on a temporary worktree at merge-base `45c63a66e9` (node_modules symlinked; the worktree has since been removed). Logs: `v1-tools/rerun-head.log` and `v1-tools/rerun-upstream.log`.

**Failures caused by the fork** (pass on upstream, fail on HEAD). These are **NOT fixed** because each one needs an edit to an upstream test or file, which adds a seam:

| Test file | Failures | Cause |
|---|---|---|
| `src/main/persistence-settings-ui-defaults.test.ts` | 1 | Expected `visibleTaskProviders` now gets `'dooray'` prepended by the `extension-provider-seeding` seam. |
| `src/main/persistence-source-control-ai-migration.test.ts` | 5 | Same cause: `'dooray'` is prepended to the visible/default provider lists. This includes "preserves a deliberate Jira opt-out" and "normalizes invalid task provider defaults". The expectations need to include the extension provider. |
| `src/main/proxy-guarded-fetch-call-site-audit.test.ts` | 1 | The audit flags `main/extensions/dooray/client.ts` (`getMainHttpClient().fetch`) and `dooray-request.ts` (`client.transport.fetch`) as un-audited non-net fetch calls. They need entries in `AUDITED_NON_NET_FETCH_CALLS`, or the audit needs to recognise the injected transport. |
| `config/scripts/check-runtime-electron-ratchet.test.mjs` | 1 | The checked-in baseline lacks `src/main/extensions/dooray/dooray-ipc.ts` and `task-branch/task-branch-ipc.ts`, so the baseline must be regenerated. |
| `src/main/ipc/register-core-handlers/register-core-handlers.test.ts` | 2 | Its `electron` mock has no `ipcMain`. The `main-ipc` seam now calls dooray `handleMutation`, which throws and breaks a later assertion. |
| `src/renderer/src/components/browser-pane/annotate/useGrabMode.test.ts` | 7 | Its `react` mock has no `lazy`. `extensions/dooray/dooray-lazy-slots.tsx:8` calls `lazy()` at import time. **This contradicts the ledger, which lists this test as a known pre-existing upstream failure. It passes on upstream.** |
| `src/renderer/src/components/right-sidebar/right-sidebar-titlebar-drag-regions.render.test.tsx` | 2 | When the stored tab is hidden (folder-only or PR-checks tab), the fallback is now the first tab, "Dooray Tasks", instead of the File Explorer. This is a behaviour change from the `right-sidebar-extension-tab` seam, not only a test-expectation change. |

**Pre-existing upstream failures** (identical at merge-base):
- `src/shared/pane-agent-identity-title-corpus.test.ts` (needs local corpus data)
- `src/main/shell-startup-feature-channel.test.ts`
- `src/main/ipc/pty-runtime-hidden-at-spawn-mark.test.ts`

**Environment-only or flaky:**
- `tests/e2e/cross-version-wire/*` and `tests/e2e/relay-region-correction.unit.test.ts` fail because no release tags are fetched ("found no stable desktop release tags").
- `browser-manager-tab-identity` (29), `browser-manager-viewport-ownership` (12), `structured-chat-coordinator-mail`, `node-pty-fd-leak` and `release-checkout` failed only under full-suite load. The browser-manager files passed when re-run in isolation on HEAD.

## Step 2: isolation

- I used `upstream/main...HEAD` instead of the brief's `develop...HEAD`, per the ledger ruling. Fork `develop` is an ancestor of upstream/main, so diffing against it would include about 2,000 upstream commits.
- Upstream files modified (`--diff-filter=M`, excluding `extensions/`, `fork/` and `.superpowers/`): **77**. Distinct files listed in `fork/SEAMS.md`: **77**. `comm` shows **an exact match in both directions**.
- New files outside `extensions/` (17): generic seam helpers and tests, such as `repo-extension-settings.ts`, `web-extension-api.ts` and `localization-extension-catalogs.mjs`. None contains "dooray".
- `rg -il dooray src --glob '!**/extensions/**' --glob '!**/installed-*'` returns **empty** (exit 1).
- `fork-seams.test.ts` passes (part of Step 1).

## Step 3: existing-credential migration (V1 check item: real safeStorage decrypt)

Setup:
- I built `out/` with `pnpm run build:electron-vite`.
- I launched Electron in the background (`ORCA_BACKGROUND_LAUNCH=1`, `ORCA_E2E_HEADLESS=1`) with an isolated profile (`ORCA_E2E_USER_DATA_DIR`) and a disposable HOME. That HOME held **copies** of `~/.orca/dooray-account.json` and `dooray-token.enc`.
- Launch flags were `--use-mock-keychain --password-store=basic`, the same flags the repo's E2E helper uses so isolated runs never trigger a Keychain UI prompt.
- The real files were never opened for writing. Their sha256 matched before and after the run.

Result (`A-05`, `A-06`):
- The v1 account file is read without reconnecting. `status()` returns `connected: true`, the viewer is set and `apiUrl` is `https://api.dooray.com`. The settings card shows "연결됨" with the account name, web URL and email.
- Decrypting the token **fails**, and the UI shows `credentialError`: "Could not decrypt saved Dooray credential. Approve Keychain access or reconnect Dooray." (in red on the integration card). `testConnection()` returns that error without making any network call.
- **This is identity-related, not a code bug.** The token is a macOS `v10` safeStorage blob (first 3 bytes `v10`). The dev app runs as "Orca Dev" with a mock keychain, so it cannot hold the key that sealed the blob.
- A real decrypt needs the packaged fork app (productName "Orca", appId `com.stablyai.orca`, the same as upstream) to read the user's Keychain item. That triggers an interactive Keychain prompt because the code signature differs. It cannot be done in a background run. My attempt to list Keychain service names was denied by the permission classifier, and I did not pursue it further.
- **The V1 check item is still open:** the user needs to launch a locally built fork app in the foreground once and approve the prompt.
- Minor UX: on the Tasks page the raw IPC prefix leaks into the message: "Error invoking remote method 'dooray:listProjects': CredentialDecryptionError: …" (`A-05`).

## Step 4: E2E smoke (read-only)

Because of Step 3, the real token could not be used in a background run. I did **not** call the real Dooray API at all. Instead I ran a local **read-only mock Dooray API** (`v1-tools/mock-dooray.mjs`):
- It served 45 tasks, and 130 for the load-more check.
- It returned 405 for any non-GET request.
- It checked for the `Authorization: dooray-api <token>` header, and every request carried it (`auth=ok`).

A second isolated profile pointed at it, using a plaintext legacy token. A temporary fixture repo with a submodule (`libs/sub`) and a `feature/ORCAQA/3` worktree was added **only to that isolated profile**.

| Check | Result | Screens |
|---|---|---|
| Tasks page: Dooray tab position | The Dooray tab is the first source tab, and the sidebar nav shows D, GitHub, Jira. The page still opens on **GitHub** by default. Dooray is first but not preselected (observation, not covered by spec). | A-04, B-01 |
| List | ORCAQA project auto-selected; 39 open tasks; columns show ID, title, milestone chip, priority icon, workflow chip, assignee and relative date | B-02 |
| Filters | 내 업무 39, 전체 39, 완료 6 (the right `postWorkflowClasses`/`toMemberIds` queries). Priority 높음 gives 10, matching the mock. 높음 + 진행 중 gives 3. Stage and status dropdowns work and reset correctly. | B-03..B-08 |
| Sort | Direction toggle and sort-by (제목) reorder the list | B-05 |
| Load more | 50/112, then 100/112 after clicking (requests `page=1&size=50`) | B-18, B-19 |
| Detail sheet | Body markdown (bold, code, list, long wrapped line) and 3 comments, including a long one, render with no horizontal overflow. The aside actions and comment composer lay out correctly. Workflow popover opens anchored under the chip and closes on Esc. **V1 check item (Sheet/Popover layout): OK.** No checkmark marks the current workflow (minor). | B-09, B-10, B-11 |
| Base-ref dialog | Opens from "현재 워크스페이스에서 시작" through the lazy app provider. It shows the pinned base `main`, branch search, fetch checkbox and submodule list (`libs/sub`). Cancel closes it. **V1 check item: OK.** | B-12 |
| Start in current workspace (fixture only) | Ran with base "현재 브랜치에서" and `libs/sub` checked. The fixture root and submodule both moved to `feature/ORCAQA/10`, the workspace was renamed to the task title and activated. | B-13, B-14 |
| Sidebar Dooray tab, active card | "현재 업무 ORCAQA/10", status chip, body, comments, composer, and an "전체 업무 39/39" section | B-15 |
| Repository settings: "Dooray Task Start" | Present with the 새 워크트리/기존 워크스페이스 and 워크스페이스만/서브모듈 포함 toggles. The title is English in ko by design (matches the original and the i18n TSV). | B-16 |
| Settings integration card | Covered in Step 3 | A-06 |
| Onboarding Dooray row | **Not reachable on this machine.** Upstream skips the Integrations step whenever `gh` is installed (`shouldSkipIntegrationsStep`), and `gh` is installed here. The flow showed 1/3 agent, 2/3 theme, 3/3 notifications. Not verified visually, and `DoorayOnboardingRow` has no dedicated test (only the generic seam-behavior tests). | A-01, A-02 |
| "Check for updates" | `updater.check()` emits `{state:'not-available', userInitiated:true}` and shows the toast "최신 버전을 사용 중입니다." I triggered it through the same IPC (`updater:check`, which calls `checkForUpdatesFromMenu`) rather than clicking the native menu, so the window stayed hidden. | B-17 |

Other UI observations (minor):
- In the right sidebar, the floating workspace-board button (bottom-right) overlaps the "댓글 달기" button of the Dooray comment composer (`B-15`).
- The Dooray panel card sits flush against the source-tab row, while GitHub has its sub-tab row between them (`A-05`, `B-02`).

Not exercised (forbidden or out of scope): creating a task, adding a comment, changing the workflow, uploading, disconnecting, or any git operation on the user's real repos.

## Step 5: local package build

**Skipped.** The data volume has only about **4.8–5.1 GB free (99% full)**.

`pnpm build:mac` runs `build:desktop`, three Swift native helpers (none are prebuilt: `native/*/.build` is missing) and electron-builder dmg+zip for x64 and arm64. That needs several GB and risked filling the disk.

What I checked instead:
- The bundled `out/main/index.js` contains `process.env.ORCA_ENABLE_AUTO_UPDATE==='1'`, so the gate is a runtime env check and stays off in any packaged build unless that env var is set.
- The runtime check in Step 4 shows the menu path answers `not-available`.
- The resolved electron-builder config has `publish = {provider:'github', owner:'noihaus', repo:'orca', releaseType:'draft'}`.
- The local path (`isMacRelease` false) does not notarize and signs ad-hoc. It would need no secrets, but electron-builder may pick up an installed "Apple Development" identity. Set `CSC_IDENTITY_AUTO_DISCOVERY=false`, `CSC_NAME=-` and pass `--publish never` when running it.

Recommended once space is freed (about 6+ GB):
```
CSC_IDENTITY_AUTO_DISCOVERY=false CSC_NAME=- pnpm build:desktop && pnpm exec electron-builder --config config/electron-builder.config.cjs --mac dmg --arm64 --publish never
```
Then launch the app in the foreground once to close the Step 3 safeStorage check item.

## Cleanup

- Isolated profiles, the fixture repo, the temporary upstream worktree (pruned), the credential backup copy and `out/` (absent before the run) are all removed.
- No Electron, daemon or mock processes are left running.
- `~/.orca/dooray-*` sha256 values are unchanged.
- `git status` is clean.

## Follow-ups for the controller (non-trivial, not fixed)
1. Fix the 7 fork-caused upstream test failures. Each needs an upstream test or baseline edit with a `fork-seam` marker, a `FORK_SEAMS` entry and a SEAMS.md update. `useGrabMode` and `register-core-handlers` could instead be fixed by not evaluating `lazy()` and IPC at import time in the extension.
2. Decide whether the right-sidebar hidden-tab fallback should stay on File Explorer rather than moving to the first extension tab.
3. Do a foreground run of the packaged fork app to verify real safeStorage decrypt.
4. Optionally: preselect Dooray on the Tasks page, strip the raw IPC error prefix, fix the floating-button overlap in the sidebar composer, and find a way to cover the onboarding row when `gh` is installed.
