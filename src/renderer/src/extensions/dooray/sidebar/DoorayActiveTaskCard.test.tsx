// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { i18n } from '@/i18n/i18n'
import { makeDoorayIssue } from '../issue/dooray-issue-fixture'
import { DoorayActiveTaskCard } from './DoorayActiveTaskCard'

const api = vi.hoisted(() => ({
  getIssueByNumber: vi.fn(),
  issueComments: vi.fn(),
  addIssueComment: vi.fn(),
  listWorkflows: vi.fn(),
  setWorkflow: vi.fn()
}))
vi.mock('../use-dooray-api', () => ({ useDoorayApi: () => api }))

const projects = [
  { id: 'proj-a', code: 'A' },
  { id: 'proj-ab', code: 'AB' }
]

function renderCard(branch: string | null, projectsLoading = false) {
  const ui = (b: string | null) => (
    <TooltipProvider>
      <DoorayActiveTaskCard
        activeBranch={b}
        projects={projects}
        projectsLoading={projectsLoading}
      />
    </TooltipProvider>
  )
  const result = render(ui(branch))
  return { rerenderBranch: (b: string | null) => result.rerender(ui(b)) }
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
  vi.clearAllMocks()
  api.issueComments.mockResolvedValue([])
  api.listWorkflows.mockResolvedValue([])
})
afterEach(cleanup)

describe('DoorayActiveTaskCard', () => {
  it('shows the linked task found by number, with body', async () => {
    api.getIssueByNumber.mockResolvedValue(makeDoorayIssue({ body: 'Hello body' }))
    renderCard('feature/A-1')
    expect(await screen.findByText('Task 1')).toBeTruthy()
    expect(screen.getByText('Hello body')).toBeTruthy()
    expect(api.getIssueByNumber).toHaveBeenCalledWith({ projectId: 'proj-a', postNumber: 1 })
  })

  it('prefers the longest matching project code', async () => {
    api.getIssueByNumber.mockResolvedValue(null)
    renderCard('feature/AB-7')
    await screen.findByText('Task AB/7 was not found.')
    expect(api.getIssueByNumber).toHaveBeenCalledWith({ projectId: 'proj-ab', postNumber: 7 })
  })

  it('says no task is linked without a branch or a matching code', () => {
    renderCard(null)
    expect(screen.getByText('No Dooray task linked to this branch.')).toBeTruthy()
    expect(api.getIssueByNumber).not.toHaveBeenCalled()
  })

  it('shows the error message when the lookup fails', async () => {
    api.getIssueByNumber.mockRejectedValue(new Error('boom'))
    renderCard('feature/A-1')
    expect(await screen.findByText('boom')).toBeTruthy()
  })

  it('drops a late response for the previous branch', async () => {
    let resolveFirst: (value: unknown) => void = () => {}
    api.getIssueByNumber
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce(makeDoorayIssue({ id: 'post-2', number: 2, subject: 'Task 2' }))
    const { rerenderBranch } = renderCard('feature/A-1')
    rerenderBranch('feature/A-2')
    expect(await screen.findByText('Task 2')).toBeTruthy()
    resolveFirst(makeDoorayIssue())
    await Promise.resolve()
    expect(screen.queryByText('Task 1')).toBeNull()
  })

  it('changes workflow from the pill', async () => {
    api.getIssueByNumber.mockResolvedValue(makeDoorayIssue())
    api.listWorkflows.mockResolvedValue([{ id: 'w9', name: 'Finished', workflowClass: 'closed' }])
    api.setWorkflow.mockResolvedValue({ ok: true })
    renderCard('feature/A-1')
    const pill = await screen.findByRole('button', { name: 'Open' })
    await waitFor(() => expect(pill).toHaveProperty('disabled', false))
    fireEvent.click(pill)
    fireEvent.click(await screen.findByRole('button', { name: 'Finished' }))
    await waitFor(() =>
      expect(api.setWorkflow).toHaveBeenCalledWith({
        projectId: 'proj-a',
        postId: 'post-1',
        workflowId: 'w9'
      })
    )
    // Popover stays open, so the pill is aria-hidden; match by text.
    await waitFor(() => expect(screen.getAllByText('Finished').length).toBeGreaterThan(1))
  })
})
