// @vitest-environment happy-dom

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DoorayComment } from '../../../../../shared/extensions/dooray/dooray-types'
import { makeDoorayIssue } from './dooray-issue-fixture'
import { useDoorayComments } from './use-dooray-comments'

const api = vi.hoisted(() => ({ issueComments: vi.fn(), addIssueComment: vi.fn() }))
const toastError = vi.hoisted(() => vi.fn())

vi.mock('../use-dooray-api', () => ({ useDoorayApi: () => api }))
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }))

function comment(id: string, body = id): DoorayComment {
  return { id, body, createdAt: '2026-09-10T00:00:00Z', authorName: 'Someone' }
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const issueA = makeDoorayIssue({ id: 'post-a' })
const issueB = makeDoorayIssue({ id: 'post-b' })

beforeEach(() => {
  vi.clearAllMocks()
  api.issueComments.mockResolvedValue([comment('c1')])
})

describe('useDoorayComments', () => {
  it('loads comments for the issue', async () => {
    const { result } = renderHook(() => useDoorayComments(issueA))
    await waitFor(() => expect(result.current.comments).toHaveLength(1))
    expect(api.issueComments).toHaveBeenCalledWith({ projectId: 'proj-a', postId: 'post-a' })
  })

  it('adds the posted comment as "You" and keeps it across a retry refetch', async () => {
    api.addIssueComment.mockResolvedValue({ ok: true, id: 'new-1' })
    const { result } = renderHook(() => useDoorayComments(issueA))
    await waitFor(() => expect(result.current.comments).toHaveLength(1))

    act(() => result.current.setCommentDraft('  hello  '))
    await act(async () => {
      await result.current.submitComment()
    })

    expect(api.addIssueComment).toHaveBeenCalledWith({
      projectId: 'proj-a',
      postId: 'post-a',
      body: 'hello'
    })
    expect(result.current.comments.map((c) => c.id)).toEqual(['c1', 'new-1'])
    expect(result.current.comments[1].authorName).toBe('You')
    expect(result.current.commentDraft).toBe('')

    // Server has not indexed the new comment yet.
    await act(async () => {
      result.current.retryLoadComments()
    })
    await waitFor(() => expect(api.issueComments).toHaveBeenCalledTimes(2))
    expect(result.current.comments.map((c) => c.id)).toEqual(['c1', 'new-1'])
  })

  it('does not duplicate the optimistic comment once the server returns it', async () => {
    api.addIssueComment.mockResolvedValue({ ok: true, id: 'new-1' })
    const { result } = renderHook(() => useDoorayComments(issueA))
    await waitFor(() => expect(result.current.comments).toHaveLength(1))
    act(() => result.current.setCommentDraft('hi'))
    await act(async () => {
      await result.current.submitComment()
    })
    api.issueComments.mockResolvedValue([comment('c1'), comment('new-1', 'hi')])
    await act(async () => {
      result.current.retryLoadComments()
    })
    await waitFor(() => expect(result.current.comments[1].authorName).toBe('Someone'))
    expect(result.current.comments).toHaveLength(2)
  })

  it('ignores a comment response that arrives after switching issues', async () => {
    const slow = deferred<DoorayComment[]>()
    api.issueComments.mockImplementation((args: { postId: string }) =>
      args.postId === 'post-a' ? slow.promise : Promise.resolve([comment('b1')])
    )
    const { result, rerender } = renderHook(({ issue }) => useDoorayComments(issue), {
      initialProps: { issue: issueA }
    })
    rerender({ issue: issueB })
    await waitFor(() => expect(result.current.comments.map((c) => c.id)).toEqual(['b1']))

    await act(async () => {
      slow.resolve([comment('a1')])
      await slow.promise
    })
    expect(result.current.comments.map((c) => c.id)).toEqual(['b1'])
  })

  it('drops a posted comment when the issue changed while it was in flight', async () => {
    const pending = deferred<{ ok: true; id: string }>()
    api.addIssueComment.mockReturnValue(pending.promise)
    const { result, rerender } = renderHook(({ issue }) => useDoorayComments(issue), {
      initialProps: { issue: issueA }
    })
    await waitFor(() => expect(result.current.comments).toHaveLength(1))
    act(() => result.current.setCommentDraft('late'))
    let submit: Promise<void> = Promise.resolve()
    act(() => {
      submit = result.current.submitComment()
    })
    api.issueComments.mockResolvedValue([comment('b1')])
    rerender({ issue: issueB })
    await act(async () => {
      pending.resolve({ ok: true, id: 'late-1' })
      await submit
    })
    expect(result.current.comments.map((c) => c.id)).toEqual(['b1'])
  })

  it('toasts and keeps the draft when posting fails', async () => {
    api.addIssueComment.mockResolvedValue({ ok: false, error: 'denied' })
    const { result } = renderHook(() => useDoorayComments(issueA))
    await waitFor(() => expect(result.current.comments).toHaveLength(1))
    act(() => result.current.setCommentDraft('hi'))
    await act(async () => {
      await result.current.submitComment()
    })
    expect(toastError).toHaveBeenCalledWith('denied')
    expect(result.current.commentDraft).toBe('hi')
    expect(result.current.comments).toHaveLength(1)
  })

  it('skips blank drafts and oversized whitespace drafts', async () => {
    const { result } = renderHook(() => useDoorayComments(issueA))
    await waitFor(() => expect(result.current.comments).toHaveLength(1))
    act(() => result.current.setCommentDraft('   '))
    expect(result.current.canSubmitComment).toBe(false)
    await act(async () => {
      await result.current.submitComment()
    })
    act(() => result.current.setCommentDraft(' '.repeat(70 * 1024)))
    await act(async () => {
      await result.current.submitComment()
    })
    expect(api.addIssueComment).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledTimes(1)
  })

  it('surfaces load errors', async () => {
    api.issueComments.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useDoorayComments(issueA))
    await waitFor(() => expect(result.current.commentsError).toBe('boom'))
  })
})
