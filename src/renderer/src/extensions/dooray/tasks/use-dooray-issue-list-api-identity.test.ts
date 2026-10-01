// @vitest-environment happy-dom

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as RuntimeRpcClient from '@/runtime/runtime-rpc-client'
import { useAppStore } from '@/store'
import { useDoorayIssueList } from './use-dooray-issue-list'

// Real useDoorayApi + runtime client; only the transports (preload bridge and runtime RPC) are faked.
const callRuntimeRpc = vi.hoisted(() => vi.fn())
vi.mock('@/runtime/runtime-rpc-client', async (importOriginal) => ({
  ...(await importOriginal<typeof RuntimeRpcClient>()),
  callRuntimeRpc: (...args: unknown[]) => callRuntimeRpc(...args)
}))

const local = {
  listProjects: vi.fn(),
  listIssues: vi.fn(),
  listMilestones: vi.fn(),
  listWorkflows: vi.fn()
}
const projects = [{ id: 'proj-a', code: 'A' }]
const emptyList = { totalCount: 0, issues: [] }
let originalApi: unknown

function patchSettings(patch: Record<string, unknown>): void {
  // The test store starts without hydrated settings; routing reads only the patched fields.
  useAppStore.setState({ settings: { ...useAppStore.getState().settings!, ...patch } })
}

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  originalApi = Reflect.get(window, 'api')
  Reflect.set(window, 'api', { ...Reflect.get(window, 'api'), dooray: local })
  local.listProjects.mockResolvedValue(projects)
  local.listIssues.mockResolvedValue(emptyList)
  local.listMilestones.mockResolvedValue([])
  local.listWorkflows.mockResolvedValue([])
  callRuntimeRpc.mockImplementation(async (_target: unknown, method: string) =>
    method === 'dooray.listProjects' ? projects : method === 'dooray.listIssues' ? emptyList : []
  )
  patchSettings({ activeRuntimeEnvironmentId: null, visibleTaskProviders: ['dooray', 'github'] })
})

afterEach(() => {
  Reflect.set(window, 'api', originalApi)
})

describe('useDoorayIssueList api identity', () => {
  it('ignores unrelated settings writes but refetches on a runtime target change', async () => {
    const { result } = renderHook(() => useDoorayIssueList({ withMilestones: true }))
    await waitFor(() => expect(local.listIssues).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => patchSettings({ visibleTaskProviders: ['github'] }))
    await act(async () => {})
    expect(local.listProjects).toHaveBeenCalledTimes(1)
    expect(local.listIssues).toHaveBeenCalledTimes(1)
    expect(local.listMilestones).toHaveBeenCalledTimes(1)
    expect(callRuntimeRpc).not.toHaveBeenCalled()

    act(() => patchSettings({ activeRuntimeEnvironmentId: 'env-1' }))
    await waitFor(() =>
      expect(callRuntimeRpc).toHaveBeenCalledWith(
        expect.anything(),
        'dooray.listIssues',
        expect.objectContaining({ projectId: 'proj-a', page: 0 }),
        expect.anything()
      )
    )
    expect(local.listIssues).toHaveBeenCalledTimes(1)
  })
})
