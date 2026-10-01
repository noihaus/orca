import { describe, expect, it } from 'vitest'
import { jsonResponse, netFetchMock, useDoorayTestEnvironment } from './dooray-test-harness'
import { makeTestDoorayClient, lastCall } from './dooray-test-client'
import {
  getDoorayIssue,
  getDoorayIssueByNumber,
  getDoorayIssueComments,
  listDoorayIssues
} from './dooray-issue-queries'

const client = makeTestDoorayClient()
const ok = (result: unknown, extra: object = {}) =>
  jsonResponse({ header: { isSuccessful: true }, result, ...extra })
const rawIssue = { id: 'p1', number: 1, project: { id: 'pr', code: 'C' } }

describe('Dooray issue queries', () => {
  useDoorayTestEnvironment()

  it('listIssues(assigned) sends open classes + viewer id, clamps size', async () => {
    netFetchMock.mockResolvedValueOnce(ok([rawIssue], { totalCount: 77 }))
    const res = await listDoorayIssues(client, { projectId: 'p1', size: 500 })
    const { url } = lastCall()
    expect(url.pathname).toBe('/project/v1/projects/p1/posts')
    expect(url.searchParams.get('size')).toBe('100')
    expect(url.searchParams.get('page')).toBe('0')
    expect(url.searchParams.get('order')).toBe('-createdAt')
    expect(url.searchParams.get('postWorkflowClasses')).toBe('backlog,registered,working')
    expect(url.searchParams.get('toMemberIds')).toBe('m1')
    expect(res.totalCount).toBe(77)
    expect(res.issues).toHaveLength(1)
  })

  it('listIssues done/all filters, size floor, default size, totalCount fallback', async () => {
    netFetchMock.mockResolvedValue(ok([rawIssue, rawIssue]))
    const done = await listDoorayIssues(client, {
      projectId: 'p',
      filter: 'done',
      size: 0,
      page: -3.7,
      order: 'updatedAt'
    })
    const d = lastCall().url.searchParams
    expect(d.get('postWorkflowClasses')).toBe('closed')
    expect(d.get('toMemberIds')).toBeNull()
    expect(d.get('size')).toBe('1')
    expect(d.get('page')).toBe('0')
    expect(d.get('order')).toBe('updatedAt')
    expect(done.totalCount).toBe(2)
    await listDoorayIssues(client, { projectId: 'p', filter: 'all' })
    const a = lastCall(1).url.searchParams
    expect(a.get('size')).toBe('30')
    expect(a.get('toMemberIds')).toBeNull()
    expect(a.get('postWorkflowClasses')).toBe('backlog,registered,working')
  })

  it('encodes path segments and propagates errors', async () => {
    netFetchMock.mockResolvedValueOnce(ok(null))
    expect(await getDoorayIssue(client, { projectId: 'a/b', postId: 'c d' })).toBeNull()
    expect(lastCall().url.pathname).toBe('/project/v1/projects/a%2Fb/posts/c%20d')
    netFetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 500 }))
    await expect(listDoorayIssues(client, { projectId: 'p' })).rejects.toThrow()
  })

  it('getIssueByNumber looks up the id then fetches the post', async () => {
    netFetchMock.mockResolvedValueOnce(ok([{ id: 'p5' }])).mockResolvedValueOnce(ok(rawIssue))
    const issue = await getDoorayIssueByNumber(client, { projectId: 'p', postNumber: 12 })
    expect(lastCall().url.searchParams.get('postNumber')).toBe('12')
    expect(lastCall().url.searchParams.get('size')).toBe('2')
    expect(lastCall(1).url.pathname).toBe('/project/v1/projects/p/posts/p5')
    expect(issue?.id).toBe('p1')
    netFetchMock.mockResolvedValueOnce(ok([]))
    expect(await getDoorayIssueByNumber(client, { projectId: 'p', postNumber: 13 })).toBeNull()
    expect(netFetchMock).toHaveBeenCalledTimes(3)
  })

  it('comments map author fallback and drop empty ones', async () => {
    netFetchMock.mockResolvedValueOnce(
      ok([
        { id: 'c1', body: { content: 'hi' }, creator: { member: { name: 'A' } }, createdAt: 't' },
        { id: 'c2', body: { content: 'yo' }, creator: { name: 'Bot' } },
        { id: 'c3', body: { content: '' } }
      ])
    )
    const comments = await getDoorayIssueComments(client, { projectId: 'p', postId: 'x' })
    expect(lastCall().url.pathname).toBe('/project/v1/projects/p/posts/x/logs')
    expect(lastCall().url.search).toBe('?page=0&size=100&order=createdAt')
    expect(comments).toEqual([
      { id: 'c1', body: 'hi', createdAt: 't', authorName: 'A' },
      { id: 'c2', body: 'yo', createdAt: '', authorName: 'Bot' }
    ])
  })
})
