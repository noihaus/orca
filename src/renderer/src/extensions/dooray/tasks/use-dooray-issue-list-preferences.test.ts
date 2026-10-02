// @vitest-environment happy-dom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  DoorayIssue,
  DoorayListIssuesArgs,
  DoorayMilestone,
  DoorayWorkflow
} from '../../../../../shared/extensions/dooray/dooray-types'
import { clearDoorayListPreferenceCache } from './dooray-filter-preferences'
import { useDoorayIssueList, useDooraySidebarIssueList } from './use-dooray-issue-list'

const api = vi.hoisted(() => ({
  listProjects: vi.fn(),
  listIssues: vi.fn(),
  listMilestones: vi.fn(),
  listWorkflows: vi.fn()
}))

vi.mock('../use-dooray-api', () => ({ useDoorayApi: () => api }))

function issue(n: number, overrides: Partial<DoorayIssue> = {}): DoorayIssue {
  return {
    id: `p${n}`,
    projectId: 'proj-a',
    projectCode: 'A',
    number: n,
    taskNumber: `A/${n}`,
    subject: `Task ${n}`,
    workflowId: 'wf-open',
    workflowName: 'Open',
    workflowClass: 'registered',
    assignees: [],
    milestoneName: null,
    createdAt: '2026-09-10T00:00:00Z',
    updatedAt: '2026-09-10T00:00:00Z',
    url: '',
    ...overrides
  }
}

const milestones: DoorayMilestone[] = [
  { id: 'm1', name: 'Sprint 3', startedAt: '', endedAt: '', status: 'open' }
]
const workflows: DoorayWorkflow[] = [
  { id: 'wf-open', name: 'Open', workflowClass: 'registered' },
  { id: 'wf-done', name: 'Done', workflowClass: 'closed' }
]

beforeEach(() => {
  window.localStorage.clear()
  clearDoorayListPreferenceCache()
  window.localStorage.setItem('orca:dooray-selected-project', 'proj-a')
  api.listProjects.mockResolvedValue([
    { id: 'proj-a', code: 'A' },
    { id: 'proj-b', code: 'B' }
  ])
  api.listIssues.mockResolvedValue({ totalCount: 1, issues: [issue(1)] })
  api.listMilestones.mockResolvedValue(milestones)
  api.listWorkflows.mockResolvedValue(workflows)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

function lastListArgs(): DoorayListIssuesArgs {
  return api.listIssues.mock.calls.at(-1)?.[0]
}

describe('useDoorayIssueList saved preferences', () => {
  it('restores scope filter and sort after a remount', async () => {
    const first = renderHook(() => useDoorayIssueList({ withMilestones: true }))
    await waitFor(() => expect(api.listIssues).toHaveBeenCalled())
    act(() => first.result.current.setFilter('done'))
    act(() => first.result.current.sortBy('updated'))
    act(() => first.result.current.toggleSortDir())
    first.unmount()

    const second = renderHook(() => useDoorayIssueList({ withMilestones: true }))
    expect(second.result.current.filter).toBe('done')
    expect(second.result.current.sortKey).toBe('updated')
    expect(second.result.current.sortDir).toBe('asc')
    await waitFor(() =>
      expect(lastListArgs()).toMatchObject({ filter: 'done', order: 'updatedAt' })
    )
  })

  it('restores milestone, workflow and priority per project', async () => {
    const first = renderHook(() => useDoorayIssueList({ withMilestones: true }))
    await waitFor(() => expect(first.result.current.workflows).toHaveLength(2))
    act(() => first.result.current.setMilestoneFilter('Sprint 3'))
    act(() => first.result.current.setWorkflowFilter('wf-done'))
    act(() => first.result.current.setPriorityFilter('high'))
    act(() => first.result.current.selectProject('proj-b'))
    await waitFor(() => expect(first.result.current.workflows).toHaveLength(2))
    expect(first.result.current.milestoneFilter).toBeNull()
    expect(first.result.current.priorityFilter).toBeNull()
    act(() => first.result.current.selectProject('proj-a'))
    expect(first.result.current.milestoneFilter).toBe('Sprint 3')
    first.unmount()

    const second = renderHook(() => useDoorayIssueList({ withMilestones: true }))
    await waitFor(() => expect(second.result.current.workflows).toHaveLength(2))
    expect(second.result.current.milestoneFilter).toBe('Sprint 3')
    expect(second.result.current.workflowFilter).toBe('wf-done')
    expect(second.result.current.priorityFilter).toBe('high')
  })

  it('keeps every change when several filters change in one event', async () => {
    const { result } = renderHook(() => useDoorayIssueList({ withMilestones: true }))
    await waitFor(() => expect(result.current.workflows).toHaveLength(2))
    act(() => {
      result.current.setMilestoneFilter('Sprint 3')
      result.current.setWorkflowFilter('wf-done')
      result.current.setPriorityFilter('low')
    })
    expect(result.current.milestoneFilter).toBe('Sprint 3')
    expect(result.current.workflowFilter).toBe('wf-done')
    expect(result.current.priorityFilter).toBe('low')
    expect(
      JSON.parse(window.localStorage.getItem('orca:dooray-project-filters:tasks:proj-a') ?? '{}')
    ).toEqual({ milestone: 'Sprint 3', workflowId: 'wf-done', priority: 'low' })
  })

  it('keeps the tasks page and the sidebar independent', async () => {
    const tasks = renderHook(() => useDoorayIssueList({ withMilestones: true }))
    await waitFor(() => expect(api.listIssues).toHaveBeenCalled())
    act(() => tasks.result.current.setFilter('all'))
    act(() => tasks.result.current.setPriorityFilter('lowest'))
    const sidebar = renderHook(() => useDooraySidebarIssueList({ withMilestones: true }))
    expect(sidebar.result.current.filter).toBe('assigned')
    expect(sidebar.result.current.priorityFilter).toBeNull()
  })

  it('ignores and clears a saved milestone or workflow that no longer exists', async () => {
    window.localStorage.setItem(
      'orca:dooray-project-filters:tasks:proj-a',
      JSON.stringify({ milestone: 'Old sprint', workflowId: 'wf-gone', priority: 'normal' })
    )
    const { result } = renderHook(() => useDoorayIssueList({ withMilestones: true }))
    await waitFor(() => expect(result.current.workflows).toHaveLength(2))
    expect(result.current.milestoneFilter).toBeNull()
    expect(result.current.workflowFilter).toBeNull()
    expect(result.current.priorityFilter).toBe('normal')
    await waitFor(() =>
      expect(
        JSON.parse(window.localStorage.getItem('orca:dooray-project-filters:tasks:proj-a') ?? '{}')
      ).toEqual({ milestone: null, workflowId: null, priority: 'normal' })
    )
  })

  it('keeps a saved milestone while its options are still loading', async () => {
    window.localStorage.setItem(
      'orca:dooray-project-filters:tasks:proj-a',
      JSON.stringify({ milestone: 'Sprint 3', workflowId: null, priority: null })
    )
    api.listMilestones.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useDoorayIssueList({ withMilestones: true }))
    await waitFor(() => expect(api.listIssues).toHaveBeenCalled())
    expect(result.current.milestoneFilter).toBe('Sprint 3')
    expect(window.localStorage.getItem('orca:dooray-project-filters:tasks:proj-a')).toContain(
      'Sprint 3'
    )
  })
})
