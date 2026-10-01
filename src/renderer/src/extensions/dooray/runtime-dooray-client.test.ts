// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as RuntimeRpcClient from '@/runtime/runtime-rpc-client'
import { RuntimeRpcCallError } from '@/runtime/runtime-rpc-result'
import {
  DoorayRemoteUnsupportedError,
  doorayConnect,
  doorayDisconnect,
  doorayListIssues,
  doorayListProjects,
  dooraySearchMembers,
  doorayStatus,
  doorayUploadIssueFile,
  getDoorayApi
} from './runtime-dooray-client'

type RuntimeRpcClientModule = typeof RuntimeRpcClient

const callRuntimeRpc = vi.fn()

vi.mock('@/runtime/runtime-rpc-client', async (importOriginal) => ({
  ...(await importOriginal<RuntimeRpcClientModule>()),
  callRuntimeRpc: (...args: unknown[]) => callRuntimeRpc(...args)
}))

const local = {
  status: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  listProjects: vi.fn(),
  listIssues: vi.fn(),
  uploadIssueFile: vi.fn(),
  searchMembers: vi.fn()
}
const localSettings = { activeRuntimeEnvironmentId: null }
const file = { name: 'a.txt', mimeType: 'text/plain', dataBase64: '' }
const remoteSettings = { activeRuntimeEnvironmentId: 'env-1' }

beforeEach(() => {
  callRuntimeRpc.mockReset()
  for (const fn of Object.values(local)) {
    fn.mockReset()
  }
  vi.stubGlobal('window', { api: { dooray: local } })
})

describe('dooray runtime client', () => {
  it('routes local settings through the preload bridge', async () => {
    local.status.mockResolvedValue({ connected: false, viewer: null })
    local.listIssues.mockResolvedValue({ items: [] })
    await doorayStatus(localSettings)
    await doorayListIssues(localSettings, { projectId: 'p1' })
    expect(local.status).toHaveBeenCalledOnce()
    expect(local.listIssues).toHaveBeenCalledWith({ projectId: 'p1' })
    expect(callRuntimeRpc).not.toHaveBeenCalled()
  })

  it('routes environment settings through dooray.* RPC with per-op timeouts', async () => {
    callRuntimeRpc.mockResolvedValue({})
    const target = { kind: 'environment', environmentId: 'env-1' }
    await doorayStatus(remoteSettings)
    await doorayDisconnect(remoteSettings)
    await dooraySearchMembers(remoteSettings, { name: 'a' })
    await doorayUploadIssueFile(remoteSettings, { projectId: 'p', postId: 'i', file })
    await doorayListProjects(remoteSettings)
    await doorayConnect(remoteSettings, { apiToken: 't' })
    const calls = callRuntimeRpc.mock.calls.map(([t, method, args, options]) => [
      t,
      method,
      args,
      options.timeoutMs
    ])
    expect(calls).toEqual([
      [target, 'dooray.status', undefined, 15_000],
      [target, 'dooray.disconnect', undefined, 15_000],
      [target, 'dooray.searchMembers', { name: 'a' }, 15_000],
      [target, 'dooray.uploadIssueFile', { projectId: 'p', postId: 'i', file }, 120_000],
      [target, 'dooray.listProjects', undefined, 30_000],
      [target, 'dooray.connect', { apiToken: 't' }, 30_000]
    ])
    expect(local.status).not.toHaveBeenCalled()
  })

  it('maps method_not_found from an older host to DoorayRemoteUnsupportedError', async () => {
    callRuntimeRpc.mockRejectedValue(
      new RuntimeRpcCallError({
        ok: false,
        id: '1',
        error: { code: 'method_not_found', message: 'nope' },
        _meta: { runtimeId: 'r' }
      })
    )
    await expect(doorayStatus(remoteSettings)).rejects.toBeInstanceOf(DoorayRemoteUnsupportedError)
  })

  it('passes other RPC errors through unchanged', async () => {
    const failure = new Error('boom')
    callRuntimeRpc.mockRejectedValue(failure)
    await expect(doorayStatus(remoteSettings)).rejects.toBe(failure)
  })

  it('exposes all 19 operations through getDoorayApi', () => {
    expect(Object.keys(getDoorayApi(localSettings))).toHaveLength(19)
  })
})
