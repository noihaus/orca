// @vitest-environment happy-dom

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeDoorayIssue } from './dooray-issue-fixture'
import { useDoorayWorkflows } from './use-dooray-workflows'

const api = vi.hoisted(() => ({ listWorkflows: vi.fn(), setWorkflow: vi.fn() }))
const toastError = vi.hoisted(() => vi.fn())

vi.mock('../use-dooray-api', () => ({ useDoorayApi: () => api }))
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }))

const closed = { id: 'wf-done', name: 'Done', workflowClass: 'closed' as const }

beforeEach(() => {
  vi.clearAllMocks()
  api.listWorkflows.mockResolvedValue([closed])
})

describe('useDoorayWorkflows', () => {
  it('patches optimistically and keeps the change on success', async () => {
    api.setWorkflow.mockResolvedValue({ ok: true })
    const issue = makeDoorayIssue()
    const onPatched = vi.fn()
    const { result } = renderHook(() => useDoorayWorkflows(issue, onPatched))
    await waitFor(() => expect(result.current.workflows).toHaveLength(1))

    await act(async () => {
      await result.current.selectWorkflow(closed)
    })

    expect(onPatched).toHaveBeenCalledTimes(1)
    expect(onPatched.mock.calls[0][0]).toMatchObject({
      workflowId: 'wf-done',
      workflowName: 'Done',
      workflowClass: 'closed'
    })
    expect(api.setWorkflow).toHaveBeenCalledWith({
      projectId: 'proj-a',
      postId: 'post-1',
      workflowId: 'wf-done'
    })
    expect(toastError).not.toHaveBeenCalled()
  })

  it('rolls back and toasts when the server rejects', async () => {
    api.setWorkflow.mockResolvedValue({ ok: false, error: 'nope' })
    const issue = makeDoorayIssue()
    const onPatched = vi.fn()
    const { result } = renderHook(() => useDoorayWorkflows(issue, onPatched))
    await waitFor(() => expect(result.current.workflows).toHaveLength(1))

    await act(async () => {
      await result.current.selectWorkflow(closed)
    })

    expect(onPatched).toHaveBeenCalledTimes(2)
    expect(onPatched.mock.calls[1][0]).toBe(issue)
    expect(toastError).toHaveBeenCalledWith('nope')
    expect(result.current.workflowPending).toBe(false)
  })

  it('rolls back when the call throws', async () => {
    api.setWorkflow.mockRejectedValue(new Error('offline'))
    const issue = makeDoorayIssue()
    const onPatched = vi.fn()
    const { result } = renderHook(() => useDoorayWorkflows(issue, onPatched))
    await waitFor(() => expect(result.current.workflows).toHaveLength(1))
    await act(async () => {
      await result.current.selectWorkflow(closed)
    })
    expect(onPatched.mock.calls[1][0]).toBe(issue)
    expect(toastError).toHaveBeenCalledWith('offline')
  })
})
