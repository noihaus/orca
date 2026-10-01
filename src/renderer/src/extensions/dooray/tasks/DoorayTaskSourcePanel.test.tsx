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
import { DoorayTaskSourcePanel } from './DoorayTaskSourcePanel'

const api = vi.hoisted(() => ({
  listProjects: vi.fn(),
  listIssues: vi.fn(),
  listMilestones: vi.fn(),
  listWorkflows: vi.fn(),
  getIssue: vi.fn(),
  issueComments: vi.fn(),
  addIssueComment: vi.fn(),
  setWorkflow: vi.fn()
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

function renderPanel(): void {
  render(
    <TooltipProvider>
      <DoorayTaskSourcePanel />
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
    expect(screen.queryByRole('button', { name: /Start workspace from/ })).toBeNull()

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
    expect(screen.queryByRole('button', { name: /^Start workspace/ })).toBeNull()

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
