// @vitest-environment happy-dom

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  DoorayStatus,
  DoorayTag,
  DoorayTemplate
} from '../../../../../shared/extensions/dooray/dooray-types'
import { i18n } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { useDoorayNewTaskForm } from './use-dooray-new-task-form'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
const api = vi.hoisted(() => ({
  listTags: vi.fn(),
  listTemplates: vi.fn(),
  listWorkflows: vi.fn(),
  listMilestones: vi.fn(),
  getTemplate: vi.fn(),
  createIssue: vi.fn(),
  setWorkflow: vi.fn(),
  uploadIssueFile: vi.fn(),
  getIssue: vi.fn()
}))
vi.mock('../use-dooray-api', () => ({ useDoorayApi: () => api }))

const viewer = { id: 'me', name: 'Me', userCode: 'me', email: null }
const status: DoorayStatus = { connected: true, viewer, apiUrl: 'https://api.dooray.com' }
const severity = { id: 'g1', name: 'Severity', mandatory: false, selectOne: true }
const tags: DoorayTag[] = [
  { id: 't1', name: 'Minor', tagGroup: severity },
  { id: 't2', name: 'Major', tagGroup: severity },
  { id: 't3', name: 'UI' }
]

function template(overrides: Partial<DoorayTemplate> = {}): DoorayTemplate {
  return {
    id: 'tpl',
    templateName: 'Bug',
    subject: '[Bug] ',
    body: 'Steps',
    guide: 'Describe the bug',
    tagIds: ['t1', 't2', 't3'],
    priority: 'high',
    toMembers: [],
    ccMembers: [],
    ...overrides
  }
}

function renderForm() {
  return renderHook(() =>
    useDoorayNewTaskForm({
      projects: [{ id: 'p1', code: 'P1' }],
      defaultProjectId: 'p1',
      onClose: vi.fn(),
      onCreated: vi.fn(),
      onSubmittingChange: vi.fn()
    })
  )
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
  vi.clearAllMocks()
  useAppStore.setState({ doorayStatus: status })
  api.listTags.mockResolvedValue(tags)
  api.listTemplates.mockResolvedValue([{ id: 'tpl', templateName: 'Bug', isDefault: false }])
  api.listWorkflows.mockResolvedValue([])
  api.listMilestones.mockResolvedValue([])
})

describe('useDoorayNewTaskForm', () => {
  it('starts with the viewer assigned and no priority', () => {
    const { result } = renderForm()
    expect(result.current.toMembers).toEqual([{ id: 'me', name: 'Me' }])
    expect(result.current.priority).toBe('none')
  })

  it('template autofill replaces members only when the template has them', async () => {
    api.getTemplate.mockResolvedValue(template())
    const { result } = renderForm()
    await waitFor(() => expect(result.current.tags).toHaveLength(3))

    act(() => result.current.changeTemplate('tpl'))
    await waitFor(() => expect(result.current.subject).toBe('[Bug] '))
    expect(result.current.body).toBe('Steps')
    expect(result.current.guide).toBe('Describe the bug')
    expect(result.current.priority).toBe('high')
    // selectOne group keeps only the first template tag
    expect(result.current.tagIds).toEqual(['t1', 't3'])
    expect(result.current.toMembers).toEqual([{ id: 'me', name: 'Me' }])
    expect(result.current.ccMembers).toEqual([])

    api.getTemplate.mockResolvedValue(
      template({
        toMembers: [{ id: 'u2', name: 'Kim', userCode: 'kim' }],
        ccMembers: [{ id: 'u3', name: 'Lee', userCode: 'lee' }]
      })
    )
    act(() => result.current.changeTemplate('tpl'))
    await waitFor(() => expect(result.current.toMembers).toEqual([{ id: 'u2', name: 'Kim' }]))
    expect(result.current.ccMembers).toEqual([{ id: 'u3', name: 'Lee' }])
  })

  it('drops a template response that arrives after another selection', async () => {
    let resolveSlow: (value: DoorayTemplate) => void = () => {}
    api.getTemplate.mockReturnValueOnce(
      new Promise<DoorayTemplate>((resolve) => {
        resolveSlow = resolve
      })
    )
    const { result } = renderForm()
    act(() => result.current.changeTemplate('tpl'))
    act(() => result.current.changeTemplate('__none__'))
    await act(async () => resolveSlow(template()))
    expect(result.current.subject).toBe('')
    expect(result.current.templateLoading).toBe(false)
  })
})
