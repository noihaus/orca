// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DoorayStatus, DoorayTag } from '../../../../../shared/extensions/dooray/dooray-types'
import { TooltipProvider } from '@/components/ui/tooltip'
import { i18n } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { makeDoorayIssue } from '../issue/dooray-issue-fixture'
import { DoorayNewTaskDialog } from './DoorayNewTaskDialog'

const toastError = vi.hoisted(() => vi.fn())
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }))
const api = vi.hoisted(() => ({
  listTags: vi.fn(),
  listTemplates: vi.fn(),
  listWorkflows: vi.fn(),
  listMilestones: vi.fn(),
  getTemplate: vi.fn(),
  searchMembers: vi.fn(),
  createIssue: vi.fn(),
  setWorkflow: vi.fn(),
  uploadIssueFile: vi.fn(),
  getIssue: vi.fn()
}))
vi.mock('../use-dooray-api', () => ({ useDoorayApi: () => api }))

const viewer = { id: 'me', name: 'Me', userCode: 'me', email: null }
const status: DoorayStatus = { connected: true, viewer, apiUrl: 'https://api.dooray.com' }
const typeGroup = { id: 'g1', name: 'Type', mandatory: true, selectOne: true }
const tags: DoorayTag[] = [
  { id: 't1', name: 'Bug', tagGroup: typeGroup },
  { id: 't2', name: 'Feature', tagGroup: typeGroup }
]

function renderDialog(props: { open?: boolean } = {}) {
  const onOpenChange = vi.fn()
  const onCreated = vi.fn()
  render(
    <TooltipProvider>
      <DoorayNewTaskDialog
        open={props.open ?? true}
        onOpenChange={onOpenChange}
        projects={[{ id: 'p1', code: 'P1' }]}
        defaultProjectId="p1"
        onCreated={onCreated}
      />
    </TooltipProvider>
  )
  return { onOpenChange, onCreated }
}

function createButton(): HTMLButtonElement {
  const button = screen.getByRole('button', { name: 'Create task' })
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error('expected a button')
  }
  return button
}

function pasteImage(...files: File[]): Event {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', {
    value: {
      items: files.map((file) => ({ kind: 'file', type: file.type, getAsFile: () => file }))
    }
  })
  document.dispatchEvent(event)
  return event
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
  vi.clearAllMocks()
  Element.prototype.scrollIntoView = vi.fn()
  useAppStore.setState({ doorayStatus: status })
  api.listTags.mockResolvedValue([])
  api.listTemplates.mockResolvedValue([])
  api.listWorkflows.mockResolvedValue([])
  api.listMilestones.mockResolvedValue([])
})
afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

describe('DoorayNewTaskDialog', () => {
  it('keeps Create disabled until every mandatory tag group has a selection', async () => {
    api.listTags.mockResolvedValue(tags)
    renderDialog()
    fireEvent.change(screen.getByPlaceholderText('Task subject'), {
      target: { value: 'Crash on start' }
    })
    expect(await screen.findByText('Select a required tag from: Type')).toBeTruthy()
    expect(createButton().disabled).toBe(true)

    fireEvent.submit(createButton().closest('form')!)
    expect(api.createIssue).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('combobox', { name: 'Tags' }))
    fireEvent.click(await screen.findByRole('option', { name: /Bug/ }))

    await waitFor(() => expect(createButton().disabled).toBe(false))
    expect(screen.queryByText('Select a required tag from: Type')).toBeNull()
  })

  it('keeps Create disabled while tags are still loading', async () => {
    let resolveTags: (value: DoorayTag[]) => void = () => {}
    api.listTags.mockReturnValue(
      new Promise<DoorayTag[]>((resolve) => {
        resolveTags = resolve
      })
    )
    renderDialog()
    fireEvent.change(screen.getByPlaceholderText('Task subject'), { target: { value: 'x' } })
    await waitFor(() => expect(api.listMilestones).toHaveBeenCalled())
    expect(createButton().disabled).toBe(true)

    await act(async () => resolveTags(tags))
    expect(await screen.findByText('Select a required tag from: Type')).toBeTruthy()
    expect(createButton().disabled).toBe(true)
    fireEvent.click(screen.getByRole('combobox', { name: 'Tags' }))
    fireEvent.click(await screen.findByRole('option', { name: /Bug/ }))
    await waitFor(() => expect(createButton().disabled).toBe(false))
  })

  it('allows Create when the tag list fails to load (server enforces)', async () => {
    api.listTags.mockRejectedValue(new Error('boom'))
    renderDialog()
    fireEvent.change(screen.getByPlaceholderText('Task subject'), { target: { value: 'x' } })
    await waitFor(() => expect(createButton().disabled).toBe(false))
  })

  it('adds readable files and toasts the unreadable one', async () => {
    renderDialog()
    const broken = new File([new Uint8Array([1])], 'broken.png', { type: 'image/png' })
    Object.defineProperty(broken, 'arrayBuffer', {
      value: () => Promise.reject(new Error('read failed'))
    })
    pasteImage(new File([new Uint8Array([1])], 'good.png', { type: 'image/png' }), broken)
    expect(await screen.findByText('good.png')).toBeTruthy()
    expect(screen.queryByText('broken.png')).toBeNull()
    expect(toastError).toHaveBeenCalledWith('Could not read broken.png')
  })

  it('requires a subject', async () => {
    renderDialog()
    await waitFor(() => expect(api.listTags).toHaveBeenCalled())
    expect(createButton().disabled).toBe(true)
    fireEvent.change(screen.getByPlaceholderText('Task subject'), { target: { value: '  ' } })
    expect(createButton().disabled).toBe(true)
  })

  it('adds a pasted image as paste-<ts>.png while open', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700)
    renderDialog()
    const event = pasteImage(new File([new Uint8Array([1, 2])], '', { type: 'image/png' }))
    expect(event.defaultPrevented).toBe(true)
    expect(await screen.findByText('paste-1700.png')).toBeTruthy()

    const text = pasteImage(new File(['x'], 'notes.txt', { type: 'text/plain' }))
    expect(text.defaultPrevented).toBe(false)
  })

  it('ignores pastes while closed', () => {
    renderDialog({ open: false })
    const event = pasteImage(new File([new Uint8Array([1])], '', { type: 'image/png' }))
    expect(event.defaultPrevented).toBe(false)
  })

  it('shows the platform paste shortcut', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Windows NT')
    renderDialog()
    expect(screen.getByText('or paste an image with Ctrl+V')).toBeTruthy()
  })

  it('creates, uploads, reloads the issue, then closes and reports it', async () => {
    const calls: string[] = []
    const created = makeDoorayIssue({ id: 'new-post' })
    api.createIssue.mockImplementation(async () => {
      calls.push('create')
      return { ok: true, id: 'new-post' }
    })
    api.uploadIssueFile.mockImplementation(async () => {
      calls.push('upload')
      return { ok: true }
    })
    api.getIssue.mockImplementation(async () => {
      calls.push('get')
      return created
    })
    const { onOpenChange, onCreated } = renderDialog()
    pasteImage(new File([new Uint8Array([1])], 'shot.png', { type: 'image/png' }))
    expect(await screen.findByText('shot.png')).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText('Task subject'), {
      target: { value: ' Crash ' }
    })
    await waitFor(() => expect(createButton().disabled).toBe(false))
    await act(async () => fireEvent.click(createButton()))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created))
    expect(calls).toEqual(['create', 'upload', 'get'])
    expect(api.createIssue).toHaveBeenCalledWith({
      projectId: 'p1',
      subject: 'Crash',
      body: '',
      tagIds: [],
      toMemberIds: ['me'],
      ccMemberIds: []
    })
    expect(api.setWorkflow).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('keeps the dialog open and toasts when creation fails', async () => {
    api.createIssue.mockResolvedValue({ ok: false, error: 'Not connected to Dooray.' })
    const { onOpenChange, onCreated } = renderDialog()
    fireEvent.change(screen.getByPlaceholderText('Task subject'), { target: { value: 'x' } })
    await waitFor(() => expect(createButton().disabled).toBe(false))
    await act(async () => fireEvent.click(createButton()))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Not connected to Dooray.'))
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(onCreated).not.toHaveBeenCalled()
    expect(createButton().disabled).toBe(false)
  })
})
