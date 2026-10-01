// @vitest-environment happy-dom

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  DoorayIssue,
  DoorayIssueList,
  DoorayListIssuesArgs
} from '../../../../../shared/extensions/dooray/dooray-types'
import { DOORAY_SELECTED_PROJECT_STORAGE_KEY, useDoorayIssueList } from './use-dooray-issue-list'

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void }

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

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
    createdAt: `2026-09-${String(10 + (n % 20)).padStart(2, '0')}T00:00:00Z`,
    updatedAt: `2026-09-${String(10 + (n % 20)).padStart(2, '0')}T00:00:00Z`,
    url: '',
    ...overrides
  }
}

function page(count: number, start: number, totalCount: number): DoorayIssueList {
  return { totalCount, issues: Array.from({ length: count }, (_, i) => issue(start + i)) }
}

const projects = [
  { id: 'proj-a', code: 'A' },
  { id: 'proj-b', code: 'B' }
]

beforeEach(() => {
  window.localStorage.clear()
  api.listProjects.mockResolvedValue(projects)
  api.listIssues.mockResolvedValue(page(2, 1, 2))
  api.listMilestones.mockResolvedValue([])
  api.listWorkflows.mockResolvedValue([])
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

function lastListArgs(): DoorayListIssuesArgs {
  return api.listIssues.mock.calls.at(-1)?.[0]
}

describe('useDoorayIssueList project selection', () => {
  it('restores and persists the selected project in localStorage', async () => {
    window.localStorage.setItem(DOORAY_SELECTED_PROJECT_STORAGE_KEY, 'proj-b')
    const { result } = renderHook(() => useDoorayIssueList())
    await waitFor(() => expect(result.current.projectsLoading).toBe(false))
    expect(result.current.selectedProjectId).toBe('proj-b')
    await waitFor(() => expect(lastListArgs().projectId).toBe('proj-b'))

    act(() => result.current.selectProject('proj-a'))
    expect(window.localStorage.getItem(DOORAY_SELECTED_PROJECT_STORAGE_KEY)).toBe('proj-a')
    await waitFor(() => expect(lastListArgs().projectId).toBe('proj-a'))
  })

  it('falls back to the first project when the stored one is gone', async () => {
    window.localStorage.setItem(DOORAY_SELECTED_PROJECT_STORAGE_KEY, 'deleted')
    const { result } = renderHook(() => useDoorayIssueList())
    await waitFor(() => expect(result.current.selectedProjectId).toBe('proj-a'))
  })

  it('keeps working when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    const { result } = renderHook(() => useDoorayIssueList())
    await waitFor(() => expect(result.current.selectedProjectId).toBe('proj-a'))
    act(() => result.current.selectProject('proj-b'))
    expect(result.current.selectedProjectId).toBe('proj-b')
  })

  it('reports a project load failure', async () => {
    api.listProjects.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useDoorayIssueList())
    await waitFor(() => expect(result.current.projectsError).toBe('boom'))
    expect(api.listIssues).not.toHaveBeenCalled()
  })
})

describe('useDoorayIssueList paging', () => {
  it('requests 50 per page, replaces on page 0 and appends floor(len/50) on loadMore', async () => {
    api.listIssues.mockResolvedValueOnce(page(50, 1, 120)).mockResolvedValueOnce(page(50, 51, 120))
    const { result } = renderHook(() => useDoorayIssueList())
    await waitFor(() => expect(result.current.rawIssues).toHaveLength(50))
    expect(lastListArgs()).toMatchObject({
      projectId: 'proj-a',
      filter: 'assigned',
      page: 0,
      size: 50,
      order: '-createdAt'
    })
    expect(result.current.canLoadMore).toBe(true)

    act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.rawIssues).toHaveLength(100))
    expect(lastListArgs().page).toBe(1)
    expect(result.current.totalCount).toBe(120)

    api.listIssues.mockResolvedValueOnce(page(3, 1, 3))
    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.rawIssues).toHaveLength(3))
    expect(lastListArgs().page).toBe(0)
    expect(result.current.canLoadMore).toBe(false)
  })

  it('drops a late response from a superseded request', async () => {
    const slow = deferred<DoorayIssueList>()
    const fast = deferred<DoorayIssueList>()
    api.listIssues.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)
    const { result } = renderHook(() => useDoorayIssueList())
    await waitFor(() => expect(api.listIssues).toHaveBeenCalledTimes(1))

    act(() => result.current.setFilter('done'))
    await waitFor(() => expect(api.listIssues).toHaveBeenCalledTimes(2))
    await act(async () => fast.resolve(page(1, 900, 1)))
    await act(async () => slow.resolve(page(5, 1, 5)))

    expect(result.current.rawIssues.map((i) => i.number)).toEqual([900])
    expect(result.current.loading).toBe(false)
  })

  it('surfaces an issue load error', async () => {
    api.listIssues.mockRejectedValue(new Error('nope'))
    const { result } = renderHook(() => useDoorayIssueList())
    await waitFor(() => expect(result.current.error).toBe('nope'))
    expect(result.current.loading).toBe(false)
  })
})

describe('useDoorayIssueList filters and sorting', () => {
  it('returns to page 0 when the server filter or server order changes', async () => {
    const { result } = renderHook(() => useDoorayIssueList())
    await waitFor(() => expect(api.listIssues).toHaveBeenCalledTimes(1))

    act(() => result.current.setFilter('all'))
    await waitFor(() => expect(lastListArgs()).toMatchObject({ filter: 'all', page: 0 }))

    act(() => result.current.toggleSortDir())
    await waitFor(() => expect(lastListArgs()).toMatchObject({ order: 'createdAt', page: 0 }))

    act(() => result.current.sortBy('updated'))
    await waitFor(() => expect(lastListArgs()).toMatchObject({ order: '-updatedAt', page: 0 }))
  })

  it('sorts client-side only for keys the server cannot order', async () => {
    api.listIssues.mockResolvedValue({
      totalCount: 3,
      issues: [issue(2, { subject: 'b' }), issue(1, { subject: 'c' }), issue(3, { subject: 'a' })]
    })
    const { result } = renderHook(() => useDoorayIssueList())
    await waitFor(() => expect(result.current.rawIssues).toHaveLength(3))
    expect(result.current.clientOnlySort).toBe(false)
    const callsBefore = api.listIssues.mock.calls.length

    act(() => result.current.sortBy('subject'))
    expect(result.current.sortKey).toBe('subject')
    expect(result.current.sortDir).toBe('asc')
    expect(result.current.clientOnlySort).toBe(true)
    expect(result.current.issues.map((i) => i.subject)).toEqual(['a', 'b', 'c'])

    act(() => result.current.sortBy('subject'))
    expect(result.current.sortDir).toBe('desc')
    expect(result.current.issues.map((i) => i.subject)).toEqual(['c', 'b', 'a'])
    // Client-only keys never refetch.
    expect(api.listIssues.mock.calls.length).toBe(callsBefore)
  })

  it('filters loaded issues by milestone, workflow and priority and flags it', async () => {
    api.listIssues.mockResolvedValue({
      totalCount: 3,
      issues: [
        issue(1, { milestoneName: 'S1', workflowId: 'w1', priority: 'high' }),
        issue(2, { milestoneName: 'S1', workflowId: 'w2' }),
        issue(3, { milestoneName: 'S2', workflowId: 'w1', priority: 'high' })
      ]
    })
    const { result } = renderHook(() => useDoorayIssueList({ withMilestones: true }))
    await waitFor(() => expect(result.current.rawIssues).toHaveLength(3))
    expect(result.current.hasActiveClientFilter).toBe(false)

    act(() => result.current.setMilestoneFilter('S1'))
    expect(result.current.hasActiveClientFilter).toBe(true)
    expect(result.current.issues.map((i) => i.number).sort()).toEqual([1, 2])

    act(() => result.current.setPriorityFilter('none'))
    expect(result.current.issues.map((i) => i.number)).toEqual([2])

    act(() => {
      result.current.setPriorityFilter(null)
      result.current.setWorkflowFilter('w1')
    })
    expect(result.current.issues.map((i) => i.number)).toEqual([1])
  })

  it('loads open milestones and workflows only when withMilestones is set', async () => {
    api.listMilestones.mockResolvedValue([
      { id: 'm1', name: 'S1', startedAt: '', endedAt: '', status: 'open' },
      { id: 'm2', name: 'S0', startedAt: '', endedAt: '', status: 'closed' }
    ])
    api.listWorkflows.mockResolvedValue([{ id: 'w1', name: 'Doing', workflowClass: 'working' }])

    const plain = renderHook(() => useDoorayIssueList())
    await waitFor(() => expect(plain.result.current.rawIssues).toHaveLength(2))
    expect(api.listMilestones).not.toHaveBeenCalled()
    expect(api.listWorkflows).not.toHaveBeenCalled()
    plain.unmount()

    const { result } = renderHook(() => useDoorayIssueList({ withMilestones: true }))
    await waitFor(() => expect(result.current.milestones.map((m) => m.id)).toEqual(['m1']))
    await waitFor(() => expect(result.current.workflows.map((w) => w.id)).toEqual(['w1']))
    expect(api.listMilestones).toHaveBeenCalledWith({ projectId: 'proj-a' })
  })

  it('patches a loaded issue in place', async () => {
    const { result } = renderHook(() => useDoorayIssueList())
    await waitFor(() => expect(result.current.rawIssues).toHaveLength(2))
    act(() => result.current.patchIssue(issue(1, { subject: 'Renamed' })))
    expect(result.current.rawIssues.find((i) => i.id === 'p1')?.subject).toBe('Renamed')
  })
})
