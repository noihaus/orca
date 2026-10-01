import { describe, expect, it } from 'vitest'
import { jsonResponse, netFetchMock, useDoorayTestEnvironment } from './dooray-test-harness'
import { makeTestDoorayClient, lastCall } from './dooray-test-client'
import {
  addDoorayIssueComment,
  createDoorayIssue,
  setDoorayWorkflow,
  uploadDoorayIssueFile
} from './dooray-issue-mutations'

const client = makeTestDoorayClient()
const ok = (result: unknown = {}) => jsonResponse({ header: { isSuccessful: true }, result })
const sentBody = (i = 0) => JSON.parse(String(netFetchMock.mock.calls[i][1]?.body))

describe('Dooray mutations', () => {
  useDoorayTestEnvironment()

  it('createIssue omits empty users/tags/milestone and priority none', async () => {
    netFetchMock.mockResolvedValueOnce(ok({ id: 'new1' }))
    const res = await createDoorayIssue(client, {
      projectId: 'p1',
      subject: 'S',
      tagIds: [],
      toMemberIds: [' '],
      priority: 'none'
    })
    expect(res).toEqual({ ok: true, id: 'new1' })
    expect(lastCall().init?.method).toBe('POST')
    expect(sentBody()).toEqual({
      subject: 'S',
      body: { mimeType: 'text/x-markdown', content: '' }
    })
  })

  it('createIssue sends trimmed members, tags, priority and milestone', async () => {
    netFetchMock.mockResolvedValueOnce(ok({ id: 'n' }))
    await createDoorayIssue(client, {
      projectId: 'p1',
      subject: 'S',
      body: 'B',
      toMemberIds: [' a '],
      ccMemberIds: ['b', ''],
      tagIds: ['t', ' '],
      priority: 'high',
      milestoneId: ' ms '
    })
    expect(sentBody()).toEqual({
      subject: 'S',
      body: { mimeType: 'text/x-markdown', content: 'B' },
      users: {
        to: [{ type: 'member', member: { organizationMemberId: 'a' } }],
        cc: [{ type: 'member', member: { organizationMemberId: 'b' } }]
      },
      tagIds: ['t'],
      priority: 'high',
      milestoneId: 'ms'
    })
  })

  it('mutations resolve with ok:false and fallback messages', async () => {
    netFetchMock.mockRejectedValue('boom')
    expect(await createDoorayIssue(client, { projectId: 'p', subject: 'S' })).toEqual({
      ok: false,
      error: 'Task creation failed.'
    })
    expect(await addDoorayIssueComment(client, { projectId: 'p', postId: 'x', body: 'b' })).toEqual(
      {
        ok: false,
        error: 'Comment failed.'
      }
    )
    expect(
      await setDoorayWorkflow(client, { projectId: 'p', postId: 'x', workflowId: 'w' })
    ).toEqual({
      ok: false,
      error: 'Workflow update failed.'
    })
    netFetchMock.mockReset()
    netFetchMock.mockResolvedValueOnce(
      jsonResponse({ header: { isSuccessful: false, resultMessage: 'denied' } })
    )
    expect(await createDoorayIssue(client, { projectId: 'p', subject: 'S' })).toEqual({
      ok: false,
      error: 'denied'
    })
  })

  it('comment and workflow requests', async () => {
    netFetchMock.mockResolvedValueOnce(ok({ id: 'c9' })).mockResolvedValueOnce(ok(null))
    expect(
      await addDoorayIssueComment(client, { projectId: 'a/b', postId: 'x', body: 'hi' })
    ).toEqual({
      ok: true,
      id: 'c9'
    })
    expect(lastCall().url.pathname).toBe('/project/v1/projects/a%2Fb/posts/x/logs')
    expect(sentBody()).toEqual({ body: { mimeType: 'text/x-markdown', content: 'hi' } })
    expect(
      await setDoorayWorkflow(client, { projectId: 'p', postId: 'x', workflowId: 'w' })
    ).toEqual({
      ok: true
    })
    expect(lastCall(1).url.pathname).toBe('/project/v1/projects/p/posts/x/set-workflow')
    expect(sentBody(1)).toEqual({ workflowId: 'w' })
  })

  it('upload posts multipart without JSON content-type; empty file errors', async () => {
    netFetchMock.mockResolvedValueOnce(ok(null))
    const res = await uploadDoorayIssueFile(client, {
      projectId: 'p',
      postId: 'x',
      file: {
        name: 'a.txt',
        mimeType: 'text/plain',
        dataBase64: Buffer.from('hey').toString('base64')
      }
    })
    expect(res).toEqual({ ok: true })
    const { url, init } = lastCall()
    expect(url.pathname).toBe('/project/v1/projects/p/posts/x/files')
    expect(new Headers(init?.headers).get('Content-Type')).toBeNull()
    const file = init?.body instanceof FormData ? init.body.get('file') : null
    expect(file).toBeInstanceOf(File)
    if (file instanceof File) {
      expect(file.name).toBe('a.txt')
      expect(file.type).toBe('text/plain')
      expect(await file.text()).toBe('hey')
    }
    netFetchMock.mockClear()
    expect(
      await uploadDoorayIssueFile(client, {
        projectId: 'p',
        postId: 'x',
        file: { name: 'e.txt', dataBase64: '' }
      })
    ).toEqual({ ok: false, error: 'e.txt: attachment is empty.' })
    expect(netFetchMock).not.toHaveBeenCalled()
    netFetchMock.mockResolvedValueOnce(
      jsonResponse({ header: { resultMessage: 'big' } }, { status: 413 })
    )
    expect(
      await uploadDoorayIssueFile(client, {
        projectId: 'p',
        postId: 'x',
        file: { name: 'z.bin', dataBase64: 'AA==' }
      })
    ).toEqual({ ok: false, error: 'z.bin: big' })
  })
})
