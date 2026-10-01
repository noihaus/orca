import { describe, expect, it } from 'vitest'
import type * as Api from './dooray-api'
import type * as Client from './client'
import {
  jsonResponse,
  loadDoorayModule,
  netFetchMock,
  useDoorayTestEnvironment
} from './dooray-test-harness'

describe('Dooray API binding', () => {
  useDoorayTestEnvironment()

  it('throws when disconnected, uses the connected viewer and token otherwise', async () => {
    const api: typeof Api = await loadDoorayModule(() => import('./dooray-api'))
    const client: typeof Client = await import('./client')
    expect(() => api.listDoorayProjects()).toThrow('Not connected to Dooray.')
    netFetchMock.mockResolvedValueOnce(
      jsonResponse({ header: { isSuccessful: true }, result: { id: 'm1', name: 'K' } })
    )
    await client.connectDooray({ apiToken: 'tok' })
    netFetchMock.mockResolvedValueOnce(jsonResponse({ header: { isSuccessful: true }, result: [] }))
    await api.listDoorayIssues({ projectId: 'p' })
    const [url, init] = netFetchMock.mock.calls[1]
    expect(new URL(url).searchParams.get('toMemberIds')).toBe('m1')
    expect(new Headers(init?.headers).get('Authorization')).toBe('dooray-api tok')
  })
})
