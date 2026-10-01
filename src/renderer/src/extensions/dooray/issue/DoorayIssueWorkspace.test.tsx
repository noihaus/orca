// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { i18n } from '@/i18n/i18n'
import { makeDoorayIssue } from './dooray-issue-fixture'
import { DoorayIssueWorkspace, type DoorayIssueWorkspaceProps } from './DoorayIssueWorkspace'

const api = vi.hoisted(() => ({
  getIssue: vi.fn(),
  issueComments: vi.fn(),
  addIssueComment: vi.fn(),
  listWorkflows: vi.fn(),
  setWorkflow: vi.fn()
}))
vi.mock('../use-dooray-api', () => ({ useDoorayApi: () => api }))

const writeClipboardText = vi.fn()

function renderSheet(props: Partial<DoorayIssueWorkspaceProps> = {}): void {
  render(
    <TooltipProvider>
      <DoorayIssueWorkspace issue={makeDoorayIssue()} onClose={vi.fn()} {...props} />
    </TooltipProvider>
  )
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
  vi.clearAllMocks()
  api.getIssue.mockResolvedValue(null)
  api.issueComments.mockResolvedValue([])
  api.listWorkflows.mockResolvedValue([])
  writeClipboardText.mockResolvedValue(undefined)
  Object.assign(window, { api: { ui: { writeClipboardText } } })
})
afterEach(cleanup)

describe('DoorayIssueWorkspace', () => {
  it('hides start buttons until the host provides them', async () => {
    renderSheet()
    expect(await screen.findByText('No comments yet.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Start/ })).toBeNull()
    expect(screen.getByText('No description provided.')).toBeTruthy()
  })

  it('runs the primary and secondary start actions', async () => {
    const onUse = vi.fn()
    const run = vi.fn()
    renderSheet({
      onUse,
      secondaryStart: { kind: 'existing-workspace', run }
    })
    fireEvent.click((await screen.findAllByRole('button', { name: 'Start workspace' }))[0])
    expect(onUse).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Start in current workspace' }))
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('copies the task number and posts a comment', async () => {
    api.addIssueComment.mockResolvedValue({ ok: true, id: 'n1' })
    renderSheet()
    fireEvent.click(await screen.findByRole('button', { name: 'Copy task number' }))
    await waitFor(() => expect(writeClipboardText).toHaveBeenCalledWith('A/1'))

    fireEvent.change(screen.getByPlaceholderText('Add a Dooray comment...'), {
      target: { value: 'looks good' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Comment' }))
    expect(await screen.findByText('looks good')).toBeTruthy()
    expect(screen.getByText('You')).toBeTruthy()
  })
})
