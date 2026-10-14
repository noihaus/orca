# SDD ledger — plan: fork/docs/plans/2026-09-30-dooray-integration-port.md

Env: every shell must run `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null` first (repo needs Node 24 / pnpm 12; default shell node is 22 and husky pre-commit fails without it).
Spec: fork/docs/specs/2026-09-30-dooray-port-reference.md (+ 2026-09-30-dooray-i18n.tsv). Original bundle: ~/orca-dooray-edition-ref/{app,pretty}.

## Task 0
Task 0: complete (commit 1e2c46a34b — docs moved to fork/, branch rebased onto upstream/main 45c63a66e9, upstream remote added, pnpm install + tc clean)
Ruling: plan/spec/SEAMS docs live under top-level `fork/` (not docs/) — upstream .gitignore ignores docs/** and editing .gitignore adds a seam — cost if wrong: move 3 files.
Ruling: feature branch based on upstream/main (1.4.214) instead of fork develop (1.4.178, no fork-only commits) — avoids an immediate 2,145-commit merge; fork develop is simply behind upstream — cost if wrong: rebase one branch back onto develop.
Ruling: plan's `docs/fork/SEAMS.md` → `fork/SEAMS.md`.

## Pre-flight scan
| Pair / task | Produces → consumes | Finding |
|---|---|---|
| S1 ↔ D0 | EXTENSION_TASK_PROVIDERS/installed manifest (empty) → D0 fills 'dooray' | OK; empty `as const` gives `never`, union stays valid |
| S1 ↔ S11 | seam markers → contract list | OK |
| S2 ↔ D4, D13 | MainExtension {id, registerIpcHandlers, rpcMethods, runtimeCommands} → dooray main ext | OK |
| S3 ↔ D4, D13, D14 | PreloadExtension {key, api} → window.api.dooray (+ .taskBranch) | CONFLICT: D14 text says `window.api.taskBranch`, D13 exposes `window.api.dooray.taskBranch` → Ruling R1 |
| S4 ↔ D5 | createSlice + locales(`auto.ext.<id>.*`) → dooray slice/locales | OK |
| S5 ↔ D8, D10 | taskSource {Panel, onStartNewWorkspace(item, prefilledName)} → DoorayTaskSourcePanel, buildDoorayLinkedWorkItem | OK |
| S6 ↔ D12 | `ext:<id>/<panel>` keys → 'ext:dooray/tasks' | OK |
| S7 ↔ D6, D14 | integrationCards / onboardingIntegrationRows / repositorySettingsSections / appProviders → dooray components | OK |
| S8 ↔ D10 | LinkedWorkItemSummary.branchNameOverride + resolver → buildDoorayLinkedWorkItem | OK |
| S9 ↔ D14 | Repo.extensionSettings → extensionSettings.dooray | OK |
| S10 ↔ D14 | confirm alternate → dirty prompt | OK |
| D1 ↔ D2 ↔ D3 | credential store → client → queries | OK |
| D7 ↔ D8, D10, D12, D14 | pure logic signatures | OK |
| D9 ↔ D14 | DoorayIssueWorkspace secondaryStart/workspaceStart optional → filled by D14 | OK (plan says D12 fills; typo) → Ruling R2 |
| U1 | self-consistent | OK |
| S1..S11 each | tests vs code specified | OK; tests use fixture extensions |
| D1..D14 each | tests vs code | OK |
| All | "Future plugin" design rules | apply in D1–D14 reviews (portability rules) |
| All | NEW upstream AGENTS.md rules (as-cast ban w/ SAFETY, design-system lint, ORCA_BACKGROUND_LAUNCH=1) | not in plan → Ruling R3 |

Ruling R1: taskBranch API lives at `window.api.dooray.taskBranch.*` (D13); D14's web-client check tests `window.api.dooray?.taskBranch` — keeps it inside the extension namespace — cost if wrong: rename one accessor.
Ruling R2: D9 note "D12 fills secondaryStart/workspaceStart" means D14 — cost: none.
Ruling R3: all dispatches carry the current AGENTS.md rules (no `as` casts except `as const`, or `// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: …`; design-system lint via check:code-quality:changed; run apps with ORCA_BACKGROUND_LAUNCH=1) — cost if wrong: none (upstream rules).
Ruling R4: `$electron` visual checks in S5/D8/D9/D11/D12/D14 are batched into V1 (one app run) unless a task's tests cannot cover it — avoids ~6 app launches — cost if wrong: UI bug found later in V1.

## Tasks
Task U1: dispatched (base 1e2c46a34b, implementer sonnet)
Task U1: implementer DONE_WITH_CONCERNS (commit 4abc29cb05; check:code-quality:changed hung >10min, oxlint/oxfmt run directly; vitest config env seam added)
Ruling U1-a: releaseType stays upstream 'draft' (plan's 'release' was written against the older base; upstream comment explains draft protects /releases/latest) — only owner changes — cost if wrong: one-word change.
Task U1: review → Needs fixes (1 Important: releaseType must stay 'draft')
Task U1: minor (deferred): fork-seam marker is inside if-bodies in updater.ts, not on the edited line — S11 must define marker placement convention
Task U1: minor (deferred): updater-setup.ts new methods attachWindowWithoutUpdater/reportAutoUpdateDisabled lack fork-seam marker — S11
Task U1: minor (deferred): updater.fork-disabled.test first case doesn't assert webContents.send uncalled
Task U1: note: config/vitest.config.ts test.env ORCA_ENABLE_AUTO_UPDATE='1' is an additional seam — S11 list must include it
Ruling Q1: code-quality gate runs with ORCA_CODE_QUALITY_BASE=upstream/main (origin/main = stale fork main caused the hang) — cost if wrong: none
Task U1: fix round 1/5 (1 addressed, 0 open — releaseType reverted; commits 4abc29cb05..71e244385d)
Task U1: controller ran code-quality gate (upstream base): 3 casting findings in updater.fork-disabled.test.ts → fix round 2 dispatched
Task U1: fix round 2/5 (1 addressed, 0 open — test casts replaced by SAFETY helper; commits 71e244385d..e599252a8d)
Task U1: complete (commits 1e2c46a34b..e599252a8d, review clean)
Task S1: dispatched (base e599252a8d, implementer opus)
Ruling M1: seam marker convention = trailing `// fork-seam: <name>` ON the edited upstream line (multi-line block: first line); S11 enforces and fixes U1's placement — cost if wrong: re-mark lines
Task S1: implementer DONE (commit b4f7c8c668)
Carry-forward CF1 (→ S5): with a non-empty manifest, 8 renderer tc errors remain: TasksPane.tsx provider Record, closed switches in 4 renderer files, launch-work-item-direct.ts work-item provider type, 2 test fixtures — S5 must make `pnpm tc` pass with a fixture/non-empty manifest (see task-S1-report.md concern 1).
Pre-existing failure (not ours): src/shared/.../pane-agent-identity-title-corpus.test.ts fails on upstream base too.
Task S1: review → Needs fixes (2 Important: seam markers missing/misplaced per hunk; production cast in extension-task-sources.ts:568)
Ruling M2 (refines M1): each contiguous hunk of edited upstream lines carries exactly one trailing `// fork-seam: <name>` on the hunk's FIRST edited line; not every line — cost if wrong: grep triage finds hunk starts only.
Task S1: minor (deferred): prepare-loaded-profile-settings.ts:299-309 rewrites upstream taskProviderSettings assignment — could keep upstream statement + separate seed call
Task S1: minor (deferred): empty manifest still persists seededExtensionTaskProviders: [] (benign data diff)
Task S1: fix round 1/5 (2 addressed, 0 open — markers per hunk, cast removed; commits b4f7c8c668..6a2ea0b511)
Task S1: complete (commits e599252a8d..6a2ea0b511, review clean)
Task S1: minor (deferred): two Why comments dropped to keep marker on hunk first line (readiness connected:true reason, settings-type doc)
Task S2: dispatched (base 6a2ea0b511, implementer sonnet)
Task S2: implementer DONE_WITH_CONCERNS (commit 83d640cb51; runtime seam moved to orca-runtime-state-fields.ts; ALL_RPC_METHODS→CORE_RPC_METHODS rename)
Task S2: review → Needs fixes (Important: runtime command collision unguarded; extension commands untyped)
Ruling S2-a: D4's Dooray RPC handlers call Dooray module functions directly (host-local main process), not via runtime.<name>; `runtimeCommands` stays optional and Dooray won't use it — removes the untyped-accessor problem — cost if wrong: D4 adds a typed accessor.
Ruling S2-b: rpc params catalog generator (config/scripts/generate-rpc-params-catalog.mjs) must read CORE_RPC_METHODS so extension method names never land in the upstream generated file — fixed in S2 now (isolation rule is load-bearing) — cost if wrong: one-line revert.
Ruling S2-c: CORE_RPC_METHODS marker moves to the declaration line; inserted comment line removed (M2).
Task S2: minor (deferred): mobile RPC allowlist excludes extension methods (fine for Dooray; desktop/remote tokens unaffected)
Task S2: minor (deferred): extension RPC params excluded from type-parity check (disclosed)
Ruling M3: where oxfmt forces a trailing marker off the hunk's first line (e.g. after '[' or '{'), a marker on the immediately following line is compliant; S11 contract test checks (seam,file) presence, not exact line — cost if wrong: none
Task S2: fix round 1/5 (3 addressed, 0 open — collision guard, catalog reads CORE, marker; commits 83d640cb51..9f7b851f8c)
Task S2: complete (commits 6a2ea0b511..9f7b851f8c, review clean)
Task S3: dispatched (base 9f7b851f8c, implementer sonnet)
Task S3: implementer DONE_WITH_CONCERNS (commit 1531067cd5; web opt-in via INSTALLED_RUNTIME_NAMESPACE_API_KEYS in shared manifest; tsconfig.tc.web.json include seam; 1 SAFETY cast)
Carry-forward CF2 (→ D4): D4 must add 'dooray' to BOTH installed-preload-extensions.ts AND INSTALLED_RUNTIME_NAMESPACE_API_KEYS in src/shared/extensions/installed-extension-manifest.ts.
Task S3: review → Needs fixes (Important: extension key colliding with core window.api key silently shadowed)
Ruling S3-a: drift guard between INSTALLED_PRELOAD_EXTENSIONS and INSTALLED_RUNTIME_NAMESPACE_API_KEYS (every web key must be a preload key) is added in this fix round — D4 depends on both lists — cost if wrong: one extra test.
Task S3: minor (deferred): createWebExtensionApis returns Record<string, never>; long comment at expose-preload-extensions.ts:159
Note for D4: installed-preload-extensions importing dooray preload api brings ipcRenderer into web typecheck graph (types only, OK).
Task S3: fix round 1/5 (2 addressed, 0 open — core collision tc+runtime guard, drift test; commits 1531067cd5..b05c0f595a)
Task S3: complete (commits 9f7b851f8c..b05c0f595a, review clean)
Task S3: minor (deferred): core-key collision surfaces as PreloadApi=never (noisy tc errors) — branded error type would name the key
Task S4: dispatched (base b05c0f595a, implementer opus)
Task S4: implementer DONE (commit a5f6c69624)
Carry-forward CF3 (→ D5): Dooray slice creator must be typed StateCreator<ExtensionStoreState,…> (not AppState — TS2456 cycle). en.json under extensions/dooray/locales is required once keys are used (sync:localization-catalog creates it).
Carry-forward CF4 (→ S7/S9): RepositorySettingsSectionProps.updateRepo type is provisional — align with real updateRepo signature.
Task S4: complete (commits b05c0f595a..a5f6c69624, review clean — approved first pass)
Task S4: minor (deferred): AppState collision → diffuse never error; en bundle merged after init without re-render; locale loader filter vs direct lookup
Task S5: dispatched (base a5f6c69624, implementer opus; carries CF1)
Task S5: implementer DONE (commit 21a27a65bd; CF1 closed — tc passes with fixture manifest id)
Carry-forward CF5 (→ D8): taskSource.Panel must be lazy; providerId must equal the manifest id ('dooray').
Note: task-source-context-summary.ts at 300/300 lines, automation-target-availability.ts 299/300 (max-lines) — later seams there need a split.
Task S5: review → Needs fixes (Important: use-task-page-source-summary.ts feeds repo-derived host availability to extension sources → bogus "unavailable" notice)
Task S5: minor (deferred): summary recurses as provider:'linear' (coupling; file at 300-line cap)
Task S5: minor (deferred): extension-task-source-options.tsx creates new Icon component per call → sidebar icon remount each render
Task S5: minor (deferred): SidebarTaskNavButton extension icon lacks aria-hidden
Task S5: minor (deferred): manifest id without renderer source shows blank tab (transient D0→D8)
Task S5: fix round 1/5 (1 addressed via upheld pushback + regression test, 0 open; commits 21a27a65bd..f235fae8c0)
Task S5: complete (commits a5f6c69624..f235fae8c0, review clean)
Task S6: dispatched (base f235fae8c0, implementer sonnet)
Task S6: implementer DONE (commit fd469ee151)
Carry-forward CF6 (→ D12): D12 must add 'ext:dooray/tasks' to INSTALLED_RIGHT_SIDEBAR_TAB_KEYS in shared manifest AND to renderer rightSidebarTabs (drift test enforces equality).
Task S6: complete (commits f235fae8c0..fd469ee151, review clean — approved first pass)
Task S6: minor (deferred): markers in ui-selection-normalization.ts/right-sidebar-route.ts on block 2nd line; ExtensionRightSidebarPanel recomputes tab list each render
Task S7: dispatched (base fd469ee151, implementer sonnet; carries CF4)
Task S7: implementer DONE (commit f0c6d8b2be; CF4 closed)
Task S7: review → Approved with 1 Important (setup-guide & feature-wall callers of deriveIntegrationConnectionStatus lack extension facts → contradictory status)
Task S7: minor (deferred): App.tsx provider subtree re-indent (merge-conflict prone) — consider single wrapper component; no host-wiring render tests; unready extension doesn't set checking flags; RepositoryPaneRepoUpdate type lives in component file (layering)
Task S7: fix round 1/5 (2 addressed, 0 open — facts in setup-guide/feature-wall + marker; commits f0c6d8b2be..7b9c3974c3)
Task S7: complete (commits fd469ee151..7b9c3974c3, review clean)
Ruling B1: S8+S9+S10 batched into one implementer dispatch (small, independent generic seams), one commit per task, one combined review — cost if wrong: a larger review surface.
Task S8-S10: dispatched (base 7b9c3974c3, implementer sonnet)
Task S8-S10: implementer DONE (commits d28177d66d, eb5cb7d880, 3aa86fe866)
Carry-forward CF7 (→ D10): composer drops jira-provider seeds without matching taskSourceContext; D10 must pass initialTaskSourceContext when opening the composer for a Dooray item.
Carry-forward CF8 (→ D14): old remote hosts strip extensionSettings silently; D14 should read back after write and surface a message if missing.
Task S8-S10: review → Approved (1 Important S8: no renderer-side git ref validation of branchNameOverride)
Ruling S8-a: accept main-process `git check-ref-format --branch` (runtime-worktree-create-git.ts:36) as the branch-name guard — identical to upstream's Linear branchName path; Dooray taskNumbers are server-formatted (e.g. dooray-D-TF/2619); controller context had wrongly implied composer validation exists — cost if wrong: an odd taskNumber shows a create-time git error instead of an early message.
Task S8: minor (deferred): no test for draft-restore / repo-change preservation of override; removedLinearItem var name now misleading; item selected after mount doesn't set override (Dooray seeds at open time)
Task S9: minor (deferred): no depth limit (16KB cap only); silent load-time drop without log; triple validation
Task S8: complete (commits 7b9c3974c3..d28177d66d, approved)
Task S9: complete (commits d28177d66d..eb5cb7d880, approved)
Task S10: complete (commits eb5cb7d880..3aa86fe866, approved)
Task S11: dispatched (base 3aa86fe866, implementer sonnet)
Task S11: implementer DONE (commit 394b39de5f; 77 seam pairs / 22 names; 76 changed upstream files, 0 unmarked)
Task S11: review → Needs fixes (Important: SEAMS.md runbook lacks nvm use 24 + ORCA_CODE_QUALITY_BASE step)
Task S11: minor (deferred): set-based compare hides duplicate markers; isolation scans src/ only; fixture doesn't cover web-preload runtime-namespace seam
Task S11: fix round 1/5 (2 addressed, 0 open — runbook env + gate + develop note; commits 394b39de5f..7719be5a11)
Task S11: complete (commits 3aa86fe866..7719be5a11, review clean)
Ruling B2: D0+D1 batched (D0 is a 2-file registration), one commit each.
Task D0-D1: dispatched (base 7719be5a11, implementer sonnet)
Task D0-D1: implementer DONE (commits b4b0d3a370, 00e51322f0)
Task D0: complete (commits 7719be5a11..b4b0d3a370, approved)
Task D1: complete (commits b4b0d3a370..00e51322f0, approved)
Task D1: minor (deferred): no 0600 mode assertion; mislabeled test "clears a prior error on save"; stale credentialErrorMessage on non-decrypt fs error
V1 check item: real safeStorage decrypt of the v0.2.2 ~/.orca/dooray-token.enc in the packaged/dev app (fake secret store in unit tests).
Task D2: dispatched (base 00e51322f0, implementer sonnet)
Task D2: implementer DONE (commit fff848cad6; no red-first run; result: unknown → D3 mappers must narrow with guards)
Task D2: complete (commits 00e51322f0..fff848cad6, approved)
Ruling D2-a: D2's untested branches (status.credentialError after decrypt failure; slot release when fetch throws with 4 slots full) are added by D3's implementer using the same harness, instead of a D2 fix round — cost if wrong: none.
Task D2: minor (deferred): isRecord duplicated in client.ts and dooray-request.ts; no on-disk assertion that failed connect writes no .enc
Task D3: dispatched (base fff848cad6, implementer sonnet)
Task D3: implementer DONE (commit 1a26298290)
Carry-forward CF9 (→ D4): IPC/RPC import args-only functions from src/main/extensions/dooray/dooray-api.ts (it wraps fn(client,args) modules with requireDoorayClient()).
Task D3: complete (commits fff848cad6..1a26298290, approved)
Ruling D3-a: invalid-arg defaults (spec §2 line 84) belong to the IPC/RPC boundary per spec §1 ("handlers validate args themselves") → D4 implements them; D4 also aligns authorName/milestoneName to spec `||` semantics (empty string falls back) — cost if wrong: none.
Task D3: minor (deferred): doorayProjectPath imported from queries module by mutations; dooray-test-client.ts in prod tree imports harness (confirm build excludes); extra id&&name filters not in spec
Task D4: dispatched (base 1a26298290, implementer sonnet; carries CF2, CF9, S2-a, D3-a)
Task D4: implementer DONE (commit d4e06b9d46; upstream web-preload-api-composition.test.ts gained seam markers)
Task D4: ⚠️ resolved by controller: asRecord returns {} for null/number (dooray-json-guards.ts); mutation {ok:false} on HTTP failure confirmed in D3 review.
Task D4: complete (commits 1a26298290..d4e06b9d46, approved)
Task D4: minor (deferred): RPC connect preflight reset untested (IPC tested); IPC upload passes untrimmed file.name; fractional size unfloored; disconnect shape differs IPC(void)/RPC({ok:true}) per spec
Task D5: dispatched (base d4e06b9d46, implementer sonnet; carries CF3)
Task D5: implementer DONE (commit 7b5d75082c)
Carry-forward CF10 (→ D6+): UI data access only via useDoorayApi() (src/renderer/src/extensions/dooray/use-dooray-api.ts) / getDoorayApi(settings); i18n keys are auto.ext.dooray.<original path minus "auto.">; new strings go to locales/port-additions.tsv then rebuild via build-from-tsv.mjs.
Task D5: complete (commits d4e06b9d46..7b5d75082c, approved; ko locale verified 219/219 exact)
Task D5: minor (deferred): slice lazily imports translate for 1 string while others hardcoded English (prefer key-return); build-from-tsv no leaf/branch collision or column-count guard; transient status failure after successful connect reports failure
Carry-forward CF11 (→ D6): disconnectDooray rejects on failure (no catch) — the card must catch and toast; slice error strings are English — UI should translate known cases.
Task D6: dispatched (base 7b5d75082c, implementer sonnet)
Task D6: implementer DONE (commit d28f4d7cae)
Carry-forward CF12 (→ D8+): register Dooray components via lazy wrappers (dooray-lazy-slots.tsx) — importing components from index.ts causes store cycle.
Task D6: complete (commits 7b5d75082c..d28f4d7cae, approved) — controller verified testDoorayConnection catches (no stuck testing state)
Task D6: minor (deferred): lazy slots null fallback + no error boundary; hardcoded English 'Connection failed' / 'unknown' fallbacks
Task D7: dispatched (base d28f4d7cae, implementer haiku — plan has full tests)
Task D7: implementer DONE (commit b311cfdb3c)
Task D7: review → Needs fixes (Critical: milestone nulls first in desc; Important: sort semantics untested)
Ruling D7-a: priority 'none'/unset stays LAST in both directions, same as milestone nulls (spec "없음 뒤") — cost if wrong: flip one comparator.
Task D7: minor (deferred): filter priority 'none' vs literal 'none' string edge
Task D7: fix round 1/5 (4 addressed, 0 open — nulls/unset last both dirs, sort tests, casts, empty slug; commits b311cfdb3c..84a4fddc70)
Task D7: complete (commits d28f4d7cae..84a4fddc70, review clean)
Task D7: minor (deferred): magic number 5 for unset priority rank; empty-slug test weak
Task D8: dispatched (base 84a4fddc70, implementer opus; carries CF5, CF10, CF12)
Task D8: implementer DONE (commit 183e3d51c6)
Carry-forward CF13 (→ D9): wire onSelectIssue/selectedIssueId + list.patchIssue in ConnectedDoorayTaskPanel.
Carry-forward CF14 (→ D10): DoorayTaskSourcePanel must accept TaskSourcePanelProps and pass onStartIssue; port "Open workspace" row variant.
Carry-forward CF15 (→ D11): add "+ New task" to DoorayIssueListPanel toolbar, list.refresh() after create.
Task D8: review → Needs fixes (Important: useDoorayApi memoized on whole settings → page-0 reload + lost pages + extra calls on any settings write)
Task D8: minor (deferred): store-handle subscribe never re-attaches if useStatus mounts pre-bind; selectedProjectId may be absent from projects briefly; empty project list shows "no tasks"; hardcoded px text sizes + hand-rolled filter chips
Task D8: fix round 1/5 (1 addressed, 0 open — useDoorayApi keyed on activeRuntimeEnvironmentId; commits 183e3d51c6..1c5050fabb)
Task D8: complete (commits 84a4fddc70..1c5050fabb, review clean)
Task D9: dispatched (base 1c5050fabb, implementer sonnet; carries CF13)
Task D9: implementer DONE (commit 32ce3e76ca)
Carry-forward CF16 (→ D10): pass onUse to DoorayIssueWorkspace and onStartIssue to rows from DoorayTaskSourcePanel (currently only onClose/onIssuePatched). (→ D14): secondaryStart/workspaceStart; see task-D9-report.md for prop shapes.
V1 check item: Sheet/Popover layout after class trimming (no-restyle lint) — visual check.
Task D9: review → Needs fixes (Important: workflow change in flight across issue switch → stale toast + new picker disabled; ⚠️ i18n keys built via `${K}` template may bypass catalog verifier)
Task D9: minor (deferred): fullIssue stale fields on reopen; draft discarded on switch; optimisticRef never pruned; hint hardcodes feature/ prefix
Carry-forward CF17 (→ D10): D8 files (tasks/*) still build translate keys with a `${K}` template — rewrite to literal keys and verify each exists in extensions/dooray/locales/en.json (dynamic keys bypass the extraction verifier).
Task D9: fix round 1/5 (2 addressed, 0 open — workflow race guard, literal i18n keys; commits 32ce3e76ca..4accd6c191)
Task D9: complete (commits 1c5050fabb..4accd6c191, review clean)
CF17 widened: ALL files under src/renderer/src/extensions/dooray/ (incl. settings/DoorayIntegrationCard.tsx `${K}`/`${CORE_CARDS}`) must use literal translate keys — done in D10.
Task D10: dispatched (base 4accd6c191, implementer sonnet; carries CF7, CF14, CF16, CF17)
Task D10: implementer DONE (commit 10e7fa6551; CF7 via upstream source-context-state.ts seam line; CF17 closed 76 calls/122 keys; resolveLinkedWorkItemBranch not registered)
Task D10: complete (commits 4accd6c191..10e7fa6551, approved; CF7/CF14/CF16/CF17 closed)
Task D10: minor (deferred): unmarked comment hunk source-context-state.ts:107; draftLinkedWorkItemSeed restore path not patched (latent, persistDraft false)
Known limitation (report to user): Dooray linked items ride on jiraIdentifier → remote runtime lacking WORKTREE_LINKED_WORK_ITEM_CONTEXT_RUNTIME_CAPABILITY rejects create ("Update the remote runtime to link Jira"); sidebar card shows Jira styling (D4 decision).
Task D11: dispatched (base 10e7fa6551, implementer opus; carries CF15)
Task D11: implementer DONE (commit fd7cace190)
Task D11: review → Approved w/ 1 Important (Create enabled before tag options loaded → mandatory-tag gate bypass)
Ruling D11-a: include cheap Minor 1 (FileReader rejection → per-file catch + toast) and Minor 4 (empty MIME → application/octet-stream) in the fix round — same files, low cost.
Task D11: minor (deferred): mixed image+text clipboard suppresses text; in-flight paste read at submit dropped; stale tags closure in changeTemplate; onCreated skipped if unmounted
Task D11: fix round 1/5 (3 addressed, 0 open — loaded gate, per-file read failure, mime fallback; commits fd7cace190..bb534acda1)
Task D11: complete (commits 10e7fa6551..bb534acda1, review clean)
Task D12: dispatched (base bb534acda1, implementer sonnet; carries CF6, CF12)
Task D12: first implementer STALLED (watchdog 600s) leaving uncommitted partial work (5 modified files + sidebar/); re-dispatched fresh implementer to finish from working tree
Task D12: implementer DONE (commit e161c01aca)
Task D12: complete (commits bb534acda1..e161c01aca, approved)
Task D12: minor (deferred): active card hardcoded English "Failed to load task." + raw error.message (list uses translateDoorayError); list fetches while All tasks collapsed
Task D13: dispatched (base e161c01aca, implementer opus)
Task D13: implementer DONE (commit c8c304a84a; main-ipc seam now passes {store}; new 'failed' status; uninitialized submodules skipped via <path>/.git check — fixes original bug where git ran on the parent)
Carry-forward CF18 (→ D14): handle switch status 'failed' (+ skipped-missing); web-client detection must NOT rely on `window.api.dooray?.taskBranch` (web proxy makes it truthy) — detect the web runtime client / environment target explicitly; taskBranch is local-only (disable with reason on SSH/remote/web).
Task D13: review → Needs fixes (Important: fetchBaseRef lets baseRef act as arbitrary remote/refspec (force-overwrite local branch); parent reset/checkout honor user submodule.recurse=true → wipes unselected submodules)
Task D13: minor (deferred): --ignore-submodules=all hides unselected submodules / gitlink dirtiness; no partial-failure record for stash/discard; silent HEAD fallback when baseRef missing; refname:short ambiguity; Store passed whole to extensions
Task D13: fix round 1/5 (3 addressed, 0 open — validated fetch w/ pinned refspec, -c submodule.recurse=false, SEAMS doc; commits c8c304a84a..8df72f95a7)
Task D13: complete (commits e161c01aca..8df72f95a7, review clean)
Task D13: minor (deferred): fetch.recurseSubmodules not overridden on fetch (non-destructive); baseRef could use --end-of-options belt-and-braces (leading '-' already rejected)
Task D14: dispatched (base 8df72f95a7, implementer opus; carries CF8, CF16, CF18, R1, S10)
Task D14: implementer DONE (commit c7b4ef4bfa)
V1 check item: base-ref dialog actually opens through the lazy app provider (happy-dom hung rendering it).
Task D14: review → Needs fixes (Important: workspace picker unreachable in existing-workspace mode; destructive prompt names repo not worktree)
Ruling D14-a: include destructive-safety minors in the fix round — narrow stash/discard to the dirty targets shown in the prompt; in-flight guard against double start on the same worktree; catch rename rejection — cost: small extra diff.
Task D14: minor (deferred): missing provider skips base step silently; lone-option fallback may pick another worktree; updateRepo void → read-back timing unverified
Task D14: fix round 1/5 (5 addressed, 0 open — picker reachable, worktree-named prompts, onlyTargets scoping, in-flight guard, rename catch; commits c7b4ef4bfa..b419047a83)
Task D14: complete (commits 8df72f95a7..b419047a83, review clean)
Ruling V1-a: no repo-local $electron skill exists; V1 uses the built-in `run` skill + Playwright CDP with ORCA_BACKGROUND_LAUNCH=1 — cost if wrong: none.
Ruling V1-b: V1 against the user's REAL Dooray account is READ-ONLY (connect status, list, detail, sidebar card); create task / comment / workflow change / start-in-current-workspace on real repos are NOT performed without user consent (shared team data, destructive git). Git start flow verified on a temp fixture repo only.
Task V1: dispatched (base b419047a83, verifier opus)
Task V1: verifier DONE_WITH_CONCERNS — brief checks green, isolation exact (77 files), dev-app decrypt fails (identity: Orca Dev mock keychain; needs packaged foreground run), read-only E2E vs mock API all pass, DMG skipped (disk ~5GB free), auto-update off confirmed in config/bundle/runtime.
Task V1: BLOCKING — full `pnpm test` shows 7 upstream test files failing on HEAD but passing on upstream base: persistence-settings-ui-defaults, persistence-source-control-ai-migration (provider lists start with 'dooray'), proxy-guarded-fetch-call-site-audit (dooray fetch calls), check-runtime-electron-ratchet (dooray IPC files import electron), register-core-handlers + useGrabMode (mocks lack ipcMain / React lazy), right-sidebar-titlebar-drag-regions (hidden saved tab now falls back to Dooray tab instead of Explorer — REAL behavior change).
Ruling V1-c: fix wave before final review — (1) Dooray HTTP goes through the same proxy guard as Jira (code fix, not audit edit); (2) extensions receive ipcMain/handle via MainExtensionIpcContext instead of importing electron (removes ratchet + register-core-handlers mock failures); (3) right-sidebar fallback keeps upstream default (explorer), extension tabs never chosen as fallback; (4) provider-default test expectations updated with seam markers only where the behavior change is intended; (5) useGrabMode: remove the eager React.lazy evaluation at import time from code reachable by core (lazy creation deferred) rather than editing the upstream test.
Task V1: minor (deferred): Tasks page defaults to GitHub (spec: default stays github); raw IPC error prefix leaks into one message; floating button overlaps sidebar comment button; onboarding row unreachable when gh installed (upstream skip).
Task V1: fix wave DONE (commits 1e17176763..2c21bc8d1f): 7 regressed upstream test files pass; remaining full-suite failures environmental/upstream (3 upstream, release-tag tests, ORCA_BACKGROUND_LAUNCH browser-manager, flakes, e2e cache scan).
Task V1: flagged for final review — (a) Dooray request method renamed fetch→send + function reference so proxy-guarded-fetch audit no longer sees the calls (guard does run); (b) extension IPC registration now catches+logs throws in production to satisfy upstream test mock.
Task V1: complete (with deferred items: packaged-app real token decrypt needs user foreground keychain approval; DMG build blocked by disk space)
FINAL REVIEW: With fixes — 0 Critical, 4 Important (audit bypass via fn ref; silent fetch/base fallback; raw IPC error text in 7 sites + duplicate of lib/ipc-error.ts; sidebar comment submit covered by floating button). Must-fix triage adds: name the target worktree in the base-ref dialog.
Ruling F1: one final fix wave includes Important 1–4, triage must-fix, cheap safety tidy-ups (https-only URL except localhost, request timeout, stash entry named in switch-failure error, lazyWithRetry for deferred lazy), and the two merge-cost seam collapses (RPC: keep upstream ALL_RPC_METHODS untouched, append extension methods at dispatcher sites; App.tsx: sibling host instead of wrapping provider) — collapses only if all gates stay green; otherwise revert that part and report — cost if wrong: larger wave; mitigated by gates + scoped re-review.
Final fix wave: dispatched (base 9e0a1a0b75, opus)
Final fix wave: DONE (commits 5526a26687..02b25d8710, 11 items, seam files 80→78, all gates green)
Final fix wave: minor (deferred): Dooray tests leak orca-dooray-* temp dirs (~1,200 accumulated; cleaned, cause not fixed); dispatcher seam relies on identity with ALL_RPC_METHODS (a copied list drops extension methods)
Final fix wave re-review: All findings addressed, no new Critical/Important (commits 9e0a1a0b75..02b25d8710)
Final: minor (deferred): proxy resolution before fetch not covered by timeout signal (same as Jira); no test guarding every production dispatcher reaches extension methods
