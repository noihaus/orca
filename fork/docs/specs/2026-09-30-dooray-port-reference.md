# Dooray Edition 역재구성 레퍼런스

> 원본: `/Applications/Orca.app` — "Orca : Dooray Edition v0.2.2" (upstream `1.4.148-rc.1` / `827cd49f4` 기반).
> 원본 소스는 없음. 이 문서는 설치된 `app.asar` 번들에서 역추출한 명세다.
> 포크(`noihaus/orca` develop, `1.4.178-rc.2`)는 기반에서 3,042 커밋 앞서 있다.
> 범위: **두레이 연동만** (PR 리뷰 제출, 서브모듈 diff, Git History 개편, 자동업데이트 off 등은 제외).

## 0. 번들 재추출 (구현 중 원본 대조용)

```bash
REF=~/orca-dooray-edition-ref
mkdir -p "$REF" && cd "$REF"
npx --yes @electron/asar extract /Applications/Orca.app/Contents/Resources/app.asar app
mkdir -p pretty
for f in app/out/renderer/assets/{DoorayTasksPanel,dooray-connect-dialog,dooray-open-link,use-dooray-start-actions,TaskPage,I18nProvider,index,Settings,FeatureWallSetupChecklist,OnboardingFlow}-*.js; do
  npx --yes prettier --parser babel "$f" > "pretty/$(basename "$f")" 2>/dev/null
done
```

- main 번들(`app/out/main/index.js`)은 비압축이라 그대로 읽힌다. 아래 `L숫자`는 이 파일의 줄 번호.
- renderer는 minify 되어 있으나 식별자(함수명)는 보존됨 → `pretty/`에서 함수명으로 grep.
- 번들 파일명 해시는 빌드마다 다름; 위 glob 으로 찾는다.

## 1. main 프로세스 위치 맵 (`app/out/main/index.js`)

| 영역 | 줄 | 포크 대응 위치 |
|---|---|---|
| 자격증명 저장 | L117205–117322 | `src/main/jira/site-credential-store.ts`, `src/main/integration-credential-file.ts` |
| HTTP 클라이언트·매퍼·API | L117323–117903 | `src/main/jira/*` |
| IPC `registerDoorayHandlers` | L117904–118072 | `src/main/ipc/jira.ts` |
| Runtime RPC zod + `DOORAY_METHODS` | L86417–86602 | `src/main/runtime/rpc/methods/jira.ts` |
| OrcaRuntime `doorayXxx` | L188089–188153 | `src/main/runtime/runtime-jira-commands.ts` |
| Preload `window.api.dooray` | preload L1061–1081 | `src/preload/api/jira-bridge.ts`, `jira-api.ts` |
| Repo `doorayStart` 설정 | L74376, L151630 | `repo-update-schema.ts`, `ipc/repos.ts` |
| `taskBranch:*` IPC | L138662–138926 | 신규 (`src/main/git/checkout.ts` 확장) |
| 설정 마이그레이션 `visibleTaskProvidersDefaultedForDooray` | L16505–16525, L18214 | `prepare-loaded-profile-settings.ts` |
| 우측 사이드바 탭 `'dooray-tasks'` | L14895, L86828 | `ui-selection-normalization.ts`, `client-ui-schemas.ts` |

## 2. Dooray REST 계약

- 인증 헤더: `Authorization: dooray-api ${token}` (소문자, 공백 1개).
- 기본 API URL `https://api.dooray.com`, 웹 URL 기본값(UI) `https://nhnent.dooray.com`.
- 응답 래퍼: `{ header: { isSuccessful, resultCode, resultMessage }, result, totalCount? }`.
  - HTTP `!ok` → 에러 메시지 `header.resultMessage || statusText || "Dooray request failed (<status>)"`.
  - `header.isSuccessful === false` → 에러 `header.resultMessage || "Dooray request failed"`.
- 동시 요청 4개 제한(전역 세마포어).
- 업무 웹 URL: `${webUrl}/project/tasks/${postId}` (webUrl 없으면 `''`).

| 채널 (`dooray:*` / RPC `dooray.*`) | 인자 | REST | 반환 |
|---|---|---|---|
| connect | `{apiUrl?, webUrl?, apiToken}` | `GET /common/v1/members/me` (저장 전 probe) | `{ok:true,viewer}`\|`{ok:false,error}` |
| disconnect | – | 없음, 파일 삭제 | IPC `void`, RPC `{ok:true}` |
| status | – | 없음(디스크) | `DoorayStatus` |
| testConnection | – | `GET /common/v1/members/me` | connect 와 동일, throw 안 함 |
| listProjects | – | `GET /project/v1/projects?member=me&size=100&page=0` | `DoorayProject[]` (id·code 있는 것만) |
| listIssues | `{projectId, filter?, page?, size?, order?}` | `GET /project/v1/projects/{pid}/posts?page&size&order&postWorkflowClasses[&toMemberIds]` | `{totalCount, issues}` |
| getIssue | `{projectId, postId}` | `GET /project/v1/projects/{pid}/posts/{postId}` | `DoorayIssue\|null` |
| getIssueByNumber | `{projectId, postNumber}` | `GET .../posts?postNumber=n&size=2` → getIssue | `DoorayIssue\|null` |
| createIssue | `DoorayCreateIssueArgs` | `POST /project/v1/projects/{pid}/posts` | `{ok:true,id}`\|`{ok:false,error}` |
| uploadIssueFile | `{projectId, postId, file:{name,mimeType?,dataBase64}}` | `POST .../posts/{postId}/files` (multipart, 필드명 `file`) | `{ok}`\|`{ok:false,error:"<name>: <msg>"}` |
| listTags | `{projectId}` | `GET .../tags?size=100&page=0` | `DoorayTag[]` |
| listMilestones | `{projectId}` | `GET .../milestones?size=50&page=0..19` (50 미만이면 중단) | `DoorayMilestone[]` |
| listTemplates | `{projectId}` | `GET .../templates?size=100&page=0` | `DoorayTemplateSummary[]` |
| getTemplate | `{projectId, templateId}` | `GET .../templates/{templateId}` | `DoorayTemplate\|null` |
| searchMembers | `{name}` | `GET /common/v1/members?name=&size=20&page=0` | `DoorayMember[]` |
| issueComments | `{projectId, postId}` | `GET .../posts/{postId}/logs?page=0&size=100&order=createdAt` | `DoorayComment[]` |
| addIssueComment | `{projectId, postId, body}` | `POST .../posts/{postId}/logs` body `{"body":{"mimeType":"text/x-markdown","content":body}}` | `{ok:true,id}`\|err |
| listWorkflows | `{projectId}` | `GET .../workflows` (`class` → `workflowClass`) | `DoorayWorkflow[]` |
| setWorkflow | `{projectId, postId, workflowId}` | `POST .../posts/{postId}/set-workflow` body `{"workflowId"}` | `{ok}`\|err |

세부 규칙:
- **listIssues**: size 1..100 clamp(기본 30, renderer 는 50 요청), page ≥0 floor, order 기본 `-createdAt`, filter 기본 `assigned`.
  `done` → `postWorkflowClasses=closed`, 그 외 → `backlog,registered,working`. `assigned` 는 `toMemberIds=<viewer.id>` 추가.
  `totalCount = response.totalCount ?? result.length ?? 0`.
- **createIssue** body:
  ```json
  { "subject": "...", "body": {"mimeType":"text/x-markdown","content":"..."},
    "users": { "to": [{"type":"member","member":{"organizationMemberId":"<id>"}}], "cc": [...] },
    "tagIds": [...], "priority": "highest|high|normal|low|lowest", "milestoneId": "..." }
  ```
  `users`/`to`/`cc`/`tagIds`/`milestoneId` 는 비면 생략. `priority` 는 `none`·무효값이면 생략. 멤버 id trim·빈값 제거.
- **uploadIssueFile**: base64 → Buffer → `FormData`(`file`, Blob type `mimeType||application/octet-stream`, filename). Content-Type 헤더는 넣지 않음(boundary). 빈 파일 → `"<name>: attachment is empty."`.
- 경로 세그먼트(projectId 등)는 원본에서 인코딩 안 함 → **포트에서는 `encodeURIComponent` 적용**.
- 에러 정책: list/get 류는 연결·HTTP 실패 시 reject, mutation 류는 `{ok:false,error}` resolve. 인자 무효 시 기본값 반환(`[]`, `null`, `{ok:false,...}`).

## 3. 자격증명

- `~/.orca/dooray-account.json` (0600): `{ version: 1, apiUrl, webUrl: string|null, viewer: {id,name,userCode,email|null} }`
  — 기존 사용자 파일과 **동일 포맷 유지**(포크 설치 후 재연결 없이 동작하도록).
- `~/.orca/dooray-token.enc` (0600): safeStorage 암호문, 불가 시 평문.
- 읽기: 업스트림 `readStoredCredentialToken('Dooray', raw)` → 실패 시 `CredentialDecryptionError('Dooray')`.
- `normalizeDoorayUrl`: trim → scheme 없으면 `https://` → `new URL` → pathname 끝 `/` 제거, search/hash 제거 → 끝 `/` 제거. 무효 → `"Enter a valid Dooray URL."`.
- connect: 토큰 trim(빈값 → `"API token is required."`) → URL 정규화 → `/members/me` probe → viewer id 없으면 `"Dooray did not return a member profile for this token."` → 토큰 저장 → 계정 저장.
- viewer 매핑: `{id, name, userCode, email: externalEmailAddress ?? null}`.

## 4. 공유 타입 (포트 대상 `src/shared/dooray-types.ts`)

```ts
export type DoorayViewer = { id: string; name: string; userCode: string; email: string | null }
export type DoorayStatus =
  | { connected: false; viewer: null }
  | { connected: true; viewer: DoorayViewer; apiUrl: string; webUrl?: string; credentialError?: string }
export type DoorayConnectArgs = { apiUrl?: string; webUrl?: string; apiToken: string }
export type DoorayConnectResult = { ok: true; viewer: DoorayViewer } | { ok: false; error: string }
export type DoorayMutationResult = { ok: true } | { ok: false; error: string }
export type DoorayCreateResult = { ok: true; id: string } | { ok: false; error: string }
export type DoorayIssueFilter = 'assigned' | 'all' | 'done'
export type DoorayIssueOrder = 'createdAt' | '-createdAt' | 'updatedAt' | '-updatedAt'
export type DoorayWorkflowClass = 'backlog' | 'registered' | 'working' | 'closed' // unknown -> 'registered'
export type DoorayPriority = 'highest' | 'high' | 'normal' | 'low' | 'lowest' | 'none'
export type DoorayProject = { id: string; code: string }
export type DoorayIssue = {
  id: string; projectId: string; projectCode: string; number: number
  taskNumber: string // raw.taskNumber ?? `${projectCode}/${number}` ?? `${number}`
  subject: string; body?: string
  workflowId: string; workflowName: string; workflowClass: DoorayWorkflowClass
  assignees: string[] // users.to[].member.name
  priority?: Exclude<DoorayPriority, 'none'>
  milestoneName: string | null
  createdAt: string; updatedAt: string
  url: string
}
export type DoorayIssueList = { totalCount: number; issues: DoorayIssue[] }
export type DoorayListIssuesArgs = { projectId: string; filter?: DoorayIssueFilter; page?: number; size?: number; order?: DoorayIssueOrder }
export type DoorayComment = { id: string; body: string; createdAt: string; authorName: string } // creator.member.name || creator.name
export type DoorayWorkflow = { id: string; name: string; workflowClass: DoorayWorkflowClass }
export type DoorayTagGroup = { id: string; name: string; mandatory: boolean; selectOne: boolean }
export type DoorayTag = { id: string; name: string; tagGroup?: DoorayTagGroup }
export type DoorayMilestone = { id: string; name: string; startedAt: string; endedAt: string; status: 'open' | 'closed' }
export type DoorayTemplateSummary = { id: string; templateName: string; isDefault: boolean }
export type DoorayMember = { id: string; name: string; userCode: string }
export type DoorayTemplate = {
  id: string; templateName: string; subject: string; body: string; guide: string
  tagIds: string[]; priority: DoorayPriority; toMembers: DoorayMember[]; ccMembers: DoorayMember[]
}
export type DoorayCreateIssueArgs = {
  projectId: string; subject: string; body?: string; tagIds?: string[]
  toMemberIds?: string[]; ccMemberIds?: string[]; priority?: DoorayPriority; milestoneId?: string
}
export type DoorayUploadFile = { name: string; mimeType?: string; dataBase64: string }
export type DoorayUploadIssueFileArgs = { projectId: string; postId: string; file: DoorayUploadFile }
export type DoorayStartMode = 'new-worktree' | 'existing-workspace'
export type RepoDoorayStart = { mode: DoorayStartMode; targetWorktreeId?: string | null; submodulePaths?: string[] }
```

## 5. renderer 기능 명세 (함수명으로 `pretty/` grep)

### 데이터 계층
- IPC 래퍼 19개: `getActiveRuntimeTarget(settings).kind === 'environment'` 이면 `callRuntimeRpc(target,'dooray.<op>',args,{timeoutMs})`, 아니면 `window.api.dooray.<op>`. 타임아웃: status/disconnect/searchMembers 15s, uploadIssueFile 120s, 나머지 30s.
- `createDooraySlice`: `doorayStatus`, `doorayStatusChecked`, `doorayStatusContextKey`; `checkDoorayConnection`(세대 카운터 + `getProviderRuntimeContextKey`), `connectDooray`(성공 시 재확인), `testDoorayConnection`, `disconnectDooray`.

### 브랜치·업무 매칭 (순수 함수)
```js
function slugifyDoorayRef(value) {
  return value.toLowerCase().replace(/^refs\/heads\//, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')
}
// 브랜치명: `feature/${issue.taskNumber}` (그대로, 슬러그 없음) — 예: feature/dooray-D-TF/2619
// findDoorayWorkspaceMatch(worktrees, taskNumber): archived 제외, slug(branch) 또는 slug(displayName)에
//   (^|-)taskSlug(-|$) 포함 → lastActivityAt 최신 1개
// parseDoorayTaskFromBranch(branch, projects): project.code slug 를 길이 내림차순 정렬,
//   (^|-)codeSlug-(\d+)(-|$) 첫 매치 → {project, postNumber}
```

### 컴포넌트 인벤토리
| 컴포넌트/훅 | 번들 위치 | 역할 |
|---|---|---|
| `DoorayIcon` | index chunk | "D" 단일 path SVG `{className,size}` |
| `DoorayConnectDialog` | `dooray-connect-dialog-*` | 토큰(password)·API URL·웹 URL 3필드, 빈 URL → undefined, 연결 중 닫기 불가 |
| `openUrlPreferInternalBrowser`, `handleDoorayMarkdownLinkClick` | `dooray-open-link-*` | http(s) 링크를 활성 워크트리 인앱 브라우저 탭으로, 없으면 `shell.openUrl` |
| `useDoorayIssueList({withMilestones})` | `use-dooray-start-actions-*` | 프로젝트(localStorage `orca:dooray-selected-project`), 필터, 페이지(50), 정렬, 클라이언트 필터 |
| `DoorayIssueRow`, `TaskPageDooraySortControls`, `DoorayPriorityIndicator` | 〃 | 목록 행(그리드 `170px 1fr 128px 136px 80px 64px`), 정렬바, 우선순위 lucide 아이콘 |
| `useDoorayWorkflows`, `useDoorayComments`, `DoorayIssueCommentsSection`, `DoorayCommentComposer` | 〃 | 상태 변경(낙관적+롤백), 댓글 로드/작성(낙관적 "나") |
| `DoorayIssueWorkspace` | 〃 | 우측 Sheet(`w-[min(92vw,780px)]`) 상세: 헤더/메타/본문/댓글/aside(시작·열기·복사) |
| `useDoorayStartActions`, `resolveDoorayStartAction`, `startDoorayTaskInCurrentWorkspace`, `buildDoorayStartWorkspaceOptions`, `DoorayWorkspaceStartMenu`, `DoorayStartPrimaryButton` | 〃 | 작업 시작 흐름 |
| `TaskPageDoorayPanel`, `DoorayNewTaskDialog`(+`DoorayTagField`,`DoorayMilestoneField`,`DoorayMemberPicker`,`DoorayAttachmentField`,`groupDoorayTags`,`missingMandatoryTagGroups`,`toggleDoorayTag`,`pruneSelectOneTagIds`,`applyDoorayTaskExtras`) | `TaskPage-*` L39600–41320 | 작업 탭 패널, 업무 생성 |
| `DoorayTasksPanel`, `ConnectedDoorayTasksPanel`, `DoorayActiveTaskCard`, `CompactDoorayIssueRow` | `DoorayTasksPanel-*` | 우측 사이드바 탭 |
| `DoorayIntegrationCard` | `FeatureWallSetupChecklist-*` | 설정 카드 |
| `RepositoryDoorayStartSection` | `Settings-*` | 설정 → 저장소 → Dooray Task Start |
| `DoorayTaskBaseRefDialogProvider`, `useDoorayTaskBaseRefPrompt` | index chunk L194599–194830 | base 브랜치·fetch·서브모듈 선택 다이얼로그 |
| `buildDoorayLinkedWorkItem`, `getDoorayLinkedWorkItemBranchName`, `getDoorayIssueWorkspaceSeed` | index chunk L188180 | 새 워크스페이스 composer 연결 |

### 목록 동작
- 필터(서버): `assigned`(내 업무, 기본) / `all`(전체) / `done`(완료).
- 정렬 키: number, subject, workflow, milestone, priority, created, updated. 기본 `created desc`. 같은 열 재선택 → 방향 토글; 새 열 → created/updated 는 desc, 나머지 asc.
  서버 정렬은 created/updated 만; 모든 키를 클라이언트에서 다시 정렬(`sortDoorayIssues`: number 숫자, subject/workflow localeCompare, milestone null 뒤, priority rank(없음 뒤), 날짜 비교).
- 클라이언트 필터(작업 탭만): 단계(open 마일스톤, **이름**으로 매칭, 라벨 `name · YYYY.MM.DD~YYYY.MM.DD`), 업무 상태(workflowId), 우선순위(`none`=미지정). 파이프라인: 단계→상태→우선순위→정렬.
- 힌트: 필터 활성 → "불러온 업무 안에서만 필터링됩니다", client-only 정렬 → "불러온 업무 안에서만 정렬됩니다".
- `doorayPriorityRank`: highest 0 … lowest 4, none/unknown 5. 아이콘: highest `ChevronsUp` red-500, high `ChevronUp` orange-500, normal `Minus` muted, low `ChevronDown` sky-500, lowest `ChevronsDown` sky-400.
- 워크플로우 톤: closed emerald, working sky, backlog/registered muted.

### 업무 생성
- 열릴 때 초기화: 담당자 `[viewer]`, priority `none`, 템플릿/상태/단계 `__none__`.
- 프로젝트별 병렬 로드: tags, templates, workflows, milestones (각각 실패 시 `[]`).
- 템플릿 선택 → subject/body/guide 채움, tagIds `pruneSelectOneTagIds`, priority, to/cc(템플릿에 있을 때만 교체).
- 필수 태그 그룹 미선택 시 생성 버튼 비활성: `canSubmit = projectId && subject.trim() && missing.length===0 && !submitting`.
- selectOne 그룹은 라디오처럼 동작(`toggleDoorayTag`).
- 단계: "완료된 단계 포함" 체크 → closed 포함, 선택된 것은 항상 표시.
- 멤버 검색 300ms 디바운스.
- 첨부: 파일 선택 + 다이얼로그 열린 동안 document `paste` 의 `image/*` (이름 없으면 `paste-<ts>.png`), base64 32KB 청크 변환.
- 제출: createIssue → (상태 선택 시) setWorkflow → 첨부 순차 upload → getIssue → 닫고 `onCreated`. 실패는 토스트 집계.

### 작업 시작
- **새 워크트리**: `openModal('new-workspace-composer', {linkedWorkItem: buildDoorayLinkedWorkItem(issue), prefilledName: getDoorayIssueWorkspaceSeed(issue), telemetrySource:'sidebar'})`. composer 가 `doorayBranchName` 을 branch override 로 적용 → 정확히 `feature/<taskNumber>`.
- **현재 워크스페이스에서 시작** (`startDoorayTaskInCurrentWorkspace`):
  1. 대상 워크트리 결정(지정 or 활성) → 없으면 토스트.
  2. `branch = feature/${taskNumber}`, `submodulePaths = repo.doorayStart?.submodulePaths ?? []`.
  3. 이미 그 브랜치 & 서브모듈 없음 → 워크트리 이름을 업무 제목으로 바꾸고 활성화, "이미 … 브랜치입니다".
  4. `window.api.taskBranch` 없으면(웹 클라이언트) "사용할 수 없습니다".
  5. base-ref 다이얼로그 → cancel 이면 중단.
  6. `taskBranch.inspect` → 더러우면 Stash 후 전환 / 버리고 전환(2차 확인) / 전환 안 함.
  7. `taskBranch.switch({...,branch, baseRef?, fetchBase?})` (fetchBase 는 baseRef 있을 때만).
  8. 이름 변경 + 활성화, 결과 토스트(`skipped-missing` 있으면 경고).
- 워크스페이스 선택지: 모든 저장소의 archived 아닌 워크트리, 활성 → startRepo 소속 → 나머지 순.
- 업무에 매칭 워크스페이스가 있으면 기본 버튼이 "워크스페이스 열기"로 바뀜.

### `taskBranch:*` (main, 로컬 전용)
- `listSubmodules({worktreePath})`: `git config --file .gitmodules --list` 의 `submodule.X.path=`.
- `inspect({worktreePath, submodulePaths?})`: 대상별 `git status --porcelain` (서브모듈 포함 시 부모는 `--ignore-submodules=all`), `??` 제외 라인 수.
- `stash({..., message})`: 서브모듈부터 역순 `git stash push -m <msg>`, 깨끗한 곳 skip.
- `discard(...)`: 역순 `git reset --hard HEAD --` (untracked 유지).
- `switch({..., branch, baseRef?, fetchBase?})`: 부모→서브모듈 순. 체크아웃 안 된 서브모듈 `skipped-missing`, 현재 브랜치면 `already-on`. 브랜치 없음 & fetchBase → `git fetch <remote> <branch>`(첫 `/` 기준 분리, 실패 무시). `baseRef^{commit}` 검증되면 startPoint. `checkoutBranch(path, branch, opts, {create, startPoint})`.
- 검증: submodulePaths 에 `..` 금지, baseRef `-` 시작 금지.

### 업스트림 파일 훅 지점 (원본 기준, 포크 경로는 계획서 참조)
- `task-providers.ts`: `'dooray'` 추가, `isTaskProviderAvailable('dooray') → true`. (원본은 Jira 를 목록에서 제거했음)
- `task-page-localized-options.tsx`: dooray 소스 옵션 맨 앞.
- `task-source-context-summary.ts`: dooray 는 jira 와 같은 account-backed, `accountLabel: null`.
- `task-page-list-chrome-visibility.ts`: dooray → false.
- `TaskPage.tsx`: 상태 체크, 연결 CTA("두레이 연결"/"두레이 숨기기"), `TaskPageDoorayPanel`.
- `SidebarTaskNavButton.tsx`: "두레이 업무 열기" 바로가기.
- `settings/TasksPane.tsx`, `IntegrationsPane.tsx`, `use-integration-provider-status-refresh.ts`, `feature-wall/use-integration-connection-status.ts`.
- 우측 사이드바: 탭 `'dooray-tasks'` (folder 워크스페이스에서도 표시, gitOnly 아님), lazy `DoorayTasksPanel`.
- `confirmation-dialog.tsx`: `alternateLabel`/`alternateVariant`, resolver `boolean | 'alternate'`.
- `App.tsx`: `DoorayTaskBaseRefDialogProvider` 를 `ConfirmationDialogProvider` 안쪽에.
- `useComposerState.ts`: `getLinearLinkedWorkItemBranchName(seed) ?? getDoorayLinkedWorkItemBranchName(seed)`.
- `RepositoryPane.tsx`: `RepositoryDoorayStartSection`.
- 온보딩: dooray / dooray_features 단계 (FLOW_VERSION 4→6, FINAL_STEP 5→7).

## 6. i18n

- 전체 키·영문·한국어: [`2026-09-30-dooray-i18n.tsv`](./2026-09-30-dooray-i18n.tsv) (218 행).
- 재사용 기존 키: `TaskPage.jiraSortBy`, `jiraSortAscending`, `jiraSortDescending`, `jiraToggleSortDirection`, `settings.task.tracker.integration.cards.*`.
- ja/zh/es 는 원본에서도 영문 복사본.

## 7. 원본의 알려진 quirk (포트에서 판단 필요)

- Dooray linked work item 을 `jiraIdentifier` 필드에 실어 보냄 → `getWorkspaceSourceProvider()` 가 `'jira'` 로 인식(사이드바 카드가 Jira 로 표시).
- 사이드바 카운트 `issues.length / totalCount` 는 필터 후 개수 vs 서버 총계.
- RPC repo-update zod 가 `doorayStart.submodulePaths` 를 strip 함(원본 버그).
- 경로 세그먼트 미인코딩.
- 전역 `electron.net.fetch` 직접 사용 — 포크에는 `global-fetch-call-site-audit.test.ts` 가 있어 `getMainHttpClient()` 로 바꿔야 함.
