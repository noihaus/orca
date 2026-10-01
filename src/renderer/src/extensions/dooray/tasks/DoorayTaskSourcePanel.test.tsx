// @vitest-environment happy-dom

import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Worktree } from '../../../../../shared/worktree/types'
import type {
  DoorayIssue,
  DoorayStatus
} from '../../../../../shared/extensions/dooray/dooray-types'
import { INSTALLED_TASK_PROVIDER_EXTENSIONS } from '../../../../../shared/extensions/installed-extension-manifest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { i18n } from '@/i18n/i18n'
import { getProviderRuntimeContextKey } from '@/lib/provider-runtime-context'
import { useAppStore } from '@/store'
import { findExtensionTaskSource } from '../../extension-slot-hooks'
import { INSTALLED_RENDERER_EXTENSIONS } from '../../installed-renderer-extensions'
import {
  getDoorayIssueWorkspaceSeed,
  buildDoorayLinkedWorkItem
} from '../lib/dooray-linked-work-item'
import { DoorayTaskSourcePanel } from './DoorayTaskSourcePanel'

const toastError = vi.hoisted(() => vi.fn())
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }))
const activateAndRevealWorktree = vi.hoisted(() => vi.fn())
vi.mock('@/lib/worktree-activation', () => ({ activateAndRevealWorktree }))

const api = vi.hoisted(() => ({
  listProjects: vi.fn(),
  listIssues: vi.fn(),
  listMilestones: vi.fn(),
  listWorkflows: vi.fn(),
  getIssue: vi.fn(),
  issueComments: vi.fn(),
  addIssueComment: vi.fn(),
  setWorkflow: vi.fn(),
  listTags: vi.fn(),
  listTemplates: vi.fn(),
  createIssue: vi.fn(),
  uploadIssueFile: vi.fn()
}))
vi.mock('../use-dooray-api', () => ({ useDoorayApi: () => api }))

const viewer = { id: 'u1', name: 'Kim', userCode: 'kim', email: null }
const connected: DoorayStatus = { connected: true, viewer, apiUrl: 'https://api.dooray.com' }
const disconnected: DoorayStatus = { connected: false, viewer: null }
const updateSettings = vi.fn()
const checkDoorayConnection = vi.fn()

function seed(status: DoorayStatus, checked = true): void {
  useAppStore.setState({
    doorayStatus: status,
    doorayStatusChecked: checked,
    doorayStatusContextKey: getProviderRuntimeContextKey(useAppStore.getState().settings),
    checkDoorayConnection,
    updateSettings
  })
}

function issue(n: number): DoorayIssue {
  return {
    id: `p${n}`,
    projectId: 'proj-a',
    projectCode: 'A',
    number: n,
    taskNumber: `A/${n}`,
    subject: `Task ${n}`,
    workflowId: 'w1',
    workflowName: 'Doing',
    workflowClass: 'working',
    assignees: ['Kim'],
    priority: 'high',
    milestoneName: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    url: 'https://t.dooray.com/project/tasks/1'
  }
}

const onStartNewWorkspace = vi.fn()

function renderPanel(): void {
  render(
    <TooltipProvider>
      <DoorayTaskSourcePanel onStartNewWorkspace={onStartNewWorkspace} startRepo={null} />
    </TooltipProvider>
  )
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
  vi.clearAllMocks()
  window.localStorage.clear()
  updateSettings.mockResolvedValue(undefined)
  checkDoorayConnection.mockResolvedValue(undefined)
  api.listProjects.mockResolvedValue([{ id: 'proj-a', code: 'A' }])
  api.listIssues.mockResolvedValue({ totalCount: 2, issues: [issue(1), issue(2)] })
  api.listMilestones.mockResolvedValue([])
  api.listWorkflows.mockResolvedValue([])
  api.getIssue.mockResolvedValue(null)
  api.issueComments.mockResolvedValue([])
  api.listTags.mockResolvedValue([])
  api.listTemplates.mockResolvedValue([])
})
afterEach(cleanup)

describe('DoorayTaskSourcePanel', () => {
  it('shows a spinner while the status is unchecked', () => {
    seed(disconnected, false)
    renderPanel()
    expect(screen.getByTestId('dooray-status-loading')).toBeTruthy()
  })

  it('offers connect and hide when disconnected', async () => {
    useAppStore.setState({
      settings: {
        ...useAppStore.getState().settings!,
        visibleTaskProviders: ['dooray', 'github', 'jira'],
        defaultTaskSource: 'dooray'
      }
    })
    seed(disconnected)
    renderPanel()
    expect(screen.getByRole('button', { name: 'Connect Dooray' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Hide Dooray' }))
    await waitFor(() =>
      expect(updateSettings).toHaveBeenCalledWith({
        visibleTaskProviders: ['github', 'jira'],
        defaultTaskSource: 'github'
      })
    )
    expect(api.listProjects).not.toHaveBeenCalled()
  })

  it('lists issues when connected and refetches on filter change', async () => {
    seed(connected)
    renderPanel()
    expect(await screen.findByText('Task 1')).toBeTruthy()
    expect(screen.getAllByTestId('dooray-issue-row')).toHaveLength(2)
    expect(screen.getByText('2 / 2 shown')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() =>
      expect(api.listIssues).toHaveBeenLastCalledWith(
        expect.objectContaining({ filter: 'done', page: 0 })
      )
    )
    expect(screen.getByRole('button', { name: 'Done' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('opens the detail sheet from a row and a workflow change patches the row', async () => {
    seed(connected)
    api.getIssue.mockResolvedValue({ ...issue(1), body: 'Full body text' })
    api.issueComments.mockResolvedValue([
      { id: 'c1', body: 'First comment', createdAt: '2026-09-02T00:00:00Z', authorName: 'Lee' }
    ])
    api.listWorkflows.mockResolvedValue([{ id: 'w9', name: 'Finished', workflowClass: 'closed' }])
    api.setWorkflow.mockResolvedValue({ ok: true })
    renderPanel()
    fireEvent.click((await screen.findAllByTestId('dooray-issue-row'))[0])

    expect(await screen.findByText('Full body text')).toBeTruthy()
    expect(await screen.findByText('First comment')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Start workspace$/ }).length).toBeGreaterThan(0)

    const pill = await screen.findByRole('button', { name: 'Doing' })
    await waitFor(() => expect(pill).toHaveProperty('disabled', false))
    fireEvent.click(pill)
    fireEvent.click(await screen.findByRole('button', { name: 'Finished' }))
    await waitFor(() =>
      expect(api.setWorkflow).toHaveBeenCalledWith({
        projectId: 'proj-a',
        postId: 'p1',
        workflowId: 'w9'
      })
    )
    await waitFor(() =>
      expect(screen.getAllByTestId('dooray-issue-row')[0].textContent).toContain('Finished')
    )
  })

  it('creates a task from the toolbar, refreshes, and opens it even outside the filter', async () => {
    seed(connected)
    const created = { ...issue(99), subject: 'Brand new', body: 'Created body' }
    api.createIssue.mockResolvedValue({ ok: true, id: 'p99' })
    api.getIssue.mockResolvedValue(created)
    renderPanel()
    await screen.findByText('Task 1')
    const listCalls = api.listIssues.mock.calls.length

    fireEvent.click(screen.getByRole('button', { name: 'New task' }))
    fireEvent.change(await screen.findByPlaceholderText('Task subject'), {
      target: { value: 'Brand new' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }))

    expect(await screen.findByText('Created body')).toBeTruthy()
    expect(api.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'proj-a', subject: 'Brand new', toMemberIds: ['u1'] })
    )
    expect(api.listIssues.mock.calls.length).toBeGreaterThan(listCalls)
    expect(screen.queryByPlaceholderText('Task subject')).toBeNull()
  })

  it('loads the next page from the load-more button', async () => {
    seed(connected)
    api.listIssues
      .mockResolvedValueOnce({
        totalCount: 60,
        issues: Array.from({ length: 50 }, (_, i) => issue(i + 1))
      })
      .mockResolvedValueOnce({
        totalCount: 60,
        issues: Array.from({ length: 10 }, (_, i) => issue(i + 51))
      })
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Load more' }))
    await waitFor(() => expect(screen.getAllByTestId('dooray-issue-row')).toHaveLength(60))
    expect(api.listIssues).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
  })

  it('shows a load error', async () => {
    seed(connected)
    api.listIssues.mockRejectedValue(new Error('Not connected to Dooray.'))
    renderPanel()
    expect((await screen.findByRole('alert')).textContent).toBe('Not connected to Dooray.')
  })
})

function seedWorktree(branch: string): void {
  useAppStore.setState({
    worktreesByRepo: {
      'repo-1': [
        {
          id: 'repo-1::/wt',
          repoId: 'repo-1',
          path: '/wt',
          branch,
          head: 'abc',
          isBare: false,
          isMainWorktree: false,
          displayName: 'wt',
          comment: '',
          linkedIssue: null,
          linkedPR: null,
          linkedLinearIssue: null,
          isArchived: false,
          isUnread: false,
          isPinned: false,
          sortOrder: 0,
          lastActivityAt: 1
        } satisfies Worktree
      ]
    }
  })
}

describe('starting a workspace from a task', () => {
  beforeEach(() => useAppStore.setState({ worktreesByRepo: {} }))

  it('hands the linked item and seed name to onStartNewWorkspace from the row', async () => {
    seed(connected)
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Start workspace from A/2' }))
    expect(onStartNewWorkspace).toHaveBeenCalledWith(
      buildDoorayLinkedWorkItem(issue(2)),
      getDoorayIssueWorkspaceSeed(issue(2))
    )
  })

  it('shows Open workspace for a task that already has a workspace', async () => {
    seed(connected)
    seedWorktree('feature/A/1')
    activateAndRevealWorktree.mockReturnValue({})
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Open workspace for A/1' }))
    expect(activateAndRevealWorktree).toHaveBeenCalledWith('repo-1::/wt')
    expect(onStartNewWorkspace).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Start workspace from A/2' })).toBeTruthy()
  })

  it('toasts when the workspace cannot be opened', async () => {
    seed(connected)
    seedWorktree('feature/A/1')
    activateAndRevealWorktree.mockReturnValue(false)
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Open workspace for A/1' }))
    expect(toastError).toHaveBeenCalledWith('Unable to open the workspace for this task.')
  })

  it('makes the sheet primary action Open workspace when one exists', async () => {
    seed(connected)
    seedWorktree('feature/A/1')
    activateAndRevealWorktree.mockReturnValue({})
    renderPanel()
    fireEvent.click((await screen.findAllByTestId('dooray-issue-row'))[0])
    const [open] = await screen.findAllByRole('button', { name: 'Open workspace' })
    fireEvent.click(open)
    expect(activateAndRevealWorktree).toHaveBeenCalledWith('repo-1::/wt')
  })

  it('starts a workspace from the sheet for an unattached task', async () => {
    seed(connected)
    renderPanel()
    fireEvent.click((await screen.findAllByTestId('dooray-issue-row'))[1])
    fireEvent.click((await screen.findAllByRole('button', { name: /^Start workspace$/ }))[0])
    expect(onStartNewWorkspace).toHaveBeenCalledWith(
      buildDoorayLinkedWorkItem(issue(2)),
      getDoorayIssueWorkspaceSeed(issue(2))
    )
  })
})

describe('repository start mode', () => {
  it('existing-workspace mode makes "Start in current workspace" primary and new worktree secondary', async () => {
    seed(connected)
    const repo = {
      id: 'repo-1',
      path: '/repo',
      displayName: 'App',
      badgeColor: '',
      addedAt: 0,
      extensionSettings: { dooray: { mode: 'existing-workspace' } }
    }
    useAppStore.setState({ repos: [repo], worktreesByRepo: {}, activeWorktreeId: null })
    render(
      <TooltipProvider>
        <DoorayTaskSourcePanel onStartNewWorkspace={onStartNewWorkspace} startRepo={repo} />
      </TooltipProvider>
    )
    fireEvent.click((await screen.findAllByTestId('dooray-issue-row'))[1])
    const [primary] = await screen.findAllByRole('button', { name: /Start in current workspace/ })
    // No workspace to switch, so the primary explains itself instead of running.
    expect(primary.hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /^Start workspace$/ }))
    expect(onStartNewWorkspace).toHaveBeenCalledWith(
      buildDoorayLinkedWorkItem(issue(2)),
      getDoorayIssueWorkspaceSeed(issue(2))
    )
  })
})

describe('Dooray task source registration', () => {
  it('registers under the manifest provider id with a lazy panel', async () => {
    const source = findExtensionTaskSource('dooray', INSTALLED_RENDERER_EXTENSIONS)
    expect(source).not.toBeNull()
    expect(INSTALLED_TASK_PROVIDER_EXTENSIONS.map((entry) => entry.id)).toContain(
      source?.providerId
    )
    expect(source?.label()).toBe('Dooray')
    expect(source?.navShortcutLabel()).toBe('Open Dooray tasks')

    seed(disconnected, false)
    const status = renderHook(() => source!.useStatus())
    expect(status.result.current).toEqual({ ready: false, connected: false })
    act(() => seed(connected))
    expect(status.result.current).toEqual({ ready: true, connected: true })

    seed(disconnected)
    source?.ensureStatus()
    expect(checkDoorayConnection).toHaveBeenCalled()

    const Panel = source!.Panel
    render(
      <TooltipProvider>
        <Panel onStartNewWorkspace={vi.fn()} startRepo={null} />
      </TooltipProvider>
    )
    expect(await screen.findByRole('button', { name: 'Hide Dooray' })).toBeTruthy()
  })
})
