import { beforeEach, describe, expect, it, vi } from 'vitest'

const { resetPreflightMock, apiMock } = vi.hoisted(() => ({
  resetPreflightMock: vi.fn(),
  apiMock: vi.fn()
}))

vi.mock('../../preflight/agent-detection', () => ({ _resetPreflightCache: resetPreflightMock }))
vi.mock('./client', () => ({
  connectDooray: vi.fn(),
  disconnectDooray: vi.fn(),
  getDoorayStatus: vi.fn(),
  testDoorayConnection: vi.fn()
}))
vi.mock('./dooray-api', () => ({
  listDoorayProjects: apiMock,
  listDoorayIssues: apiMock,
  getDoorayIssue: apiMock,
  createDoorayIssue: apiMock
}))

import { DOORAY_RPC_METHODS } from './dooray-rpc-methods'

function method(name: string) {
  const found = DOORAY_RPC_METHODS.find((entry) => entry.name === name)
  if (!found) {
    throw new Error(`missing ${name}`)
  }
  return found
}
const parse = (name: string, params: unknown) => {
  const schema = method(name).params
  if (!schema) {
    throw new Error('no schema')
  }
  return schema.safeParse(params)
}

describe('Dooray RPC methods', () => {
  beforeEach(() => vi.clearAllMocks())

  it('declares 19 dooray.* methods', () => {
    expect(DOORAY_RPC_METHODS).toHaveLength(19)
    expect(new Set(DOORAY_RPC_METHODS.map((m) => m.name)).size).toBe(19)
    expect(DOORAY_RPC_METHODS.every((m) => m.name.startsWith('dooray.'))).toBe(true)
  })

  it('rejects non-positive postNumber, bad enums and blank required strings', () => {
    expect(parse('dooray.getIssueByNumber', { projectId: 'p', postNumber: 0 }).success).toBe(false)
    expect(parse('dooray.getIssueByNumber', { projectId: 'p', postNumber: 1.5 }).success).toBe(
      false
    )
    expect(parse('dooray.listIssues', { projectId: 'p', filter: 'bogus' }).success).toBe(false)
    expect(parse('dooray.listIssues', { projectId: 'p', order: 'x' }).success).toBe(false)
    expect(
      parse('dooray.createIssue', { projectId: 'p', subject: 's', priority: 'x' }).success
    ).toBe(false)
    const blank = parse('dooray.getIssue', { projectId: '  ', postId: 'a' })
    expect(blank.success).toBe(false)
    expect(blank.error?.issues[0].message).toBe('Project is required')
    expect(parse('dooray.connect', { apiToken: ' ' }).error?.issues[0].message).toBe(
      'API token is required'
    )
    expect(
      parse('dooray.setWorkflow', { projectId: 'p', postId: 'a' }).error?.issues[0].message
    ).toBe('Workflow is required')
    expect(
      parse('dooray.uploadIssueFile', {
        projectId: 'p',
        postId: 'a',
        file: { name: ' ', dataBase64: '' }
      }).error?.issues[0].message
    ).toBe('File name is required')
  })

  it('trims ids and calls the API directly', async () => {
    const parsed = parse('dooray.getIssue', { projectId: ' p ', postId: ' a ' })
    expect(parsed.data).toEqual({ projectId: 'p', postId: 'a' })
    apiMock.mockResolvedValue('r')
    const list = method('dooray.listIssues')
    await Reflect.apply(list.handler, undefined, [{ projectId: 'p', size: 999 }, {}])
    expect(apiMock).toHaveBeenLastCalledWith({ projectId: 'p', size: 100, page: 0 })
  })

  it('disconnect returns {ok:true} and connect/disconnect reset the preflight cache', async () => {
    expect(
      await Reflect.apply(method('dooray.disconnect').handler, undefined, [undefined, {}])
    ).toEqual({ ok: true })
    expect(resetPreflightMock).toHaveBeenCalledTimes(1)
  })
})
