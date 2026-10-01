// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import type { Repo } from '../../../../../shared/repo-types'
import type { Worktree } from '../../../../../shared/worktree/types'
import { makeDoorayIssue } from '../issue/dooray-issue-fixture'
import { startDoorayTaskInCurrentWorkspace } from './dooray-start-in-current-workspace'

const mocks = vi.hoisted(() => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  activate: vi.fn(),
  isWebClient: vi.fn(() => false)
}))
vi.mock('sonner', () => ({ toast: mocks.toast }))
vi.mock('@/lib/worktree-activation', () => ({ activateAndRevealWorktree: mocks.activate }))
vi.mock('@/lib/web-client-location', () => ({ isWebClientLocation: mocks.isWebClient }))

const taskBranch = {
  listSubmodules: vi.fn(),
  inspect: vi.fn(),
  stash: vi.fn(),
  discard: vi.fn(),
  switch: vi.fn()
}
const updateWorktreeMeta = vi.fn()
const issue = makeDoorayIssue({ taskNumber: 'A/7', subject: 'Fix login' })
const BRANCH = 'feature/A/7'

function makeRepo(overrides: Partial<Repo> = {}): Repo {
  return {
    id: 'repo-1',
    path: '/repo',
    displayName: 'App',
    badgeColor: '',
    addedAt: 0,
    ...overrides
  }
}

function makeWorktree(overrides: Partial<Worktree> = {}): Worktree {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: fixture carries only the fields the flow reads
  return {
    id: 'repo-1::/repo',
    repoId: 'repo-1',
    path: '/repo',
    branch: 'refs/heads/main',
    displayName: 'main',
    isArchived: false,
    ...overrides
  } as Worktree
}

function seed({
  repo = makeRepo(),
  worktree = makeWorktree(),
  activeRuntimeEnvironmentId = null
}: {
  repo?: Repo
  worktree?: Worktree | null
  activeRuntimeEnvironmentId?: string | null
} = {}): void {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: partial store seed; only the fields the flow reads
  useAppStore.setState({
    repos: [repo],
    settings: { ...useAppStore.getState().settings, activeRuntimeEnvironmentId },
    activeWorktreeId: worktree?.id ?? null,
    getKnownWorktreeById: (id: string) => (worktree && worktree.id === id ? worktree : undefined),
    updateWorktreeMeta
  } as never)
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
  vi.clearAllMocks()
  mocks.isWebClient.mockReturnValue(false)
  Object.assign(window, { api: { dooray: { taskBranch } } })
  taskBranch.inspect.mockResolvedValue([])
  taskBranch.stash.mockResolvedValue(undefined)
  taskBranch.discard.mockResolvedValue(undefined)
  taskBranch.switch.mockResolvedValue([{ submodulePath: '', status: 'created' }])
  updateWorktreeMeta.mockResolvedValue({ ok: true })
})

const useCurrent = vi.fn(async () => ({ baseRef: null }))

describe('startDoorayTaskInCurrentWorkspace', () => {
  it('step 1: toasts when there is no target workspace', async () => {
    seed({ worktree: null })
    await startDoorayTaskInCurrentWorkspace(issue)
    expect(mocks.toast.error).toHaveBeenCalledWith('No active workspace to start this task in.')
    await startDoorayTaskInCurrentWorkspace(issue, { worktreeId: 'gone' })
    expect(mocks.toast.error).toHaveBeenLastCalledWith(
      'The configured target workspace was not found.'
    )
    expect(taskBranch.switch).not.toHaveBeenCalled()
  })

  it('step 2: uses feature/<taskNumber> and the repo submodule setting', async () => {
    seed({
      repo: makeRepo({
        extensionSettings: { dooray: { mode: 'existing-workspace', submodulePaths: ['libs/a'] } }
      })
    })
    await startDoorayTaskInCurrentWorkspace(issue)
    expect(taskBranch.switch).toHaveBeenCalledWith({
      worktreePath: '/repo',
      submodulePaths: ['libs/a'],
      branch: BRANCH
    })
  })

  it('step 3: already on the branch only renames and activates', async () => {
    seed({ worktree: makeWorktree({ branch: `refs/heads/${BRANCH}` }) })
    await startDoorayTaskInCurrentWorkspace(issue, { promptBaseRef: useCurrent })
    expect(updateWorktreeMeta).toHaveBeenCalledWith('repo-1::/repo', { displayName: 'Fix login' })
    expect(mocks.activate).toHaveBeenCalledWith('repo-1::/repo')
    expect(mocks.toast.success).toHaveBeenCalledWith(`Already on ${BRANCH}.`)
    expect(useCurrent).not.toHaveBeenCalled()
    expect(taskBranch.inspect).not.toHaveBeenCalled()
  })

  it('step 4: the web client reports unavailable even though window.api.dooray is proxied', async () => {
    mocks.isWebClient.mockReturnValue(true)
    seed()
    await startDoorayTaskInCurrentWorkspace(issue, { promptBaseRef: useCurrent })
    expect(mocks.toast.error).toHaveBeenCalledWith(
      'Branch switching is unavailable in this client.'
    )
    expect(useCurrent).not.toHaveBeenCalled()
    expect(taskBranch.inspect).not.toHaveBeenCalled()
  })

  it('step 4: SSH, remote runtime and folder workspaces are refused with a reason', async () => {
    seed({ repo: makeRepo({ connectionId: 'ssh-1' }) })
    await startDoorayTaskInCurrentWorkspace(issue)
    expect(mocks.toast.error).toHaveBeenLastCalledWith(expect.stringContaining('not SSH'))
    seed({ activeRuntimeEnvironmentId: 'env-1' })
    await startDoorayTaskInCurrentWorkspace(issue)
    expect(mocks.toast.error).toHaveBeenLastCalledWith(
      expect.stringContaining('remote Orca server')
    )
    seed({ repo: makeRepo({ kind: 'folder' }) })
    await startDoorayTaskInCurrentWorkspace(issue)
    expect(mocks.toast.error).toHaveBeenLastCalledWith(expect.stringContaining('folder'))
    expect(taskBranch.inspect).not.toHaveBeenCalled()
  })

  it('step 5: cancelling the base dialog stops before touching git', async () => {
    seed()
    const promptBaseRef = vi.fn(async () => 'cancel' as const)
    await startDoorayTaskInCurrentWorkspace(issue, { promptBaseRef })
    expect(promptBaseRef).toHaveBeenCalledWith({
      branch: BRANCH,
      repoId: 'repo-1',
      worktreePath: '/repo',
      defaultSubmodulePaths: []
    })
    expect(taskBranch.inspect).not.toHaveBeenCalled()
    expect(taskBranch.switch).not.toHaveBeenCalled()
  })

  it('step 6: stash path stashes with an "orca: <branch>" message', async () => {
    seed()
    taskBranch.inspect.mockResolvedValue([{ submodulePath: '', changeCount: 2 }])
    const promptDirtyWorkspace = vi.fn(async () => 'stash' as const)
    await startDoorayTaskInCurrentWorkspace(issue, { promptDirtyWorkspace })
    expect(promptDirtyWorkspace).toHaveBeenCalledWith({
      branch: BRANCH,
      workspaceLabel: 'App',
      dirtyTargets: [{ submodulePath: '', changeCount: 2 }]
    })
    expect(taskBranch.stash).toHaveBeenCalledWith({
      worktreePath: '/repo',
      submodulePaths: [],
      message: `orca: ${BRANCH}`
    })
    expect(taskBranch.switch).toHaveBeenCalled()
  })

  it('step 6: discard path discards; "Don\'t switch" leaves the workspace alone', async () => {
    seed()
    taskBranch.inspect.mockResolvedValue([{ submodulePath: '', changeCount: 1 }])
    await startDoorayTaskInCurrentWorkspace(issue, {
      promptDirtyWorkspace: async () => 'discard'
    })
    expect(taskBranch.discard).toHaveBeenCalledWith({ worktreePath: '/repo', submodulePaths: [] })
    expect(taskBranch.stash).not.toHaveBeenCalled()
    taskBranch.switch.mockClear()
    await startDoorayTaskInCurrentWorkspace(issue, { promptDirtyWorkspace: async () => 'cancel' })
    expect(taskBranch.switch).not.toHaveBeenCalled()
  })

  it('step 7: fetchBase is sent only together with baseRef', async () => {
    seed()
    await startDoorayTaskInCurrentWorkspace(issue, {
      promptBaseRef: async () => ({ baseRef: null, fetchBase: true })
    })
    expect(taskBranch.switch).toHaveBeenLastCalledWith({
      worktreePath: '/repo',
      submodulePaths: [],
      branch: BRANCH
    })
    await startDoorayTaskInCurrentWorkspace(issue, {
      promptBaseRef: async () => ({
        baseRef: 'origin/main',
        fetchBase: true,
        submodulePaths: ['libs/a']
      })
    })
    expect(taskBranch.switch).toHaveBeenLastCalledWith({
      worktreePath: '/repo',
      submodulePaths: ['libs/a'],
      branch: BRANCH,
      baseRef: 'origin/main',
      fetchBase: true
    })
  })

  it('step 8: renames, activates and reports success', async () => {
    seed()
    await startDoorayTaskInCurrentWorkspace(issue)
    expect(updateWorktreeMeta).toHaveBeenCalledWith('repo-1::/repo', { displayName: 'Fix login' })
    expect(mocks.activate).toHaveBeenCalledWith('repo-1::/repo')
    expect(mocks.toast.success).toHaveBeenCalledWith(`Switched to ${BRANCH}.`)
  })

  it('step 8: warns about skipped-missing and failed submodules', async () => {
    seed()
    taskBranch.switch.mockResolvedValue([
      { submodulePath: '', status: 'switched' },
      { submodulePath: 'libs/missing', status: 'skipped-missing' },
      { submodulePath: 'libs/bad', status: 'failed', error: 'conflict' }
    ])
    await startDoorayTaskInCurrentWorkspace(issue)
    expect(mocks.toast.warning).toHaveBeenCalledWith(
      `Switched to ${BRANCH}. Not checked out here: libs/missing`
    )
    expect(mocks.toast.warning).toHaveBeenCalledWith(expect.stringContaining('libs/bad: conflict'))
    expect(mocks.toast.success).not.toHaveBeenCalledWith(`Switched to ${BRANCH}.`)
    expect(updateWorktreeMeta).toHaveBeenCalled()
  })

  it('a parent switch failure surfaces the error and does not rename', async () => {
    seed()
    taskBranch.switch.mockRejectedValue(new Error('Could not switch the workspace'))
    await startDoorayTaskInCurrentWorkspace(issue)
    expect(mocks.toast.error).toHaveBeenCalledWith('Could not switch the workspace')
    expect(updateWorktreeMeta).not.toHaveBeenCalled()
  })
})
