import { beforeEach, describe, expect, it, vi } from 'vitest'

const { handlers, resetPreflightMock, connectMock, disconnectMock, apiMock, taskBranchMock } =
  vi.hoisted(() => ({
    handlers: new Map<string, (event: unknown, input?: unknown) => unknown>(),
    resetPreflightMock: vi.fn(),
    connectMock: vi.fn(),
    disconnectMock: vi.fn(),
    apiMock: vi.fn(),
    taskBranchMock: vi.fn()
  }))

vi.mock('../../preflight/agent-detection', () => ({ _resetPreflightCache: resetPreflightMock }))
vi.mock('./client', () => ({
  connectDooray: connectMock,
  disconnectDooray: disconnectMock,
  getDoorayStatus: vi.fn(),
  testDoorayConnection: vi.fn()
}))
vi.mock('./dooray-api', () => {
  const fn = () => apiMock
  return {
    listDoorayProjects: fn(),
    listDoorayIssues: fn(),
    getDoorayIssue: fn(),
    getDoorayIssueByNumber: fn(),
    getDoorayIssueComments: fn(),
    listDoorayTags: fn(),
    listDoorayMilestones: fn(),
    listDoorayTemplates: fn(),
    getDoorayTemplate: fn(),
    listDoorayWorkflows: fn(),
    searchDoorayMembers: fn(),
    createDoorayIssue: fn(),
    addDoorayIssueComment: fn(),
    setDoorayWorkflow: fn(),
    uploadDoorayIssueFile: fn()
  }
})

vi.mock('./task-branch/task-branch-ipc', () => ({ registerTaskBranchIpcHandlers: taskBranchMock }))

import type { Store } from '../../persistence'
import { registerDoorayIpcHandlers } from './dooray-ipc'

// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: handlers under test never read the store
const fakeStore = {} as Store
const context = {
  store: fakeStore,
  handle: (channel: string, fn: (e: unknown, i?: unknown) => unknown) => {
    handlers.set(channel, fn)
  }
}

const invoke = (channel: string, input?: unknown) => handlers.get(channel)?.({}, input)

describe('Dooray IPC handlers', () => {
  beforeEach(() => {
    handlers.clear()
    vi.clearAllMocks()
    registerDoorayIpcHandlers(context)
  })

  it('registers all 19 channels', () => {
    expect(handlers.size).toBe(19)
    expect([...handlers.keys()].every((name) => name.startsWith('dooray:'))).toBe(true)
    expect(taskBranchMock).toHaveBeenCalledWith(context)
  })

  it('returns benign defaults for invalid args', async () => {
    expect(await invoke('dooray:listIssues', { projectId: '' })).toEqual({
      totalCount: 0,
      issues: []
    })
    expect(await invoke('dooray:getIssueByNumber', { projectId: 'p', postNumber: -1 })).toBeNull()
    expect(await invoke('dooray:getIssue', {})).toBeNull()
    expect(await invoke('dooray:listTags', undefined)).toEqual([])
    expect(await invoke('dooray:createIssue', { projectId: 'p', subject: ' ' })).toEqual({
      ok: false,
      error: 'Subject is required.'
    })
    expect(await invoke('dooray:createIssue', {})).toEqual({
      ok: false,
      error: 'Project is required.'
    })
    expect(await invoke('dooray:connect', { apiToken: ' ' })).toEqual({
      ok: false,
      error: 'API token is required.'
    })
    expect(
      await invoke('dooray:uploadIssueFile', { projectId: 'p', postId: 'x', file: {} })
    ).toEqual({
      ok: false,
      error: 'Task and file are required.'
    })
    expect(
      await invoke('dooray:addIssueComment', { projectId: 'p', postId: 'x', body: ' ' })
    ).toEqual({
      ok: false,
      error: 'Comment body is required.'
    })
    expect(await invoke('dooray:addIssueComment', {})).toEqual({
      ok: false,
      error: 'Task is required.'
    })
    expect(await invoke('dooray:setWorkflow', { projectId: 'p', postId: 'x' })).toEqual({
      ok: false,
      error: 'Task and workflow are required.'
    })
    expect(apiMock).not.toHaveBeenCalled()
  })

  it('normalizes valid args before calling the API', async () => {
    apiMock.mockResolvedValue('r')
    await invoke('dooray:listIssues', {
      projectId: ' p ',
      size: 500,
      page: 2.7,
      filter: 'x',
      order: 'updatedAt'
    })
    expect(apiMock).toHaveBeenLastCalledWith({
      projectId: 'p',
      size: 100,
      page: 2,
      order: 'updatedAt'
    })
    await invoke('dooray:getIssueByNumber', { projectId: 'p', postNumber: 3.9 })
    expect(apiMock).toHaveBeenLastCalledWith({ projectId: 'p', postNumber: 3 })
  })

  it('resets the agent preflight cache on connect and disconnect', async () => {
    connectMock.mockResolvedValueOnce({ ok: false, error: 'nope' })
    await invoke('dooray:connect', { apiToken: 't' })
    expect(resetPreflightMock).not.toHaveBeenCalled()
    connectMock.mockResolvedValueOnce({ ok: true, viewer: {} })
    await invoke('dooray:connect', { apiToken: 't' })
    expect(resetPreflightMock).toHaveBeenCalledTimes(1)
    expect(await invoke('dooray:disconnect')).toBeUndefined()
    expect(disconnectMock).toHaveBeenCalled()
    expect(resetPreflightMock).toHaveBeenCalledTimes(2)
  })
})
