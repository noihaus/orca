// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import type { Repo } from '../../../../../shared/repo-types'
import type { Worktree } from '../../../../../shared/worktree/types'
import { makeDoorayIssue } from '../issue/dooray-issue-fixture'
import { createDoorayDirtyWorkspacePrompt } from './dooray-dirty-workspace-prompt'
import { useDoorayStartActions } from './use-dooray-start-actions'

const mocks = vi.hoisted(() => ({ start: vi.fn(), isWebClient: vi.fn(() => false) }))
vi.mock('./dooray-start-in-current-workspace', () => ({
  startDoorayTaskInCurrentWorkspace: mocks.start
}))
vi.mock('@/lib/web-client-location', () => ({ isWebClientLocation: mocks.isWebClient }))

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

function makeWorktree(id: string, repoId = 'repo-1', overrides: Partial<Worktree> = {}): Worktree {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: fixture carries only the fields the hook reads
  return {
    id,
    repoId,
    path: `/${id}`,
    branch: `refs/heads/${id}`,
    displayName: id,
    isArchived: false,
    ...overrides
  } as Worktree
}

function seed(
  repos: Repo[],
  worktreesByRepo: Record<string, Worktree[]>,
  active: string | null
): void {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: partial store seed; only the fields the hook reads
  useAppStore.setState({
    repos,
    worktreesByRepo,
    activeWorktreeId: active,
    settings: { ...useAppStore.getState().settings, activeRuntimeEnvironmentId: null }
  } as never)
}

const startNew = vi.fn()
const issue = makeDoorayIssue()

beforeEach(async () => {
  await i18n.changeLanguage('en')
  vi.clearAllMocks()
  mocks.isWebClient.mockReturnValue(false)
})

describe('useDoorayStartActions', () => {
  it('defaults to a new worktree with "start in current" as the secondary action', () => {
    const repo = makeRepo()
    seed([repo], { 'repo-1': [makeWorktree('wt-a')] }, 'wt-a')
    const { result } = renderHook(() => useDoorayStartActions(repo, startNew))
    expect(result.current.primaryStartKind).toBe('new-worktree')
    expect(result.current.onPrimaryStart).toBe(startNew)
    expect(result.current.secondaryStart.kind).toBe('existing-workspace')
    expect(result.current.secondaryStart.disabledReason).toBeUndefined()
    result.current.secondaryStart.run(issue)
    expect(mocks.start).toHaveBeenCalledWith(issue, expect.objectContaining({ worktreeId: 'wt-a' }))
  })

  it('existing-workspace mode targets the configured worktree and offers new worktree second', () => {
    const repo = makeRepo({
      extensionSettings: { dooray: { mode: 'existing-workspace', targetWorktreeId: 'wt-b' } }
    })
    const other = makeRepo({ id: 'repo-2', displayName: 'Other' })
    seed(
      [repo, other],
      {
        'repo-1': [makeWorktree('wt-a'), makeWorktree('wt-b')],
        'repo-2': [makeWorktree('wt-c', 'repo-2')]
      },
      'wt-c'
    )
    const { result } = renderHook(() => useDoorayStartActions(repo, startNew))
    expect(result.current.primaryStartKind).toBe('existing-workspace')
    expect(result.current.secondaryStart).toEqual({ kind: 'new-worktree', run: startNew })
    expect(result.current.needsWorkspacePicker).toBe(true)
    // Active first, then the start repo's, then the rest.
    expect(result.current.workspaceStart.options.map((option) => option.id)).toEqual([
      'wt-c',
      'wt-a',
      'wt-b'
    ])
    expect(result.current.workspaceStart.options[2].isConfiguredTarget).toBe(true)
    result.current.onPrimaryStart(issue)
    expect(mocks.start).toHaveBeenCalledWith(issue, expect.objectContaining({ worktreeId: 'wt-b' }))
    result.current.workspaceStart.onSelect(issue, 'wt-a')
    expect(mocks.start).toHaveBeenLastCalledWith(
      issue,
      expect.objectContaining({ worktreeId: 'wt-a' })
    )
  })

  it('disables "start in current" with a reason for an SSH workspace', () => {
    const repo = makeRepo({ connectionId: 'ssh-1' })
    seed([repo], { 'repo-1': [makeWorktree('wt-a')] }, 'wt-a')
    const { result } = renderHook(() => useDoorayStartActions(repo, startNew))
    expect(result.current.secondaryStart.disabledReason).toMatch(/not SSH/)
  })

  it('disables the existing-workspace primary in the web client and for folders', () => {
    mocks.isWebClient.mockReturnValue(true)
    const repo = makeRepo({ extensionSettings: { dooray: { mode: 'existing-workspace' } } })
    seed([repo], { 'repo-1': [makeWorktree('wt-a')] }, 'wt-a')
    const web = renderHook(() => useDoorayStartActions(repo, startNew))
    expect(web.result.current.primaryDisabledReason).toBe(
      'Branch switching is unavailable in this client.'
    )
    mocks.isWebClient.mockReturnValue(false)
    const folder = makeRepo({ kind: 'folder' })
    seed([folder], { 'repo-1': [makeWorktree('wt-a')] }, 'wt-a')
    const local = renderHook(() => useDoorayStartActions(folder, startNew))
    expect(local.result.current.secondaryStart.disabledReason).toMatch(/folder/)
  })

  it('says to open a workspace when there is none', () => {
    const repo = makeRepo()
    seed([repo], {}, null)
    const { result } = renderHook(() => useDoorayStartActions(repo, startNew))
    expect(result.current.secondaryStart.disabledReason).toBe(
      'No active workspace — open one first.'
    )
  })
})

describe('createDoorayDirtyWorkspacePrompt', () => {
  const args = {
    branch: 'feature/A/1',
    workspaceLabel: 'workA · iOS_Dooray',
    dirtyTargets: [
      { submodulePath: '', changeCount: 2 },
      { submodulePath: 'libs/a', changeCount: 1 }
    ]
  }

  it('maps confirm to stash and cancel to cancel', async () => {
    const confirm = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    const prompt = createDoorayDirtyWorkspacePrompt(confirm)
    await expect(prompt(args)).resolves.toBe('stash')
    await expect(prompt(args)).resolves.toBe('cancel')
    expect(confirm.mock.calls[0][0]).toMatchObject({
      confirmLabel: 'Stash and switch',
      alternateLabel: 'Discard and switch',
      alternateVariant: 'destructive',
      cancelLabel: "Don't switch"
    })
    expect(confirm.mock.calls[0][0].description).toContain('workA · iOS_Dooray (2), libs/a (1)')
    expect(confirm.mock.calls[0][0].description).toContain('Untracked files are kept')
  })

  it('discard needs a second, destructive confirmation', async () => {
    const confirm = vi.fn().mockResolvedValueOnce('alternate').mockResolvedValueOnce(true)
    await expect(createDoorayDirtyWorkspacePrompt(confirm)(args)).resolves.toBe('discard')
    expect(confirm.mock.calls[1][0]).toMatchObject({
      confirmLabel: 'Discard permanently',
      confirmVariant: 'destructive'
    })
    expect(confirm.mock.calls[1][0].description).toContain('untracked) files are kept')
    expect(confirm.mock.calls[1][0].description).toContain('workA · iOS_Dooray (2)')
    const declined = vi.fn().mockResolvedValueOnce('alternate').mockResolvedValueOnce(false)
    await expect(createDoorayDirtyWorkspacePrompt(declined)(args)).resolves.toBe('cancel')
  })
})
