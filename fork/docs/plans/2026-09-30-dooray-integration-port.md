# Dooray 연동 포팅 (모듈화) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Orca : Dooray Edition v0.2.2"(소스 없음, 번들에서 역재구성)의 두레이 연동을 포크(`noihaus/orca`)에 **격리된 확장 모듈**로 구현한다. 목표는 두 가지다. 첫째, upstream Orca 버전업 때 "upstream 머지 → 연결 지점 확인 → 끝"으로 끝나게 한다. 둘째, 포크 빌드의 자동 업데이트를 끈다.

**Architecture:** 3층으로 나눈다.
- **① 연결 지점(seam):** upstream 파일에 넣는 *범용* 확장 슬롯이다. 두레이라는 단어가 들어가지 않고, 한 번만 추가하며, 각 줄에 `// fork-seam: <name>` 마커를 단다.
- **② 설치 목록:** `installed-*-extensions.ts`, 레이어당 1파일이다. 설치할 확장을 배열로 등록한다.
- **③ 두레이 모듈:** 레이어별 `extensions/dooray/` 폴더다. upstream에는 없는 폴더라 머지 충돌이 구조적으로 불가능하다.

연결 지점의 목록과 마커 개수는 계약 테스트가 지킨다. 머지 과정에서 슬롯이 사라지면 테스트가 실패한다.

**Tech Stack:** Electron, TypeScript, React, zustand, zod(RPC), vitest(+happy-dom), shadcn/ui, i18next(`translate()`), pnpm.

**Spec:** [`fork/docs/specs/2026-09-30-dooray-port-reference.md`](../specs/2026-09-30-dooray-port-reference.md) (두레이 API 계약·타입·UI 동작, 원본 번들 위치)
**i18n 원본:** [`fork/docs/specs/2026-09-30-dooray-i18n.tsv`](../specs/2026-09-30-dooray-i18n.tsv)

## Global Constraints

- 범위: 두레이 연동과 자동 업데이트 off만 한다. PR 리뷰 제출, 서브모듈 diff, Git History 개편은 제외한다.
- **격리 규칙**
  - 두레이 코드는 아래 4개 폴더 밖에 두지 않는다. upstream 파일에는 `'dooray'`, `Dooray` 문자열을 쓰지 않는다.
    - `src/shared/extensions/dooray/`
    - `src/main/extensions/dooray/`
    - `src/preload/extensions/dooray/`
    - `src/renderer/src/extensions/dooray/`
  - 예외는 설치 목록 파일 `installed-*-extensions.ts`뿐이다.
- **연결 지점 규칙**
  - upstream 파일에 넣는 수정은 가능한 한 한 줄 import와 한 줄 호출(또는 spread)로 끝낸다.
  - 각 수정에는 `// fork-seam: <seam-name>` 마커를 붙인다.
  - 이름과 내용은 provider에 무관한 범용 개념으로 짓는다. 그래야 나중에 upstream PR로 올릴 수 있다.
- 작업 브랜치는 `feature/dooray-integration`(develop에서 분기)이다.
- 기존 사용자 자격증명은 포맷 그대로 읽는다(`~/.orca/dooray-account.json` v1, `~/.orca/dooray-token.enc`).
- 인증 헤더는 `Authorization: dooray-api <token>`이다.
- main의 HTTP는 `getMainHttpClient().fetch`로만 한다(`src/main/global-fetch-call-site-audit.test.ts`).
- 자격증명 헬퍼는 `src/main/integration-credential-file.ts`를 재사용한다.
- 파일명에 `helpers`, `utils`, `common`, `misc`를 쓰지 않는다. `max-lines` disable을 금지한다. 주석은 WHY만, 1줄로 쓴다.
- UI는 `docs/STYLEGUIDE.md`, `main.css` 토큰, `components/ui/` primitive를 따른다. 원본의 하드코딩 색은 토큰으로 대체한다.
- 단축키 라벨은 플랫폼별로 분기한다(`⌘V` / `Ctrl+V`).
- 원격 호환성: 새 RPC 메서드를 받은 구 서버가 `method_not_found`를 내면 "원격 미지원"으로 degrade한다.
- 폴더 워크스페이스에서도 사이드바 두레이 탭이 보여야 한다. 브랜치 전환은 git 워크트리에서만 한다.
- SSH: `taskBranch`는 로컬 전용이다. SSH 워크스페이스에서는 비활성화하고 사유를 표시한다.
- Git 2.25 기준선(`docs/reference/git-compatibility.md`)을 지킨다. 자식 프로세스는 `src/shared/child-process/`를 통해서만 띄운다.
- 검증 명령: `pnpm tc`, `pnpm test <file>`, `pnpm run check:code-quality:changed`, `pnpm verify:localization-catalog`, `pnpm test src/shared/extensions/fork-seams.test.ts`.

## Decisions

| # | 결정 | 이유 |
|---|---|---|
| D1 | Orca 플러그인 시스템 대신 **내장 확장 모듈 + 범용 연결 지점** | 플러그인 API는 실험 단계라 panel↔worker 통신, 작업 탭, 워크트리 API가 없고 UI가 iframe이다(사용자 선택 B) |
| D2 | Jira 탭 유지. 두레이는 확장 소스로 맨 앞에 추가 | upstream diff 최소화 |
| D3 | 온보딩은 IntegrationsStep 슬롯에 두레이 행만 추가(전용 단계 추가 안 함) | 온보딩 버전·remap은 충돌 핫스팟이다 |
| D4 | linked work item에 범용 `branchNameOverride?: string` 필드를 추가하고 identifier는 `jiraIdentifier`를 재사용 | provider union 확장은 약 60개 파일과 wire 문제를 건드린다. 후속 과제로 남긴다 |
| D5 | 저장소별 두레이 설정은 범용 `Repo.extensionSettings?: Record<string, unknown>`의 `dooray` 키에 둔다 | Repo 스키마에 두레이 필드를 직접 넣지 않기 위해 |
| D6 | 자동 업데이트는 기본 off, `ORCA_ENABLE_AUTO_UPDATE=1`일 때만 on. publish 대상은 포크 저장소 | 원본과 같은 방식. 켜더라도 upstream 릴리스가 두레이 기능을 덮어쓰지 않게 하기 위해 |
| D7 | 경로 세그먼트에 `encodeURIComponent` 적용, RPC repo 스키마 버그(`submodulePaths` strip) 수정 | 원본 버그 |
| D8 | Orca 플러그인 기능이 정식화되면 플러그인으로 전환한다. 그때까지 두레이 모듈은 전환하기 쉬운 구조로 짓는다 | "향후 계획" 섹션의 조건 P1~P9와 설계 원칙 참고 |

## Review Focus

1. **upstream 머지 후 연결 지점 유실:** 슬롯 줄이 충돌 해결 중 사라지면 두레이가 조용히 사라진다. 계약 테스트가 실패해야 한다. 담당은 Task S12.
2. **한글 프로젝트 코드**(`dooray-통합`/`dooray-결재`) 매칭. 담당은 Task D7.
3. **v0.2.2 사용자 자격증명 파일**(평문 폴백 포함)을 재연결 없이 읽는지. 담당은 Task D1.
4. **필수 태그 그룹 미선택**이면 생성이 잠기는지. 담당은 Task D7, D11.
5. **자동 업데이트 off 빌드에서 메뉴 "업데이트 확인"을 눌렀을 때** 멈춤이나 무한 스피너 없이 "최신"으로 응답하는지. 담당은 Task U1.

## 디렉터리 구조

```
src/shared/extensions/
  extension-task-sources.ts          (seam) ExtensionTaskProvider 타입·메타 레지스트리 계약
  installed-extension-manifest.ts    설치 목록: 확장 task provider id, credential service 이름
  fork-seams.ts                      연결 지점 목록(이름·파일) — 계약 테스트 입력
  fork-seams.test.ts                 계약 테스트
  dooray/dooray-types.ts
src/main/extensions/
  main-extension-contract.ts         type MainExtension
  installed-main-extensions.ts       [doorayMainExtension]
  fork-build.ts                      FORK_AUTO_UPDATE_ENABLED
  dooray/…                           API·자격증명·IPC·RPC·taskBranch
src/preload/extensions/
  preload-extension-contract.ts
  installed-preload-extensions.ts
  dooray/…
src/renderer/src/extensions/
  renderer-extension-contract.ts     type RendererExtension (slots)
  installed-renderer-extensions.ts   [doorayRendererExtension]
  extension-slot-hooks.ts            useExtensionTaskSource(id) 등 슬롯 소비 헬퍼
  dooray/…                           client·slice·컴포넌트·i18n
fork/SEAMS.md                   연결 지점 설명 + 버전업 절차
```

### 확장 계약 (Task S1~S11이 만들고 D-Task가 채운다)

```ts
// src/shared/extensions/extension-task-sources.ts
export type ExtensionTaskProviderMeta = {
  id: string                      // 'dooray'
  defaultVisible: boolean         // 최초 1회 visibleTaskProviders 앞에 seed
  alwaysAvailable: boolean        // 미연결이어도 탭 표시(연결 CTA 용)
}

// src/main/extensions/main-extension-contract.ts
export type MainExtension = {
  id: string
  registerIpcHandlers(): void
  rpcMethods: readonly RpcMethodDefinition[]          // 포크의 defineMethod 결과 타입
  runtimeCommands?: { prefix: string; create(runtime: OrcaRuntime): Record<string, (...a: never[]) => unknown> }
}

// src/preload/extensions/preload-extension-contract.ts
export type PreloadExtension<K extends string = string, A = unknown> = { key: K; api: A }

// src/renderer/src/extensions/renderer-extension-contract.ts
export type RendererExtension = {
  id: string
  createSlice?: StateCreator<AppState, [], [], object>
  taskSource?: {
    providerId: string
    label: () => string
    Icon: ComponentType<{ className?: string; size?: number }>
    useStatus(): { ready: boolean; connected: boolean }
    ensureStatus(): void
    Panel: ComponentType<TaskSourcePanelProps>        // 연결 CTA 포함, 전체 본문 담당
    navShortcutLabel: () => string
  }
  rightSidebarTabs?: { id: string; title: () => string; Icon: ComponentType<{ className?: string; size?: number }>; Panel: LazyExoticComponent<ComponentType> }[]
  integrationCards?: ComponentType[]
  repositorySettingsSections?: ComponentType<RepositorySettingsSectionProps>[]
  onboardingIntegrationRows?: ComponentType[]
  appSurfaces?: ComponentType[]   // (was appProviders; collapsed to sibling surfaces in the final review)
  resolveLinkedWorkItemBranch?: (item: LinkedWorkItemSummary) => string | null
  locales?: Partial<Record<'en' | 'ko' | 'ja' | 'zh' | 'es', () => Promise<Record<string, unknown>>>>
}
```
정확한 import 타입명(`AppState`, `RpcMethodDefinition`, `LinkedWorkItemSummary` 등)은 각 Task에서 포크의 실제 이름에 맞춘다. 계약의 **필드 이름은 바꾸지 않는다.**

---

## Task 0: 브랜치 + 원본 레퍼런스

- [ ] **Step 1:** `git switch develop && git pull --ff-only && git switch -c feature/dooray-integration`
- [ ] **Step 2:** Spec §0 스크립트로 `~/orca-dooray-edition-ref/`에 원본 번들을 재추출한다(저장소에 커밋하지 않음).
- [ ] **Step 3:** `pnpm install && pnpm tc`로 베이스라인이 깨끗한지 확인한다.
- [ ] **Step 4:** upstream 원격을 추가한다. `git remote add upstream https://github.com/stablyai/orca.git && git fetch upstream main`
- [ ] **Step 5:** 문서를 커밋한다.
```bash
git add fork/docs
git commit -m "docs(dooray): port reference and modular integration plan"
```

---

# Phase U — 자동 업데이트 off

## Task U1: 포크 빌드 자동 업데이트 차단

**Files:**
- Create: `src/main/extensions/fork-build.ts`
- Modify: `src/main/updater.ts` (facade; `setupAutoUpdater`, `checkForUpdates`, `checkForUpdatesFromMenu`, `downloadUpdate`, `quitAndInstall` 진입부에 가드) — `// fork-seam: auto-update-gate`
- Modify: `config/electron-builder.config.cjs:620` `publish` → `{ provider: 'github', owner: 'noihaus', repo: 'orca', releaseType: 'release' }` — `// fork-seam: publish-target`
- Test: `src/main/updater.fork-disabled.test.ts` (기존 `updater-test-harness.ts` / `updater-test-module-loader.ts` 사용)

**Interfaces:**
- Produces: `export const FORK_AUTO_UPDATE_ENABLED: boolean` (`process.env.ORCA_ENABLE_AUTO_UPDATE === '1'`, 모듈 로드 시 1회 평가)

- [ ] **Step 1: 실패 테스트**

```ts
it('does not set up the auto updater or schedule checks when disabled', async () => {
  delete process.env.ORCA_ENABLE_AUTO_UPDATE
  const { updater, autoUpdaterMock } = await loadUpdaterForTest({ packaged: true })
  updater.setupAutoUpdater(fakeWindow)
  updater.checkForUpdates()
  updater.downloadUpdate()
  expect(autoUpdaterMock.checkForUpdates).not.toHaveBeenCalled()
  expect(autoUpdaterMock.downloadUpdate).not.toHaveBeenCalled()
})

it('menu check answers not-available instead of hanging (review focus)', async () => {
  const { updater, sentStatuses } = await loadUpdaterForTest({ packaged: true })
  updater.checkForUpdatesFromMenu()
  expect(sentStatuses.at(-1)).toMatchObject({ state: 'not-available', userInitiated: true })
})

it('ORCA_ENABLE_AUTO_UPDATE=1 restores upstream behavior', async () => { /* 기존 경로 호출 확인 */ })
```
`loadUpdaterForTest`는 기존 harness 이름에 맞춘다. 기존 updater 테스트들은 on 경로를 전제하므로, harness가 `ORCA_ENABLE_AUTO_UPDATE=1`을 기본 주입하게 한다.

- [ ] **Step 2:** `pnpm test src/main/updater.fork-disabled.test.ts`를 실행해 FAIL을 확인한다.
- [ ] **Step 3: 구현.**
  - facade의 각 함수 첫 줄에 `if (!FORK_AUTO_UPDATE_ENABLED) { … return }`을 넣는다.
  - 메뉴 확인 경로에서는 기존 상태 송신 함수로 `{ state: 'not-available', userInitiated: true }`를 보낸다.
  - `getUpdateStatus()`는 idle을 유지한다.
  - `publish` 변경 시 `devChannelRepo` 분기는 제거하지 말고 owner만 교체한다.
- [ ] **Step 4:** `pnpm test src/main/updater && pnpm tc:node`를 실행해 전부 PASS를 확인한다. 기존 updater 테스트도 포함한다.
- [ ] **Step 5:** `git commit -m "feat(fork): disable auto-update by default and point publish at the fork"`

---

# Phase S — 범용 연결 지점 (두레이 무관)

> 각 Task는 **테스트 전용 가짜 확장**(`fake-extension.fixture.ts`)으로 슬롯 동작을 검증한다. 두레이 코드는 Phase D에서 들어온다.
> 모든 upstream 수정 줄에 `// fork-seam: <name>` 마커를 달고, `src/shared/extensions/fork-seams.ts`에 `{ name, file }`를 추가한다(S12가 검증).

## Task S1: 확장 task provider (shared + main 설정)

**Files:**
- Create: `src/shared/extensions/extension-task-sources.ts`, `src/shared/extensions/installed-extension-manifest.ts`
- Modify (seam `task-provider-registry`):
  - `src/shared/task-providers.ts`: union `| ExtensionTaskProvider`, `TASK_PROVIDERS = [...EXTENSION_TASK_PROVIDER_IDS, ...BUILTIN]`, `isTaskProviderAvailable`에서 `alwaysAvailable` 확장이면 true
  - `Record<TaskProvider, …>`를 쓰는 4곳 — `src/shared/task-provider-identity.ts`, `src/renderer/src/components/use-task-page-source-summary.ts`, `settings/task-source-setup-state.ts`, `settings/use-task-source-provider-readiness.ts` — 에서 확장 기본값을 spread로 채운다(`...extensionTaskProviderDefaults(value)`)
  - `src/main/runtime/rpc/methods/automation-schemas.ts:71`: 하드 enum을 `z.enum([...BUILTIN, ...EXTENSION_TASK_PROVIDER_IDS])`로
- Modify (seam `integration-credential-service`): `src/shared/integration-credential-errors.ts`에 union `| ExtensionCredentialService`를 추가하고, 판정은 `INSTALLED_CREDENTIAL_SERVICES` 순회로 한다.
- Modify (seam `extension-provider-seeding`):
  - `src/shared/global-settings-types.ts`에 `seededExtensionTaskProviders?: string[]`을 추가한다.
  - `default-global-settings.ts`, `src/main/persistence/loading-store/prepare-loaded-profile-settings.ts`도 수정한다. Jira 마이그레이션과 같은 방식이지만 범용으로, `defaultVisible`인데 아직 seed되지 않은 확장 id를 맨 앞에 넣고 seed 목록에 기록한다.
- Test: `src/shared/extensions/extension-task-sources.test.ts`, 기존 `task-providers.test.ts`, 설정 로딩 테스트

**Interfaces:**
- Produces:
  - `type ExtensionTaskProvider = (typeof EXTENSION_TASK_PROVIDER_IDS)[number]`
  - `EXTENSION_TASK_PROVIDERS: readonly ExtensionTaskProviderMeta[]`
  - `EXTENSION_TASK_PROVIDER_IDS`
  - `isExtensionTaskProvider(p): p is ExtensionTaskProvider`
  - `type ExtensionCredentialService`
  - `INSTALLED_CREDENTIAL_SERVICES`
- `installed-extension-manifest.ts`의 최종 내용(D0에서 채움): `[{ id: 'dooray', defaultVisible: true, alwaysAvailable: true }]`, credential `['Dooray']`. 이 Task에서는 `as const` 빈 배열로 시작하고, 테스트는 manifest를 mock한 fixture로 한다.

- [ ] **Step 1: 실패 테스트**
```ts
it('prepends a defaultVisible extension provider once and records the seed', () => {
  const out = prepareLoadedProfileSettings({ visibleTaskProviders: ['github'], seededExtensionTaskProviders: [] }, { extensions: [{ id: 'fake', defaultVisible: true, alwaysAvailable: true }] })
  expect(out.visibleTaskProviders).toEqual(['fake', 'github'])
  expect(out.seededExtensionTaskProviders).toEqual(['fake'])
})
it('does not re-add an extension the user hid after seeding', () => { /* seeded:['fake'], visible:['github'] → 그대로 */ })
it('alwaysAvailable extension is available while disconnected', () => { /* ... */ })
```
`prepareLoadedProfileSettings`가 확장 목록을 주입받을 수 있도록 선택 인자를 추가한다. 기본값은 설치 manifest다.
- [ ] **Step 2:** FAIL 확인
- [ ] **Step 3:** 구현 (seam 마커 포함)
- [ ] **Step 4:** `pnpm test src/shared src/main/persistence/loading-store && pnpm tc` PASS
- [ ] **Step 5:** `git commit -m "feat(fork-seam): extension task provider registry"`

## Task S2: main 확장 등록 (IPC + RPC + runtime commands)

**Files:**
- Create: `src/main/extensions/main-extension-contract.ts`, `installed-main-extensions.ts`(빈 배열), `register-main-extensions.ts`(`registerMainExtensionIpc()`, `getMainExtensionRpcMethods()`, `bindMainExtensionRuntimeCommands(runtime)`)
- Modify (seam `main-ipc`): `src/main/ipc/register-core-handlers/register-core-handlers.ts`에서 Jira 등록 다음 줄에 `registerMainExtensionIpc()`를 호출한다.
- Modify (seam `runtime-rpc-methods`): `src/main/runtime/rpc/methods/index.ts`에 `...getMainExtensionRpcMethods()`를 spread한다.
- Modify (seam `runtime-commands`): `src/main/runtime/runtime-edge-command-controller.ts`의 prefix 바인딩 표에 확장 커맨드를 합류시킨다.
- Test: `src/main/extensions/register-main-extensions.test.ts`

- [ ] **Step 1: 실패 테스트** — fixture 확장 하나를 주입해 확인한다: IPC 채널 `fake:ping`이 등록되는지, RPC 메서드 `fake.ping`이 목록에 있고 호출되는지, runtime 커맨드가 `runtime.fakePing`으로 바인딩되는지.
- [ ] **Step 2~4:** FAIL 확인 → 구현 → `pnpm test src/main/extensions && pnpm tc:node` PASS
- [ ] **Step 5:** `git commit -m "feat(fork-seam): main-process extension registration"`

## Task S3: preload 확장 API

**Files:**
- Create: `src/preload/extensions/preload-extension-contract.ts`, `installed-preload-extensions.ts`
- Modify (seam `preload-api`): `src/preload/index.ts`의 api 객체에 `...installedPreloadExtensionApis()`를 spread한다. `src/preload/api-types.ts`에 `& InstalledPreloadExtensionApis`를 추가한다(타입은 설치 목록에서 mapped type으로 도출).
- Modify (seam `web-preload-api`): `src/renderer/src/web/web-preload-api.ts`에서, 확장이 원하면 `createRuntimeNamespaceApi(key)`로 원격 경로를 제공한다. 그다음 `web-preload-api-composition.test.ts`의 키 목록 검사를 통과시킨다.
- Test: preload 타입 테스트(`expectTypeOf`), web composition 테스트

- [ ] **Step 1~4:** fixture 확장 `{ key: 'fake', api: { ping(): Promise<string> } }`를 넣었을 때 `window.api.fake.ping`이 타입과 런타임 양쪽에서 노출되는지 확인한다 → 구현 → PASS
- [ ] **Step 5:** `git commit -m "feat(fork-seam): preload extension APIs"`

## Task S4: renderer 확장 레지스트리 + store slice + locales

**Files:**
- Create: `src/renderer/src/extensions/renderer-extension-contract.ts`, `installed-renderer-extensions.ts`, `extension-slot-hooks.ts`
- Modify (seam `store-slices`): `src/renderer/src/store/index.ts`는 `...createExtensionSlices(...args)`, `store/types.ts`는 `& ExtensionSlices`
- Modify (seam `i18n-extension-bundles`): i18n 초기화 모듈(`src/renderer/src/i18n/`)에서 locale을 로드할 때 `ext.locales[locale]`을 `addResourceBundle(locale, <ns>, bundle, true, false)`로 합친다.
- Modify (seam `localization-scripts`): `config/scripts/` 아래의 catalog, extraction, coverage 검증 스크립트가 `src/renderer/src/extensions/*/locales/*.json`도 카탈로그로 인식하게 한다.
- Test: `extensions/renderer-extension-registry.test.ts`, 로컬라이제이션 스크립트 fixture 테스트

- [ ] **Step 1: 실패 테스트** — fixture 확장의 slice 상태를 store에서 읽을 수 있는지, `ko` 번들을 로드하면 `translate('auto.ext.fake.hello','Hello')`가 ko 문자열을 반환하는지 확인한다. 검증 스크립트는 extensions locale 키를 누락 키로 보고하지 않아야 한다.
- [ ] **Step 2~4:** FAIL → 구현 → `pnpm test … && pnpm verify:localization-catalog && pnpm tc:web` PASS
- [ ] **Step 5:** `git commit -m "feat(fork-seam): renderer extension registry, slices and locale bundles"`

## Task S5: 작업 탭 확장 소스 슬롯

**Files (seam `task-page-source`):**
- `src/renderer/src/components/task-page-localized-options.tsx:114-135`: `getSourceOptions()` 앞에 확장 `taskSource`의 `{id, label, Icon}`을 추가
- `use-task-page-source-availability.ts`, `task-source-context-summary.ts`, `task-page-list-chrome-visibility.ts`, `use-task-page-provider-metadata.ts`: `isExtensionTaskProvider(source)`이면 확장 메타로 분기(account-backed, `accountLabel: null`, chrome 숨김 없음)
- `components/task-page/TaskPage.tsx`: `isExtensionTaskProvider(taskSource)`이면 본문 전체를 `<ExtensionTaskSourcePanel providerId=… onStartNewWorkspace startRepo/>`로 렌더. 마운트 시 `ensureStatus()`
- `components/task-page/SourceBar.tsx`: 확장 소스는 provider scope picker 없음
- `components/sidebar/SidebarTaskNavButton.tsx`: 확장 소스별 바로가기
- `components/settings/TasksPane.tsx:81-91`: 확장 소스를 옵션 목록에 추가
- `src/renderer/src/store/slices/ui/ui-slice-task-actions.ts:112`, `new-workspace/use-smart-workspace-field-availability.ts:86`: 확장 가용성 반영
- Create: `src/renderer/src/extensions/ExtensionTaskSourcePanel.tsx`
- Test: `extensions/task-source-slot.test.tsx`(happy-dom)

**Interfaces:**
- Produces: `TaskSourcePanelProps = { onStartNewWorkspace(item: LinkedWorkItemSummary, prefilledName: string): void; startRepo: Repo | null }`. `onStartNewWorkspace`는 TaskPage가 `openModal('new-workspace-composer', { linkedWorkItem, prefilledName, telemetrySource: 'sidebar' })`로 연결한다.

- [ ] **Step 1: 실패 테스트** — fixture taskSource로 확인한다: 탭이 첫 번째로 표시되는지, 선택하면 fixture Panel이 렌더되는지, `onStartNewWorkspace`가 composer를 여는지, 사이드바 바로가기가 있는지.
- [ ] **Step 2~4:** FAIL → 구현 → PASS + `pnpm tc`
- [ ] **Step 5:** `$electron` 스킬로 fixture 탭이 실제로 렌더되는지 스모크 확인한 뒤 fixture는 테스트 전용으로 남긴다.
- [ ] **Step 6:** `git commit -m "feat(fork-seam): extension task sources on the tasks page"`

## Task S6: 우측 사이드바 확장 탭 (`ext:<id>`)

**Files (seam `right-sidebar-extension-tab`):**
1. `src/shared/ui-chrome-types.ts:88-99`: `RightSidebarTab`에 `` `ext:${string}` ``를 추가하고 `isExtensionTabKey`를 둔다(플러그인 탭 `plugin:` 패턴과 같은 방식).
2. `right-sidebar/use-right-sidebar-activity-items.ts`: 확장 탭을 **맨 앞에** 둔다(`gitOnly` 없음).
3. `right-sidebar/right-sidebar-panel-content.tsx`: `ext:` 키면 확장 `Panel`(lazy)을 렌더한다.
4. `src/renderer/src/store/right-sidebar-route.ts`
5. `src/main/persistence/applying-settings/ui-selection-normalization.ts`: 설치된 확장 탭 키는 유지하고, 미설치 키는 기본 탭으로 되돌린다.
6. `src/main/runtime/rpc/methods/client-ui-schemas.ts`: `ext:` 접두사를 허용한다.
- `store/slices/worktrees.ts`의 `pruneRightSidebarTabByWorktree`에서 folder 워크스페이스일 때 확장 탭이 제거되지 않게 한다.
- Test: normalization 테스트, activity items 테스트

- [ ] **Step 1: 실패 테스트**
```ts
expect(normalizeRightSidebarTab('ext:fake/tasks')).toBe('ext:fake/tasks')            // 설치됨
expect(normalizeRightSidebarTab('ext:gone/tasks')).toBe(DEFAULT_RIGHT_SIDEBAR_TAB)    // 미설치
```
확장 탭이 folder 워크스페이스에서도 활동 목록에 나오는지도 테스트한다.
- [ ] **Step 2~4:** FAIL → 구현 → PASS
- [ ] **Step 5:** `git commit -m "feat(fork-seam): extension right sidebar tabs"`

## Task S7: 설정·온보딩·앱 루트 슬롯

**Files:**
- (seam `integration-cards`) `settings/IntegrationsPane.tsx:39-55`: Task providers 그룹 맨 앞에 `installed.integrationCards`를 렌더한다. `settings/use-integration-provider-status-refresh.ts`에서는 확장 `taskSource.ensureStatus()`를 호출한다. `feature-wall/use-integration-connection-status.ts`는 확장 상태를 optional fact로 합친다.
- (seam `repository-settings-sections`) `settings/RepositoryPane.tsx`: `RepositoryWorktreeDefaultsSection` 다음에 `installed.repositorySettingsSections`를 렌더한다(`{repo, updateRepo, forceVisible}`).
- (seam `onboarding-integration-rows`) `onboarding/IntegrationsStep.tsx:227-265`: `GitHubRow` 위에 확장 행을 렌더한다.
- (seam `app-surfaces`, 원래 `app-providers`) `App.tsx`: `LinkRoutingPreferenceDialogProvider` 안쪽 끝에 `<ExtensionAppSurfaces />` 한 줄을 둔다.
- Test: 각 슬롯 렌더 테스트(fixture)

- [ ] **Step 1~4:** 실패 테스트 → 구현 → PASS
- [ ] **Step 5:** `git commit -m "feat(fork-seam): settings, onboarding and app provider slots"`

## Task S8: linked work item 브랜치 override

**Files (seam `linked-work-item-branch`):**
- `LinkedWorkItemSummary`(`lib/new-workspace.ts`, `store/slices/ui.ts`)와 draft 직렬화(`shared/new-workspace/workspace-source.ts`, 직렬화하는 경우)에 optional `branchNameOverride?: string`을 추가한다.
- `src/renderer/src/hooks/useComposerState.ts`: `getLinearLinkedWorkItemBranchName(seed) ?? resolveExtensionLinkedWorkItemBranch(seed)`. 초기값, repo 변경 시 보존, 연결 해제 시 override 해제, 이렇게 3곳이다.
- `resolveExtensionLinkedWorkItemBranch` = `item.branchNameOverride ?? 첫 번째 확장 resolver 결과 ?? null`
- Test: `useComposerState` 기존 테스트에 케이스 추가

- [ ] **Step 1: 실패 테스트** — `branchNameOverride: 'feature/X/1'`인 seed를 넣으면 composer의 branch가 **슬러그 없이** 그대로 나와야 한다. 연결을 해제하면 override가 사라져야 한다.
- [ ] **Step 2~4:** FAIL → 구현 → PASS
- [ ] **Step 5:** `git commit -m "feat(fork-seam): exact branch override for linked work items"`

## Task S9: 저장소 확장 설정

**Files (seam `repo-extension-settings`):**
- `Repo` 타입에 `extensionSettings?: Record<string, unknown>`을 추가한다.
- `src/main/runtime/rpc/methods/repo-update-schema.ts`: `z.record(z.string(), z.unknown()).optional()`
- `src/main/ipc/repos.ts`: plain object인지 검증하고, 깊이와 크기(예: 16KB)를 제한한다.
- repo 영속화 경로(`persistence`의 tracking repos)에서 이 필드를 보존한다.
- Test: `persistence-update-repo.test.ts`에 케이스 추가, 스키마 테스트

- [ ] **Step 1~4:** `updateRepo(id, { extensionSettings: { fake: { a: 1 } } })`로 저장하고, 재로드 후에도 보존되는지 확인한다. 16KB를 넘으면 거부해야 한다. 실패 테스트 → 구현 → PASS
- [ ] **Step 5:** `git commit -m "feat(fork-seam): per-repo extension settings"`

## Task S10: 확인 다이얼로그 대체 액션

**Files (seam `confirmation-alternate-action`):** `src/renderer/src/components/confirmation-dialog.tsx`
- 옵션 `alternateLabel?`, `alternateVariant?`를 추가한다. 이 옵션을 준 호출만 `Promise<boolean | 'alternate'>`를 받는다(overload). 기존 호출부 타입은 불변이다.
- Test: 기존 테스트 + alternate 버튼 케이스

- [ ] **Step 1~4:** 실패 테스트 → 구현 → PASS (`pnpm tc`로 기존 호출부 무변경 확인)
- [ ] **Step 5:** `git commit -m "feat(fork-seam): alternate action in confirmation dialog"`

## Task S11: 연결 지점 계약 테스트 + 문서

**Files:**
- Create: `src/shared/extensions/fork-seams.ts`
```ts
// Why: upstream merges can silently drop a seam line; this list is what fork-seams.test.ts enforces.
export const FORK_SEAMS = [
  { name: 'auto-update-gate', file: 'src/main/updater.ts' },
  { name: 'publish-target', file: 'config/electron-builder.config.cjs' },
  { name: 'task-provider-registry', file: 'src/shared/task-providers.ts' },
  // … S1~S10에서 추가한 모든 {name, file}
] as const
```
- Create: `src/shared/extensions/fork-seams.test.ts`
  1. `FORK_SEAMS`의 각 파일에 `fork-seam: <name>` 마커가 존재해야 한다.
  2. 저장소 전체 마커의 집합이 `FORK_SEAMS`와 정확히 일치해야 한다(`rg`를 쓰지 말고 fs로 `src`와 `config`를 순회).
  3. 동작 검증: 설치 manifest의 각 확장에 대해, `TASK_PROVIDERS`에 들어 있는지, `normalizeRightSidebarTab`이 그 확장의 탭을 유지하는지, main RPC 메서드 목록에 들어 있는지.
  4. 격리 검증: `src/**`에서 `extensions/` 폴더와 `installed-*` 파일을 뺀 나머지에 `/dooray/i`가 없어야 한다.
- Create: `fork/SEAMS.md` — 연결 지점마다 목적과 파일을 적고, **버전업 절차**를 둔다.
```bash
git fetch upstream
git switch develop && git merge upstream/main      # 충돌은 fork-seam 줄만 남기고 upstream 쪽으로 해결
pnpm install && pnpm tc
pnpm test src/shared/extensions/fork-seams.test.ts # 실패 = 사라진 연결 지점, 메시지에 name/file 표시
pnpm test src/main/extensions src/renderer/src/extensions
```
- [ ] **Step 1~4:** 테스트 작성 → FAIL(마커가 빠진 곳 탐지) → 마커와 목록을 정리 → PASS
- [ ] **Step 5:** `git commit -m "test(fork-seam): seam contract test and upgrade runbook"`

---

# Phase D — 두레이 모듈 (연결 지점 위에 구현)

> 두레이 API·UI 세부는 이전 분석 그대로 **Spec 문서**를 기준으로 한다. 원본 대조는 `~/orca-dooray-edition-ref/`에서 함수명으로 grep한다.

## Task D0: 두레이 설치 등록 + 공유 타입

**Files:**
- Create: `src/shared/extensions/dooray/dooray-types.ts` (Spec §4, `RepoDoorayStart` 포함)
- Modify: `src/shared/extensions/installed-extension-manifest.ts` → `{ id: 'dooray', defaultVisible: true, alwaysAvailable: true }`, credential `'Dooray'`
- Test: `fork-seams.test.ts`가 dooray 기준으로 통과하는지

- [ ] **Step 1~4:** manifest 등록 → `pnpm tc` → S1과 S11 테스트 PASS
- [ ] **Step 5:** `git commit -m "feat(dooray): register Dooray extension manifest and shared types"`

## Task D1: URL 정규화 + 자격증명 저장소

**Files:** `src/main/extensions/dooray/dooray-url.ts`, `dooray-credential-store.ts` (+ `.test.ts`)

**Interfaces:**
- Produces:
  - `DEFAULT_DOORAY_API_URL`, `normalizeDoorayUrl`
  - `readDoorayAccount`, `writeDoorayAccount`, `readDoorayToken`, `saveDoorayToken`, `hasStoredDoorayToken`, `clearDoorayCredentials`, `getDoorayCredentialError`
  - `type DoorayAccountFile = { version: 1; apiUrl; webUrl: string | null; viewer }`

- [ ] **Step 1: 실패 테스트** (`src/main/jira/client.test.ts`의 `loadClientModule` 패턴: `vi.resetModules`, `setSecretStore`, `vi.doMock('os')` temp home)
```ts
it('normalizes', () => {
  expect(normalizeDoorayUrl(' nhnent.dooray.com/ ')).toBe('https://nhnent.dooray.com')
  expect(normalizeDoorayUrl('https://api.dooray.com/?x=1#h')).toBe('https://api.dooray.com')
  expect(() => normalizeDoorayUrl('http://')).toThrow()
})
it('reads a v0.2.2 account file and plaintext token without reconnecting (review focus)', async () => {
  writeFileSync(join(orcaDir, 'dooray-account.json'), JSON.stringify({ version: 1, apiUrl: 'https://api.dooray.com', webUrl: 'https://nhnent.dooray.com', viewer: { id: '1', name: 'Kim', userCode: 'kim', email: null } }))
  writeFileSync(join(orcaDir, 'dooray-token.enc'), 'tok-abc')
  const store = await loadStore({ encryptionAvailable: true, decryptString: () => { throw new Error('x') } })
  expect(store.readDoorayAccount()?.viewer.id).toBe('1')
  expect(store.readDoorayToken()).toBe('tok-abc')
})
it('rejects an account missing viewer.id', async () => { /* → null */ })
it('clear removes both files and caches', async () => { /* ... */ })
```
- [ ] **Step 2:** FAIL
- [ ] **Step 3: 구현**
  - `normalizeDoorayUrl`:
```ts
export function normalizeDoorayUrl(url: string): string {
  const trimmed = url.trim()
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const parsed = new URL(withScheme)
  if (!parsed.hostname) {
    throw new Error('Enter a valid Dooray URL.')
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, '')
  parsed.search = ''
  parsed.hash = ''
  return parsed.toString().replace(/\/$/, '')
}
```
  - 계정 파일은 `writeCredentialFileAtomic`으로 쓴다(JSON 2-space).
  - 토큰은 `writeEncryptedCredential('Dooray', …)`로 쓰고 `readStoredCredentialToken('Dooray', …)`로 읽는다. `CredentialDecryptionError`가 나면 메시지를 기록하고 다시 throw한다.
- [ ] **Step 4:** `pnpm test src/main/extensions/dooray` PASS
- [ ] **Step 5:** `git commit -m "feat(dooray): credential store compatible with Dooray Edition files"`

## Task D2: HTTP 계층 + connect/status/test/disconnect

**Files:** `src/main/extensions/dooray/dooray-request.ts`, `client.ts`, `dooray-test-harness.ts` (+ `client.test.ts`)

**Interfaces:**
- Produces:
  - `DoorayClient`, `DoorayApiError`, `doorayRequest<T>(client, path, init?)`, `withDoorayRequestSlot`(동시 4개)
  - `connectDooray`, `disconnectDooray`, `getDoorayStatus`, `testDoorayConnection`, `requireDoorayClient`, `toDoorayViewer`

- [ ] **Step 1: 실패 테스트**
```ts
it('connect probes /members/me with dooray-api auth, then persists', async () => {
  netFetchMock.mockResolvedValueOnce(jsonResponse({ header: { isSuccessful: true }, result: { id: 'm1', name: 'Kim', userCode: 'kim', externalEmailAddress: 'k@x.com' } }))
  const d = await loadClientModule()
  expect(await d.connectDooray({ apiToken: ' tok ', webUrl: 'nhnent.dooray.com' })).toEqual({ ok: true, viewer: { id: 'm1', name: 'Kim', userCode: 'kim', email: 'k@x.com' } })
  const [url, init] = netFetchMock.mock.calls[0]
  expect(url).toBe('https://api.dooray.com/common/v1/members/me')
  expect(new Headers(init.headers).get('Authorization')).toBe('dooray-api tok')
  expect(d.getDoorayStatus()).toMatchObject({ connected: true, webUrl: 'https://nhnent.dooray.com' })
})
it('empty token → error without network', async () => { /* 'API token is required.' */ })
it('isSuccessful:false surfaces resultMessage and stays disconnected', async () => { /* ... */ })
it('limits concurrency to 4', async () => { /* ... */ })
```
- [ ] **Step 2:** FAIL
- [ ] **Step 3: 구현** (핵심)
```ts
const MAX_CONCURRENT = 4
let active = 0
const waiters: (() => void)[] = []

export async function withDoorayRequestSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiters.push(resolve))
  }
  active += 1
  try {
    return await fn()
  } finally {
    active -= 1
    waiters.shift()?.()
  }
}

export async function doorayRequest<T>(client: DoorayClient, path: string, init?: RequestInit): Promise<DoorayEnvelope<T>> {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  if (!(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Authorization', client.authorization)
  return withDoorayRequestSlot(() =>
    withSpan('dooray.request', async () => {
      const response = await getMainHttpClient().fetch(`${client.apiUrl}${path}`, { ...init, headers })
      const body = (await response.json().catch(() => null)) as DoorayEnvelope<T> | null
      if (!response.ok) {
        throw new DoorayApiError(body?.header?.resultMessage || response.statusText || `Dooray request failed (${response.status})`, response.status)
      }
      if (body?.header?.isSuccessful === false) {
        throw new DoorayApiError(body.header.resultMessage || 'Dooray request failed', response.status)
      }
      return body ?? ({ result: null } as DoorayEnvelope<T>)
    }, { kind: 'client' })
  )
}
```
나머지 흐름은 Spec §3을 따른다.
- [ ] **Step 4:** `pnpm test src/main/extensions/dooray src/main/global-fetch-call-site-audit.test.ts` PASS
- [ ] **Step 5:** `git commit -m "feat(dooray): REST client with connect/status/test/disconnect"`

## Task D3: 업무·프로젝트 API + 매퍼

**Files:** `src/main/extensions/dooray/dooray-issue-mapping.ts`, `dooray-issue-queries.ts`, `dooray-project-queries.ts`, `dooray-issue-mutations.ts` (+ tests)

**Interfaces:**
- Produces:
  - 조회: `listDoorayProjects`, `listDoorayIssues`, `getDoorayIssue`, `getDoorayIssueByNumber`, `getDoorayIssueComments`, `listDoorayTags`, `listDoorayMilestones`, `listDoorayTemplates`, `getDoorayTemplate`, `listDoorayWorkflows`, `searchDoorayMembers`
  - 변경: `createDoorayIssue`, `addDoorayIssueComment`, `setDoorayWorkflow`, `uploadDoorayIssueFile`
  - 시그니처와 REST 계약은 Spec §2 표와 같다.

- [ ] **Step 1: 실패 테스트** — 필수 케이스
```ts
it('listIssues(assigned) sends open classes + viewer id, clamps size', async () => {
  netFetchMock.mockResolvedValueOnce(jsonResponse({ header: { isSuccessful: true }, result: [rawIssue], totalCount: 77 }))
  const res = await api.listDoorayIssues({ projectId: 'p1', size: 500 })
  const url = new URL(netFetchMock.mock.calls[0][0])
  expect(url.pathname).toBe('/project/v1/projects/p1/posts')
  expect(url.searchParams.get('size')).toBe('100')
  expect(url.searchParams.get('order')).toBe('-createdAt')
  expect(url.searchParams.get('postWorkflowClasses')).toBe('backlog,registered,working')
  expect(url.searchParams.get('toMemberIds')).toBe('m1')
  expect(res.totalCount).toBe(77)
})
it('listMilestones pages past 50 (review focus)', async () => {
  netFetchMock
    .mockResolvedValueOnce(jsonResponse({ header: { isSuccessful: true }, result: Array.from({ length: 50 }, (_, i) => rawMilestone(`m${i}`, 'closed')) }))
    .mockResolvedValueOnce(jsonResponse({ header: { isSuccessful: true }, result: [rawMilestone('open1', 'open')] }))
  const ms = await api.listDoorayMilestones({ projectId: 'p1' })
  expect(ms).toHaveLength(51)
  expect(ms.at(-1)).toMatchObject({ id: 'open1', status: 'open' })
})
it('createIssue omits empty users/tags/milestone and priority none', async () => {
  netFetchMock.mockResolvedValueOnce(jsonResponse({ header: { isSuccessful: true }, result: { id: 'new1' } }))
  await api.createDoorayIssue({ projectId: 'p1', subject: 'S', tagIds: [], toMemberIds: [' '], priority: 'none' })
  expect(JSON.parse(netFetchMock.mock.calls[0][1].body)).toEqual({ subject: 'S', body: { mimeType: 'text/x-markdown', content: '' } })
})
it('upload posts multipart without JSON content-type; empty file errors', async () => { /* ... */ })
it('encodes path segments', async () => { /* 'a/b' → a%2Fb */ })
it('taskNumber falls back to code/number; unknown workflow class → registered', () => { /* ... */ })
```
- [ ] **Step 2~4:** FAIL → Spec §2 규칙대로 구현 → PASS. list/get은 예외를 전파하고, mutation은 `{ok:false,error}`를 반환한다.
- [ ] **Step 5:** `git commit -m "feat(dooray): task, project, template, member and mutation APIs"`

## Task D4: 두레이 main 확장 (IPC + RPC + runtime)

**Files:**
- Create: `src/main/extensions/dooray/dooray-ipc.ts`, `dooray-rpc-methods.ts`, `dooray-runtime-commands.ts`, `index.ts` (`doorayMainExtension: MainExtension`)
- Modify: `src/main/extensions/installed-main-extensions.ts` → `[doorayMainExtension]`
- Create: `src/preload/extensions/dooray/dooray-api.ts`(타입), `dooray-bridge.ts`; Modify `installed-preload-extensions.ts` → `{ key: 'dooray', api: doorayApi }`
- Test: `dooray-ipc.test.ts`, `dooray-rpc-methods.test.ts`

**Interfaces:**
- Produces:
  - IPC `dooray:*` 19개와 RPC `dooray.*` 19개(Spec §2). `disconnect`는 RPC에서 `{ok:true}`를 반환한다.
  - `window.api.dooray.*`

- [ ] **Step 1: 실패 테스트**
```ts
it('returns benign defaults for invalid args', async () => {
  expect(await invoke('dooray:listIssues', { projectId: '' })).toEqual({ totalCount: 0, issues: [] })
  expect(await invoke('dooray:getIssueByNumber', { projectId: 'p', postNumber: -1 })).toBeNull()
  expect(await invoke('dooray:createIssue', { projectId: 'p', subject: ' ' })).toEqual({ ok: false, error: 'Subject is required.' })
})
it('RPC rejects non-positive postNumber and bad enums; trims ids', () => { /* ... */ })
it('connect/disconnect reset agent preflight cache', async () => { /* _resetPreflightCache */ })
```
- [ ] **Step 2~4:** FAIL → `src/main/ipc/jira.ts`, `rpc/methods/jira.ts`, `runtime-jira-commands.ts` 구조를 복제해 구현 → PASS
- [ ] **Step 5:** `git commit -m "feat(dooray): main extension with IPC, RPC and preload bridge"`

## Task D5: renderer runtime client + slice + 확장 등록 뼈대

**Files:**
- Create: `src/renderer/src/extensions/dooray/runtime-dooray-client.ts`, `dooray-slice.ts`, `index.ts` (`doorayRendererExtension`, 우선 `createSlice`와 `locales`만)
- Create: `src/renderer/src/extensions/dooray/locales/{en,ko,ja,zh,es}.json` — TSV를 **확장 전용 네임스페이스로 재키잉**해서 옮긴다(`auto.ext.dooray.<원래 경로>`). en은 en 열, ko는 ko 열, ja/zh/es는 en 복사본이다. 변환 스크립트는 `src/renderer/src/extensions/dooray/locales/build-from-tsv.mjs`에 커밋한다.
- Modify: `installed-renderer-extensions.ts` → `[doorayRendererExtension]`
- Test: `runtime-dooray-client.test.ts`, `dooray-slice.test.ts`

**Interfaces:**
- Produces:
  - 19개 `dooray<Op>(settings, args)`. 타임아웃은 status/disconnect/searchMembers 15s, upload 120s, 나머지 30s.
  - `DoorayRemoteUnsupportedError`
  - slice `doorayStatus`, `doorayStatusChecked`, `doorayStatusContextKey`, `checkDoorayConnection`, `connectDooray`, `testDoorayConnection`, `disconnectDooray`

- [ ] **Step 1: 실패 테스트** — 로컬은 IPC로, environment는 RPC로 가는지 확인한다. `method_not_found`는 `DoorayRemoteUnsupportedError`로 바뀌어야 한다. 오래된 context의 check 결과는 폐기해야 한다.
- [ ] **Step 2~4:** FAIL → `runtime-jira-client.ts`/`slices/jira.ts` 패턴으로 구현 → PASS + `pnpm verify:localization-catalog`
- [ ] **Step 5:** `git commit -m "feat(dooray): renderer client, slice and locale bundles"`

## Task D6: 연결 다이얼로그 · 아이콘 · 설정 카드 · 온보딩 행

**Files:** `extensions/dooray/DoorayIcon.tsx`, `DoorayConnectDialog.tsx`, `DoorayIntegrationCard.tsx`, `DoorayOnboardingRow.tsx`; `index.ts`에 `integrationCards`, `onboardingIntegrationRows` 등록
- Test: `DoorayIntegrationCard.test.tsx`, `DoorayConnectDialog.test.tsx`

- [ ] **Step 1: 실패 테스트** — 빈 URL은 undefined로 보내야 한다. 연결 중에는 닫히지 않아야 한다. 연결되면 viewer 이름이 보이고 Disconnect가 동작해야 한다. credentialError를 표시해야 한다. 온보딩 행에는 토큰 발급 버튼(`https://nhnent.dooray.com/setting/api/token`)이 있어야 한다.
- [ ] **Step 2~4:** FAIL → 구현(`jira-connect-dialog.tsx`, `jira-integration-card.tsx`, `IntegrationCardShell` 패턴) → PASS
- [ ] **Step 5:** `git commit -m "feat(dooray): connect dialog, settings card and onboarding row"`

## Task D7: 순수 로직 (매칭·정렬·태그)

**Files:** `extensions/dooray/lib/dooray-branch-matching.ts`, `dooray-issue-ordering.ts`, `dooray-tag-groups.ts` (+ tests)

**Interfaces:**
```ts
slugifyDoorayRef(value: string): string
getDoorayTaskBranchName(issue: Pick<DoorayIssue, 'taskNumber'>): string
findDoorayWorkspaceMatch<W extends { branch?: string; displayName?: string; isArchived?: boolean; lastActivityAt?: number }>(wts: W[], taskNumber: string): W | null
parseDoorayTaskFromBranch(branch: string | null | undefined, projects: DoorayProject[]): { project: DoorayProject; postNumber: number } | null
type DooraySortKey = 'number' | 'subject' | 'workflow' | 'milestone' | 'priority' | 'created' | 'updated'
doorayPriorityRank(p?: DoorayPriority): number
sortDoorayIssues(issues, key, dir): DoorayIssue[]
filterDoorayIssues(issues, f: { milestoneName?: string; workflowId?: string; priority?: DoorayPriority }): DoorayIssue[]
defaultDooraySortDirection(key): 'asc' | 'desc'
doorayServerOrder(key, dir): DoorayIssueOrder | undefined
groupDoorayTags(tags): { group: DoorayTagGroup | null; tags: DoorayTag[] }[]
missingMandatoryTagGroups(tags, selected): DoorayTagGroup[]
toggleDoorayTag(tags, selected, tagId): string[]
pruneSelectOneTagIds(tags, ids): string[]
```
워크트리 필드명은 포크의 실제 `Worktree` 타입에 맞춘다.

- [ ] **Step 1: 실패 테스트**
```ts
it('keeps Hangul so Korean project codes do not collapse (review focus)', () => {
  expect(slugifyDoorayRef('refs/heads/feature/dooray-통합/12')).toBe('feature-dooray-통합-12')
  const projects = [{ id: 'a', code: 'dooray' }, { id: 'b', code: 'dooray-통합' }, { id: 'c', code: 'dooray-결재' }]
  expect(parseDoorayTaskFromBranch('feature/dooray-결재/7', projects)).toEqual({ project: projects[2], postNumber: 7 })
  expect(parseDoorayTaskFromBranch('feature/dooray-통합/12', projects)?.project.id).toBe('b')
})
it('prefers the longest project code', () => {
  expect(parseDoorayTaskFromBranch('feature/dooray-D-TF/2619', [{ id: 'x', code: 'D' }, { id: 'y', code: 'dooray-D-TF' }])?.project.id).toBe('y')
})
it('matches workspaces by whole token, latest active, skipping archived', () => {
  const wts = [
    { branch: 'feature/dooray-D-TF/26190', lastActivityAt: 9 },
    { branch: 'feature/dooray-D-TF/2619', lastActivityAt: 1 },
    { displayName: 'dooray-D-TF/2619 fix', lastActivityAt: 5 },
    { branch: 'feature/dooray-D-TF/2619', isArchived: true, lastActivityAt: 99 }
  ]
  expect(findDoorayWorkspaceMatch(wts, 'dooray-D-TF/2619')).toBe(wts[2])
})
it('branch is verbatim', () => expect(getDoorayTaskBranchName({ taskNumber: 'dooray-D-TF/2619' })).toBe('feature/dooray-D-TF/2619'))
it('priority rank', () => expect(['lowest', undefined, 'highest', 'normal'].map((p) => doorayPriorityRank(p as never))).toEqual([4, 5, 0, 2]))
it('server order only for created/updated', () => {
  expect(doorayServerOrder('updated', 'asc')).toBe('updatedAt')
  expect(doorayServerOrder('created', 'desc')).toBe('-createdAt')
  expect(doorayServerOrder('priority', 'asc')).toBeUndefined()
})
describe('tags', () => {
  const type = { id: 'g1', name: 'Type', mandatory: true, selectOne: true }
  const tags = [{ id: 't1', name: 'Bug', tagGroup: type }, { id: 't2', name: 'Feature', tagGroup: type }, { id: 't3', name: 'misc' }]
  it('mandatory missing (review focus)', () => {
    expect(missingMandatoryTagGroups(tags, ['t3'])).toEqual([type])
    expect(missingMandatoryTagGroups(tags, ['t1'])).toEqual([])
  })
  it('selectOne radio', () => expect(toggleDoorayTag(tags, ['t1', 't3'], 't2')).toEqual(['t3', 't2']))
  it('prune template tags', () => expect(pruneSelectOneTagIds(tags, ['t1', 't2', 't3'])).toEqual(['t1', 't3']))
  it('ungrouped last', () => expect(groupDoorayTags(tags).map((g) => g.group?.id ?? null)).toEqual(['g1', null]))
})
```
- [ ] **Step 2~4:** FAIL → Spec §5 코드와 규칙대로 구현 → PASS
- [ ] **Step 5:** `git commit -m "feat(dooray): branch matching, ordering and tag group logic"`

## Task D8: 작업 탭 두레이 패널

**Files:** `extensions/dooray/tasks/use-dooray-issue-list.ts`, `DoorayIssueRow.tsx`, `DoorayPriorityIndicator.tsx`, `DooraySortControls.tsx`, `DoorayTaskSourcePanel.tsx`; `index.ts`에 `taskSource` 등록(`Panel` = `DoorayTaskSourcePanel`, 연결 CTA 포함)
- Test: `use-dooray-issue-list.test.ts`, `DoorayTaskSourcePanel.test.tsx`

**Interfaces:**
- `useDoorayIssueList({ withMilestones?: boolean })` 반환값: `{ projects, projectsLoading, projectsError, selectedProjectId, selectProject, filter, setFilter, sortKey, sortDir, sortBy, toggleSortDir, issues, rawIssues, totalCount, loading, error, canLoadMore, loadMore, refresh, milestones, workflows, milestoneFilter, setMilestoneFilter, workflowFilter, setWorkflowFilter, priorityFilter, setPriorityFilter, clientOnlySort, hasActiveClientFilter, patchIssue }`

- [ ] **Step 1: 실패 테스트**
  - 선택 프로젝트를 localStorage에 기억하는지. storage가 throw해도 동작해야 한다.
  - page 0은 목록을 교체하고, loadMore는 `floor(len/50)` 페이지를 이어 붙이는지. 늦게 온 응답은 폐기해야 한다.
  - 필터나 서버 정렬을 바꾸면 page 0으로 돌아가는지.
  - `clientOnlySort`와 힌트 플래그가 맞게 켜지는지.
  - `withMilestones`일 때만 단계·상태 목록을 로드하는지.
  - 미연결이면 연결 CTA와 "두레이 숨기기" 버튼이 나오는지.
- [ ] **Step 2~4:** FAIL → 구현(Spec §5 "목록 동작", 원본 `useDoorayIssueList`/`TaskPageDoorayPanel`) → PASS
- [ ] **Step 5:** `$electron`으로 확인한다: 작업 탭 첫 탭이 Dooray인지, 목록·필터·정렬·더 불러오기가 동작하는지.
- [ ] **Step 6:** `git commit -m "feat(dooray): Dooray task source with filters and sorting"`

## Task D9: 업무 상세 시트

**Files:** `extensions/dooray/lib/dooray-open-link.ts`, `issue/use-dooray-workflows.ts`, `use-dooray-comments.ts`, `DoorayIssueComments.tsx`, `DoorayIssueWorkspace.tsx`
- Test: `use-dooray-comments.test.ts`, `use-dooray-workflows.test.ts`

**Interfaces:**
- `<DoorayIssueWorkspace issue onUse primaryStartKind secondaryStart? workspaceStart? onOpenWorkspace onClose onIssuePatched/>`: `secondaryStart`와 `workspaceStart`는 D12가 채운다. undefined면 숨긴다.

- [ ] **Step 1: 실패 테스트** — 상태 변경은 낙관적으로 반영하고, 실패하면 롤백하고 토스트를 띄운다. 댓글은 낙관적으로 "나"로 추가하고 refetch 후에도 유지한다. 다른 업무로 넘어간 뒤 도착한 응답은 무시한다. `getCommentBodySubmitState`를 재사용한다.
- [ ] **Step 2~4:** FAIL → 구현(`CommentMarkdown` `variant="document"`, `createBrowserTab`, `writeClipboardText`) → PASS
- [ ] **Step 5:** `$electron` 스모크 → `git commit -m "feat(dooray): task detail sheet with comments and workflow changes"`

## Task D10: 업무 → 새 워크스페이스

**Files:** `extensions/dooray/lib/dooray-linked-work-item.ts`; `index.ts`에 `resolveLinkedWorkItemBranch` 등록. 패널과 시트에는 "워크스페이스 열기"(`findDoorayWorkspaceMatch` → `activateAndRevealWorktree`)를 연결한다.
- Test: `dooray-linked-work-item.test.ts`

**Interfaces:**
- Produces:
  - `buildDoorayLinkedWorkItem(issue)`: `{ type: 'issue', number: 0, title: \`${taskNumber} ${subject}\`, url, jiraIdentifier: taskNumber, branchNameOverride: getDoorayTaskBranchName(issue) }`
  - `getDoorayIssueWorkspaceSeed(issue): string`

- [ ] **Step 1~4:** seed로 composer를 열면 브랜치가 `feature/dooray-D-TF/2619`인지(S8 경로) 확인한다. 매칭 워크스페이스가 있으면 버튼이 "워크스페이스 열기"여야 한다. 실패 테스트 → 구현 → PASS
- [ ] **Step 5:** `git commit -m "feat(dooray): start a new workspace from a Dooray task"`

## Task D11: 업무 생성 다이얼로그

**Files:** `extensions/dooray/new-task/DoorayNewTaskDialog.tsx`, `DoorayTagField.tsx`, `DoorayMilestoneField.tsx`, `DoorayMemberPicker.tsx`, `DoorayAttachmentField.tsx`, `apply-dooray-task-extras.ts`
- Test: `DoorayNewTaskDialog.test.tsx`, `apply-dooray-task-extras.test.ts`

- [ ] **Step 1: 실패 테스트**
```tsx
it('keeps Create disabled until every mandatory tag group has a selection (review focus)', async () => { /* ... */ })
it('template autofill replaces members only when the template has them', async () => { /* ... */ })
it('image paste adds paste-<ts>.png only while open', async () => { /* ... */ })
it('after create: setWorkflow then sequential uploads, aggregated failure toast', async () => { /* ... */ })
it('member search debounced 300ms, stale results dropped', async () => { /* fake timers */ })
```
- [ ] **Step 2~4:** FAIL → 구현(Spec §5 "업무 생성") → PASS
- [ ] **Step 5:** `$electron`으로 확인한다: 템플릿, 필수 태그 잠금, 스크린샷 붙여넣기, 생성(테스트 프로젝트). → `git commit -m "feat(dooray): create task dialog"`

## Task D12: 우측 사이드바 두레이 탭

**Files:** `extensions/dooray/sidebar/DoorayTasksPanel.tsx`, `DoorayActiveTaskCard.tsx`, `CompactDoorayIssueRow.tsx`; `index.ts`에 `rightSidebarTabs: [{ id: 'ext:dooray/tasks', … }]`
- Test: `DoorayActiveTaskCard.test.tsx`

- [ ] **Step 1: 실패 테스트** — 현재 브랜치에서 `parseDoorayTaskFromBranch`, 이어서 `getIssueByNumber`로 업무를 찾아 카드에 표시하는지. 못 찾으면 not-found 문구가 나와야 한다. 프로젝트는 브랜치를 따라 자동 선택되고, 사용자가 직접 고르면 브랜치가 바뀌기 전까지 그 선택을 유지해야 한다.
- [ ] **Step 2~4:** FAIL → 구현 → PASS
- [ ] **Step 5:** `$electron`으로 확인한다: 폴더 워크스페이스에서도 탭이 보이는지, 재시작 후 탭이 유지되는지. → `git commit -m "feat(dooray): right sidebar Dooray tasks tab"`

## Task D13: 현재 워크스페이스에서 시작 — main (`taskBranch`)

**Files:**
- Create: `src/main/extensions/dooray/task-branch/task-branch-git.ts`, `task-branch-ipc.ts`
  - `checkoutBranch`를 수정하지 않는다. 이 모듈 안에서 `git checkout -b <branch> [startPoint] --`를 직접 실행한다(`assertValidBranchName` 재사용). upstream `checkout.ts`는 건드리지 않는다.
- `doorayMainExtension.registerIpcHandlers`에 `taskBranch:*`를 추가한다. preload는 `dooray` 확장 API 아래 `taskBranch` 네임스페이스로 노출한다(`window.api.dooray.taskBranch.*`).
- Test: `task-branch-git.test.ts` (임시 git repo + 서브모듈 fixture)

**Interfaces:**
```ts
listSubmodules({ worktreePath }): Promise<string[]>
inspect({ worktreePath, submodulePaths? }): Promise<{ submodulePath: string; changeCount: number }[]>
stash({ worktreePath, submodulePaths?, message }): Promise<void>
discard({ worktreePath, submodulePaths? }): Promise<void>
switch({ worktreePath, submodulePaths?, branch, baseRef?, fetchBase? }): Promise<{ submodulePath: string; status: 'already-on' | 'switched' | 'created' | 'skipped-missing' }[]>
```
- [ ] **Step 1: 실패 테스트** — baseRef에서 부모와 서브모듈에 브랜치를 생성하는지. 초기화되지 않은 서브모듈은 `skipped-missing`으로 보고하는지. discard가 untracked 파일을 유지하는지. `..`과 `-` 시작 입력을 거부하는지. SSH 워크트리를 거부하는지.
- [ ] **Step 2~4:** FAIL → 구현(`runProcess`, Git 2.25 기준선, `fetch` 실패 무시) → PASS
- [ ] **Step 5:** `git commit -m "feat(dooray): local task-branch switching with submodules"`

## Task D14: 현재 워크스페이스에서 시작 — UI + 저장소 설정

**Files:**
- `extensions/dooray/start/DoorayTaskBaseRefDialog.tsx`(`index.ts`의 `appSurfaces`에 Host 등록; `BaseRefPicker`, `getRuntimeRepoBaseRefDefault` 재사용)
- `start/dooray-start-in-current-workspace.ts`, `use-dooray-start-actions.ts`, `DoorayWorkspaceStartMenu.tsx`
- `settings/DoorayRepositoryStartSection.tsx`(`repositorySettingsSections` 등록). 저장 위치는 `repo.extensionSettings.dooray: RepoDoorayStart`이고 S9 경로를 쓴다.
- 미커밋 변경 프롬프트는 S10의 alternate action을 쓴다.
- Test: `dooray-start-in-current-workspace.test.ts`, `use-dooray-start-actions.test.ts`

- [ ] **Step 1: 실패 테스트** — Spec §5 "작업 시작"의 1~8단계를 각각 한 케이스로 만든다.
  - 이미 해당 브랜치면 이름 변경과 활성화만 하는지
  - base 선택을 취소하면 중단하는지
  - Stash 경로가 `orca: <branch>` 메시지로 stash하는지
  - Discard는 2차 확인을 거치는지
  - `fetchBase`는 `baseRef`와 함께 있을 때만 보내는지
  - `skipped-missing`이면 경고를 띄우는지
  - taskBranch가 없는 웹 클라이언트에서는 unavailable을 표시하는지
  - SSH에서는 사유와 함께 비활성화되는지
- [ ] **Step 2~4:** FAIL → 구현 → PASS
- [ ] **Step 5:** `$electron`으로 확인한다: iOS_Dooray(서브모듈 2개)에서 base 다이얼로그 → fetch → 서브모듈 체크 → Stash → 결과 토스트, 사이드바 이름 변경.
- [ ] **Step 6:** `git commit -m "feat(dooray): start a task in the current workspace"`

---

# Phase V — 통합 검증

## Task V1: 전체 검증 + 기존 사용자 마이그레이션 + DMG

- [ ] **Step 1:**
```bash
pnpm tc
pnpm test src/shared/extensions src/main/extensions src/preload src/renderer/src/extensions src/main/updater src/shared/task-providers.test.ts src/main/global-fetch-call-site-audit.test.ts
pnpm run check:code-quality:changed
pnpm verify:localization-catalog && pnpm verify:localization-extraction
```
- [ ] **Step 2:** 격리 확인
  - `git diff --stat develop...HEAD -- src config ':!**/extensions/**'`로 나온 upstream 수정 파일 수가 SEAMS.md 목록과 일치해야 한다.
  - `fork-seams.test.ts`가 PASS해야 한다.
- [ ] **Step 3:** 현재 `~/.orca/dooray-*` 파일이 있는 상태로 실행한다. 재연결 없이 "연결됨"이 나와야 한다.
- [ ] **Step 4:** `$electron` E2E 스모크 — 연결 → 목록 → 상세·댓글·상태 → 생성 → 새 워크스페이스 → 사이드바 현재 업무 → 현재 워크스페이스 시작 → 메뉴 "업데이트 확인" 응답
- [ ] **Step 5:** 로컬 DMG 빌드(원본과 같은 방식, 공증 없음)로 패키지 앱에서 자동 업데이트가 동작하지 않는지 확인한다.
- [ ] **Step 6:** `superpowers:requesting-code-review` → PR(포크 `develop` 대상)

---

## 버전업 루틴 (이 계획의 최종 산출물 사용법)

1. `git fetch upstream && git merge upstream/main`을 실행한다.
2. 충돌은 `fork-seam:` 마커가 있는 줄에서만 난다. upstream 변경을 받아들인 뒤 마커 줄을 다시 얹는다.
3. `pnpm tc && pnpm test src/shared/extensions/fork-seams.test.ts src/main/extensions src/renderer/src/extensions`를 실행한다.
4. 계약 테스트가 알려준 누락 지점을 복구한다. 두레이 폴더는 upstream이 건드리지 않으므로 대부분 수정할 필요가 없다. 예외는 upstream이 내부 API(예: `CommentMarkdown` props)를 바꾼 경우로, 이때만 확장 쪽을 고친다.
5. **플러그인 성숙도를 점검한다.** 아래 "향후 계획"의 점검 명령을 실행해 P1~P9 표를 갱신한다.
6. DMG를 빌드해 배포한다.

## 향후 계획: Orca 플러그인 정식화 시 플러그인으로 전환

지금은 플러그인 시스템이 실험 단계라 내장 확장 모듈로 구현한다(D1). 플러그인 기능이 정식 서비스되면 두레이를 **Orca 플러그인으로 옮겨** 포크 없이 upstream Orca 그대로 쓰는 것을 최종 목표로 한다.

### 전환 착수 조건 (모두 충족 시)

| # | 조건 | 확인 위치 (2026-09-30 현재 상태) |
|---|---|---|
| P1 | 플러그인 API가 정식(frozen)이 됨. "experimental" 표기가 제거되고 호환성 보장이 명시됨 | `src/shared/plugins/plugin-manifest.ts`, `plugin-host-api.ts` 주석 — 현재 "no compatibility promises until pluginApi v1 freezes" |
| P2 | 플러그인 시스템이 기본 활성이거나 정식 설정으로 켤 수 있음 | `default-global-settings.ts`의 `pluginSystemEnabled` — 현재 기본 `false` |
| P3 | 패널 UI에서 플러그인 백엔드(worker)를 호출할 수 있음 | `PLUGIN_HOST_API_V0`의 `panel: true` 메서드 — 현재 `workspace.readContext`, `terminal.sendText`, `notifications.show`뿐 |
| P4 | 활성 워크스페이스의 경로, worktreeId, repoId를 읽을 수 있음 | `workspace.readContext` 결과 — 현재 `{branch, displayName, terminals}`만 |
| P5 | 워크트리 생성(브랜치명 지정)과 활성화, 또는 새 워크스페이스 composer 열기 API | 현재 없음 |
| P6 | 링크 열기(인앱 브라우저 또는 외부) API | 현재 없음 |
| P7 | 작업 탭 소스(`taskSources`) contribution과 설정 화면 contribution | 현재 `contributes`는 panels/commands/events/languagePacks/keybindings/vmRecipes/agents뿐 |
| P8 | 네트워크 요청 권한(`net:fetch` 등)이 정식 capability가 됨 | `plugin-capabilities.ts` 주석에 "later phases"로만 언급 |
| P9 | 비공식 publisher 플러그인을 로컬/사내 배포로 설치할 수 있음 | `plugin-install-trust.ts` — 번들 설치는 `stablyai.orca-*`만 허용. local-path/git 설치는 가능 |

- P1~P6과 P8~P9가 충족되면 **부분 전환**이 가능하다. 사이드바 탭, 업무 목록·상세·생성, 작업 시작을 플러그인으로 옮긴다.
- P7까지 충족되면 **완전 전환**이 가능하다. 작업 탭과 설정 카드도 옮긴다.
- 서브모듈 브랜치 전환(`taskBranch`)은 P4가 충족되면 worker에서 직접 `git`을 실행해 옮길 수 있다.

### 점검 방법

버전업 루틴 **3단계 뒤에 추가**한다.
```bash
# 플러그인 API 성숙도 점검 — 변화가 있으면 이 표(P1~P9)를 갱신
git diff <이전 upstream 태그>..upstream/main --stat -- src/shared/plugins src/main/plugins
rg -n "experimental|EXPERIMENTAL|no compatibility promises" src/shared/plugins/plugin-manifest.ts src/shared/plugins/plugin-host-api.ts
rg -n "panel: true" src/shared/plugins/plugin-host-api.ts
rg -n "pluginSystemEnabled" src/shared/default-global-settings.ts
```
upstream 릴리스 노트에서 "plugin"도 검색한다. 조건이 새로 충족되면 이 표의 "현재 상태" 열을 갱신하고, 전환 착수 여부를 사용자와 결정한다.

### 지금부터 지킬 설계 원칙 (전환 비용을 줄이기 위해)

Phase D를 구현할 때 아래를 지킨다. 각 Task의 리뷰 항목에 포함한다.
- **두레이 API 계층은 Electron에 의존하지 않는다.**
  - `src/main/extensions/dooray/`의 REST 클라이언트, 매퍼, 쿼리, 뮤테이션은 `fetch` 함수와 토큰 저장소를 **주입받는 순수 모듈**로 만든다.
  - `getMainHttpClient()`와 `integration-credential-file.ts`는 `client.ts`의 조립부에서만 쓴다.
  - 그러면 플러그인 worker(Node)에서 `fetch`와 `secrets.*`를 주입해 그대로 재사용할 수 있다.
- **renderer 순수 로직은 React·store에 의존하지 않는다.** `lib/dooray-branch-matching.ts`, `dooray-issue-ordering.ts`, `dooray-tag-groups.ts`가 해당하며, 플러그인 패널 번들에서 그대로 쓴다.
- **UI 컴포넌트는 데이터 접근을 훅 하나로 모은다.** 컴포넌트는 `runtime-dooray-client`를 직접 부르지 않고 `useDoorayApi()` 같은 단일 접근점을 거친다. 전환할 때는 이 접근점만 "패널 → worker 호출"로 바꾼다.
- **자격증명 파일 포맷을 유지한다.** 전환 후 첫 실행 때 `~/.orca/dooray-*`를 플러그인 secrets로 1회 이관하는 경로를 만든다.

### 전환 작업 개요 (착수 시 별도 계획서로 상세화)

| 현재 (내장 확장) | 플러그인 대응 |
|---|---|
| `src/main/extensions/dooray/` API·자격증명 | plugin worker (`main.mjs`) + `secrets.*` + `net:fetch` |
| IPC `dooray:*` / RPC `dooray.*` | worker commands, 패널에서 호출(P3) |
| `taskBranch` | worker에서 `git` 실행(P4) |
| 우측 사이드바 탭 `ext:dooray/tasks` | `contributes.panels` (`plugin:<pub>.dooray/tasks`) |
| 작업 탭 소스, 설정 카드, 온보딩 행 | `taskSources` / settings contribution(P7). 미충족이면 패널 안 탭으로 대체 |
| 작업 시작(composer, 워크트리 활성화) | 워크트리 API(P5) |
| 번역 | `languagePacks` 또는 플러그인 내장 번역 |
| 자동 업데이트 off | 불필요. upstream Orca 정식 빌드와 자동 업데이트를 그대로 사용 |

**전환 완료 조건:** `fork-seam` 연결 지점과 `extensions/` 폴더를 전부 제거하고, upstream Orca + 두레이 플러그인만으로 v0.2.2 기능이 동등하게 동작한다. 이후 포크는 폐기하거나 upstream 추적용으로만 남긴다.

## 범위 밖 / 후속 과제

- 연결 지점을 upstream에 PR로 제안한다. 받아들여지면 포크 diff가 설치 목록 파일 몇 개로 줄어든다.
- linked work item의 `'dooray'` provider 정식 지원(D4).
- 원본의 기타 커스텀(PR 리뷰 제출, 서브모듈 diff, Git History, 온보딩 기능 안내 화면)은 필요하면 같은 확장 구조로 별도 계획을 세운다.
