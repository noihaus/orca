# 연결 지점(fork-seam)과 버전업 절차

이 포크는 두레이 연동을 격리된 확장 모듈로 싣는다. upstream 파일에는 범용 연결 지점만 넣고, 수정한 hunk마다 `// fork-seam: <name>` 마커를 한 줄 붙인다. 목록의 단일 출처는 `src/shared/extensions/fork-seams.ts`이고, 계약 테스트(`src/shared/extensions/fork-seams.test.ts`)가 마커와 목록의 일치를 강제한다. 설치된 확장이 각 연결 지점에 닿는지는 `src/main/extensions/fork-seam-behavior.test.ts`(설치 목록 순회)와 `fork-seam-behavior.fixture.test.ts`(fixture 확장)가 검사한다.

## 규칙

- 마커는 hunk의 첫 줄에 둔다. 포매터가 옮긴 경우 다음 줄까지 허용한다. JSX는 `{/* fork-seam: … */}`, 주석이 불가능한 설정은 `/* fork-seam: … */` 형태도 인식한다.
- 새 연결 지점을 추가하면 마커, `FORK_SEAMS` 항목, 이 문서를 함께 갱신한다.
- 두레이라는 이름은 `extensions/` 폴더와 `installed-*` 파일 밖에 쓰지 않는다(계약 테스트가 검사).

## 연결 지점 목록

### `app-providers`

- 목적: 앱 루트에 확장 provider 컴포넌트를 감싼다.
- 확장 등록: `RendererExtension.appProviders`.
- 파일:
  - `src/renderer/src/App.tsx`

### `auto-update-gate`

- 목적: 포크 빌드에서 자동 업데이트를 끄고, 메뉴 "업데이트 확인"에는 "최신"으로 응답한다.
- 확장 등록: `src/main/extensions/fork-build.ts`의 `FORK_AUTO_UPDATE_ENABLED`. 테스트 환경은 `ORCA_ENABLE_AUTO_UPDATE=1`로 켠다.
- 파일:
  - `config/vitest.config.ts`
  - `src/main/updater.ts`
  - `src/main/updater/updater-setup.ts`

### `confirmation-alternate-action`

- 목적: 확인 대화상자에 취소와 확인 사이 보조 동작 버튼을 추가한다(`'alternate'` 반환).
- 확장 등록: 대화상자 옵션에 `alternateLabel`/`alternateVariant` 지정.
- 파일:
  - `src/renderer/src/components/confirmation-dialog-context.ts`
  - `src/renderer/src/components/confirmation-dialog.test.tsx`
  - `src/renderer/src/components/confirmation-dialog.tsx`

### `extension-provider-seeding`

- 목적: 확장 provider를 프로필당 한 번 표시 목록에 넣고, 사용자가 끈 선택은 유지한다.
- 확장 등록: manifest의 `defaultVisible`만 지정한다. 별도 등록 없음.
- 파일:
  - `src/main/persistence/applying-settings/settings-update.ts`
  - `src/main/persistence/loading-store/normalize-loaded-global-settings.ts`
  - `src/main/persistence/loading-store/prepare-loaded-profile-settings.ts`
  - `src/shared/default-global-settings.ts`
  - `src/shared/global-settings-types.ts`

### `i18n-extension-bundles`

- 목적: 확장 로케일 번들을 i18n에 `auto.ext.<id>` 아래로 로드한다.
- 확장 등록: `RendererExtension.locales`.
- 파일:
  - `src/renderer/src/i18n/i18n.ts`

### `integration-cards`

- 목적: 설정 통합 화면·기능 월·설정 가이드에 확장 연결 카드와 상태를 표시한다.
- 확장 등록: `RendererExtension.integrationCards`(상태는 `taskSource.useStatus`).
- 파일:
  - `src/renderer/src/components/feature-wall/use-feature-wall-task-source-presentation.ts`
  - `src/renderer/src/components/feature-wall/use-integration-connection-status.ts`
  - `src/renderer/src/components/settings/IntegrationsPane.tsx`
  - `src/renderer/src/components/settings/use-integration-provider-status-refresh.ts`
  - `src/renderer/src/components/setup-guide/use-setup-guide-progress.ts`

### `integration-credential-service`

- 목적: 통합 자격증명 오류 서비스 이름에 확장 서비스를 허용한다.
- 확장 등록: `INSTALLED_CREDENTIAL_SERVICES`에 서비스 이름 추가.
- 파일:
  - `src/shared/integration-credential-errors.ts`

### `linked-work-item-branch`

- 목적: 연결된 작업 항목에서 정확한 브랜치명을 확장이 지정하게 한다.
- 확장 등록: `RendererExtension.resolveLinkedWorkItemBranch(item)`.
- 파일:
  - `src/renderer/src/hooks/composer-state/source-context-state.ts`
  - `src/renderer/src/hooks/composer-state/source-identity-actions.ts`
  - `src/renderer/src/hooks/composer-state/target-change-actions.ts`
  - `src/renderer/src/hooks/useComposerState.integration.test.ts`
  - `src/renderer/src/lib/new-workspace.ts`
  - `src/renderer/src/store/slices/ui/ui-slice-contract-core.ts`

### `localization-scripts`

- 목적: 로컬라이제이션 검증 스크립트가 확장 카탈로그를 함께 읽는다.
- 확장 등록: `config/scripts/localization-extension-catalogs.mjs`(확장 쪽 새 파일)에 카탈로그 경로 등록.
- 파일:
  - `config/scripts/verify-localization-catalog.mjs`
  - `config/scripts/verify-localization-extraction.mjs`

### `main-ipc`

- 목적: main 프로세스 시작 시 확장의 IPC 핸들러를 등록한다.
- 확장 등록: `INSTALLED_MAIN_EXTENSIONS`(`src/main/extensions/installed-main-extensions.ts`)에 `registerIpcHandlers`를 가진 `MainExtension` 추가.
- 파일:
  - `src/main/ipc/register-core-handlers/register-core-handlers.ts`

### `onboarding-integration-rows`

- 목적: 온보딩 통합 단계에 확장 행을 추가한다.
- 확장 등록: `RendererExtension.onboardingIntegrationRows`.
- 파일:
  - `src/renderer/src/components/onboarding/IntegrationsStep.tsx`

### `preload-api`

- 목적: 확장 API를 `window.api.<key>`로 노출하고 타입을 합친다(핵심 키와 서로소여야 한다).
- 확장 등록: `INSTALLED_PRELOAD_EXTENSIONS`(`src/preload/extensions/installed-preload-extensions.ts`)에 추가. 키는 핵심 `window.api` 키와 겹치면 타입 검사가 실패한다.
- 파일:
  - `config/tsconfig.tc.web.json`
  - `src/preload/api-types.ts`
  - `src/preload/index.ts`

### `publish-target`

- 목적: electron-builder 배포 대상(publish)을 포크 저장소로 바꾼다.
- 확장 등록: `config/electron-builder.config.cjs`의 publish 설정만 수정한다.
- 파일:
  - `config/electron-builder.config.cjs`

### `repo-extension-settings`

- 목적: 저장소별 확장 설정(`Repo.extensionSettings`, 16KB 제한)을 저장·갱신·전파한다.
- 확장 등록: 확장 id를 키로 JSON을 저장한다. 별도 등록 없음.
- 파일:
  - `src/main/ipc/repos/repo-update-handler.ts`
  - `src/main/persistence-update-repo.test.ts`
  - `src/main/persistence/loading-store/repo-lifecycle-operations.ts`
  - `src/main/persistence/tracking-repos/repo-hydration.ts`
  - `src/main/persistence/tracking-repos/repo-update-operations.ts`
  - `src/main/runtime/runtime-repository-settings-controller.ts`
  - `src/preload/api/repository-api.ts`
  - `src/renderer/src/store/repos/repo-state.ts`
  - `src/renderer/src/store/repos/repo-update.ts`
  - `src/shared/repo-types.ts`
  - `src/shared/rpc-contract/repo-update-params.ts`

### `repository-settings-sections`

- 목적: 저장소 설정 화면에 확장 섹션을 추가한다.
- 확장 등록: `RendererExtension.repositorySettingsSections`.
- 파일:
  - `src/renderer/src/components/settings/RepositoryPane.tsx`

### `right-sidebar-extension-tab`

- 목적: 우측 사이드바에 `ext:<id>/<panel>` 탭을 추가하고 저장된 탭 키를 유지한다.
- 확장 등록: 두 목록이 모두 필요하다: shared manifest의 `INSTALLED_RIGHT_SIDEBAR_TAB_KEYS`와 renderer의 `rightSidebarTabs`. 드리프트 테스트가 일치를 검사한다.
- 파일:
  - `src/main/persistence/applying-settings/ui-selection-normalization.ts`
  - `src/renderer/src/components/right-sidebar/right-sidebar-panel-content.tsx`
  - `src/renderer/src/components/right-sidebar/use-right-sidebar-activity-items.ts`
  - `src/renderer/src/store/right-sidebar-route.ts`
  - `src/shared/rpc-contract/client-ui-params.ts`
  - `src/shared/ui-chrome-types.ts`

### `runtime-commands`

- 목적: 확장 런타임 명령을 런타임 객체에 바인딩한다(접두사 검사, 충돌 시 예외).
- 확장 등록: `MainExtension.runtimeCommands`의 `prefix`와 `create`.
- 파일:
  - `src/main/runtime/orca-runtime-state-fields.ts`

### `runtime-rpc-methods`

- 목적: 확장 RPC 메서드를 `ALL_RPC_METHODS`와 파라미터 카탈로그 생성에 합친다.
- 확장 등록: `MainExtension.rpcMethods`에 `defineMethod` 선언 추가. 웹 클라이언트가 쓰면 `INSTALLED_RUNTIME_NAMESPACE_API_KEYS`(shared manifest)도 추가.
- 파일:
  - `config/scripts/generate-rpc-params-catalog.mjs`
  - `src/main/runtime/rpc/core-typed-method-contract.test.ts`
  - `src/main/runtime/rpc/methods/index.ts`
  - `src/main/runtime/rpc/rpc-params-type-parity.ts`

### `store-slices`

- 목적: 확장 zustand slice를 앱 store와 `AppState` 타입에 합친다.
- 확장 등록: `RendererExtension.createSlice`. slice 생성자는 `StateCreator<ExtensionStoreState, …>`로 타입을 잡는다.
- 파일:
  - `src/renderer/src/store/index.ts`
  - `src/renderer/src/store/slices/store-test-helpers.ts`
  - `src/renderer/src/store/types.ts`

### `task-page-source`

- 목적: 작업 탭·사이드바·설정·자동화가 확장 task source(패널, 라벨, 아이콘, 상태)를 그리게 한다.
- 확장 등록: `RendererExtension.taskSource`에 `ExtensionTaskSource` 등록(`src/renderer/src/extensions/installed-renderer-extensions.ts`). id는 manifest의 provider id와 같아야 한다.
- 파일:
  - `src/renderer/src/components/automations/automation-source-display.ts`
  - `src/renderer/src/components/automations/automation-target-availability.ts`
  - `src/renderer/src/components/settings/task-source-setup-state.test.ts`
  - `src/renderer/src/components/settings/TasksPane.test.tsx`
  - `src/renderer/src/components/settings/TasksPane.tsx`
  - `src/renderer/src/components/sidebar/SidebarTaskNavButton.tsx`
  - `src/renderer/src/components/task-page-list-chrome-visibility.ts`
  - `src/renderer/src/components/task-page-localized-options.tsx`
  - `src/renderer/src/components/task-page/Content.tsx`
  - `src/renderer/src/components/task-source-context-summary.ts`
  - `src/shared/task-providers.ts`
  - `src/shared/workspace-name.ts`

### `task-provider-registry`

- 목적: `TASK_PROVIDERS`와 provider 식별 로직에 확장 provider id를 앞쪽에 합친다.
- 확장 등록: `INSTALLED_TASK_PROVIDER_EXTENSIONS`(`src/shared/extensions/installed-extension-manifest.ts`)에 `{ id, defaultVisible, alwaysAvailable }` 추가.
- 파일:
  - `src/renderer/src/components/settings/use-task-source-provider-readiness.ts`
  - `src/shared/rpc-contract/automation-params.ts`
  - `src/shared/task-provider-identity.ts`
  - `src/shared/task-providers.test.ts`
  - `src/shared/task-providers.ts`

### `web-preload-api`

- 목적: 웹 클라이언트에서 확장 API를 런타임 RPC로 제공한다.
- 확장 등록: preload 목록과 `INSTALLED_RUNTIME_NAMESPACE_API_KEYS` 양쪽에 같은 키를 넣어야 한다.
- 파일:
  - `src/renderer/src/web/web-preload-api.ts`

## 버전업 절차

이 저장소의 통합 브랜치는 `develop`이다. 기능 브랜치는 `develop`에 합치고, 버전업 때마다 `develop`에 `upstream/main`을 머지한다. 이 저장소는 Node 24와 pnpm 12(corepack)가 필요하므로 먼저 환경을 맞춘다.

```bash
source ~/.nvm/nvm.sh && nvm use 24
git fetch upstream
git switch develop && git merge upstream/main      # 충돌은 fork-seam 줄만 남기고 upstream 쪽으로 해결
pnpm install && pnpm tc
pnpm test src/shared/extensions/fork-seams.test.ts # 실패 = 사라진 연결 지점, 메시지에 name/file 표시
node fork/scripts/check-fork-seams.mjs             # upstream 파일 중 마커 없는 변경 파일이 0개여야 한다
pnpm test src/main/extensions src/renderer/src/extensions
ORCA_CODE_QUALITY_BASE=upstream/main pnpm run check:code-quality:changed
```

마지막 명령에 `ORCA_CODE_QUALITY_BASE=upstream/main`이 필요한 이유: `origin/main`은 포크의 오래된 main이라, 지정하지 않으면 게이트가 수천 개의 upstream 커밋을 diff하느라 멈춘 것처럼 보인다.

`check-fork-seams.mjs`는 `git diff upstream/main...HEAD`로 이 브랜치가 바꾼 upstream 파일(`extensions/`, `fork/` 제외, upstream에 없는 새 파일 제외) 중 마커가 없는 파일을 나열한다. 계약 테스트는 git 없이 도는 대신 이 검사를 하지 못하므로 머지 뒤 반드시 실행한다.

### 플러그인 성숙도 점검

위 3단계(`pnpm tc`) 뒤에 실행해 P1~P9 표(`fork/docs/plans/2026-09-30-dooray-integration-port.md`의 "향후 계획")를 갱신한다.

```bash
git diff <이전 upstream 태그>..upstream/main --stat -- src/shared/plugins src/main/plugins
rg -n "experimental|EXPERIMENTAL|no compatibility promises" src/shared/plugins/plugin-manifest.ts src/shared/plugins/plugin-host-api.ts
rg -n "panel: true" src/shared/plugins/plugin-host-api.ts
rg -n "pluginSystemEnabled" src/shared/default-global-settings.ts
```

upstream 릴리스 노트에서 "plugin"도 검색한다.
