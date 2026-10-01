// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DoorayStatus } from '../../../../../shared/extensions/dooray/dooray-types'
import { TooltipProvider } from '@/components/ui/tooltip'
import { i18n } from '@/i18n/i18n'
import { getProviderRuntimeContextKey } from '@/lib/provider-runtime-context'
import { useAppStore } from '@/store'
import { makeDoorayIssue } from '../issue/dooray-issue-fixture'
import { DoorayTasksPanel } from './DoorayTasksPanel'

const api = vi.hoisted(() => ({
  listProjects: vi.fn(),
  listIssues: vi.fn(),
  listMilestones: vi.fn(),
  listWorkflows: vi.fn(),
  getIssue: vi.fn(),
  getIssueByNumber: vi.fn(),
  issueComments: vi.fn()
}))
vi.mock('../use-dooray-api', () => ({ useDoorayApi: () => api }))
vi.mock('@/lib/worktree-activation', () => ({ activateAndRevealWorktree: vi.fn() }))

const connected: DoorayStatus = {
  connected: true,
  viewer: { id: 'u1', name: 'Kim', userCode: 'kim', email: null },
  apiUrl: 'https://api.dooray.com'
}
const checkDoorayConnection = vi.fn()
const openModal = vi.fn()
const branches: Record<string, string | undefined> = {}

function seed(status: DoorayStatus, checked = true): void {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: partial store seed; only the fields the panel reads
  useAppStore.setState({
    doorayStatus: status,
    doorayStatusChecked: checked,
    doorayStatusContextKey: getProviderRuntimeContextKey(useAppStore.getState().settings),
    checkDoorayConnection,
    openModal,
    activeWorktreeId: 'wt',
    getKnownWorktreeById: () => ({ branch: branches.wt, repoId: 'repo-1' })
  } as never)
}

function renderPanel() {
  return render(
    <TooltipProvider>
      <DoorayTasksPanel />
    </TooltipProvider>
  )
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
  vi.clearAllMocks()
  window.localStorage.clear()
  branches.wt = undefined
  checkDoorayConnection.mockResolvedValue(undefined)
  api.listProjects.mockResolvedValue([
    { id: 'proj-a', code: 'A' },
    { id: 'proj-b', code: 'B' }
  ])
  api.listIssues.mockResolvedValue({ totalCount: 1, issues: [makeDoorayIssue()] })
  api.listMilestones.mockResolvedValue([])
  api.listWorkflows.mockResolvedValue([])
  api.getIssue.mockResolvedValue(null)
  api.getIssueByNumber.mockResolvedValue(null)
  api.issueComments.mockResolvedValue([])
})
afterEach(cleanup)

describe('DoorayTasksPanel', () => {
  it('checks the connection and shows a spinner until ready', () => {
    seed({ connected: false, viewer: null }, false)
    renderPanel()
    expect(screen.getByTestId('dooray-status-loading')).toBeTruthy()
    expect(checkDoorayConnection).toHaveBeenCalled()
  })

  it('offers connect when disconnected', () => {
    seed({ connected: false, viewer: null })
    renderPanel()
    expect(screen.getAllByRole('button', { name: 'Connect Dooray' }).length).toBe(1)
    expect(api.listProjects).not.toHaveBeenCalled()
  })

  it('works without a branch (folder workspace) and keeps the list closed by default', async () => {
    seed(connected)
    renderPanel()
    expect(await screen.findByText('No Dooray task linked to this branch.')).toBeTruthy()
    expect(screen.queryByTestId('dooray-compact-row')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /All tasks/ }))
    expect(await screen.findByText('Task 1')).toBeTruthy()
    expect(screen.getByText('1 / 1')).toBeTruthy()
  })

  it('auto-selects the branch project and a manual pick holds until the branch changes', async () => {
    branches.wt = 'feature/B-3'
    seed(connected)
    const view = renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: /All tasks/ }))
    await waitFor(() =>
      expect(api.listIssues).toHaveBeenLastCalledWith(
        expect.objectContaining({ projectId: 'proj-b' })
      )
    )

    // Manual pick of A holds even though the branch still points at B.
    fireEvent.click(screen.getAllByRole('combobox')[0])
    fireEvent.click(await screen.findByRole('option', { name: 'A' }))
    await waitFor(() =>
      expect(api.listIssues).toHaveBeenLastCalledWith(
        expect.objectContaining({ projectId: 'proj-a' })
      )
    )
    await act(async () => {})
    expect(api.listIssues).toHaveBeenLastCalledWith(
      expect.objectContaining({ projectId: 'proj-a' })
    )

    // Branch change re-enables auto-select.
    branches.wt = 'feature/B-4'
    act(() => useAppStore.setState({ activeWorktreeId: 'wt2' }))
    view.rerender(
      <TooltipProvider>
        <DoorayTasksPanel />
      </TooltipProvider>
    )
    await waitFor(() =>
      expect(api.listIssues).toHaveBeenLastCalledWith(
        expect.objectContaining({ projectId: 'proj-b' })
      )
    )
  })

  it('opens the composer from the row action', async () => {
    seed(connected)
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: /All tasks/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Start workspace' }))
    expect(openModal).toHaveBeenCalledWith(
      'new-workspace-composer',
      expect.objectContaining({ telemetrySource: 'sidebar', initialRepoId: 'repo-1' })
    )
  })
})
