import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type * as Client from './client'
import {
  getDoorayTestHome,
  jsonResponse,
  loadDoorayModule,
  netFetchMock,
  useDoorayTestEnvironment
} from './dooray-test-harness'

const me = {
  header: { isSuccessful: true },
  result: { id: 'm1', name: 'Kim', userCode: 'kim', externalEmailAddress: 'k@x.com' }
}

const loadClient = (): Promise<typeof Client> => loadDoorayModule(() => import('./client'))

describe('Dooray client', () => {
  useDoorayTestEnvironment()

  it('connect probes /members/me with dooray-api auth, then persists', async () => {
    netFetchMock.mockResolvedValueOnce(jsonResponse(me))
    const d = await loadClient()
    expect(await d.connectDooray({ apiToken: ' tok ', webUrl: 'nhnent.dooray.com' })).toEqual({
      ok: true,
      viewer: { id: 'm1', name: 'Kim', userCode: 'kim', email: 'k@x.com' }
    })
    const [url, init] = netFetchMock.mock.calls[0]
    expect(url).toBe('https://api.dooray.com/common/v1/members/me')
    expect(new Headers(init?.headers).get('Authorization')).toBe('dooray-api tok')
    expect(d.getDoorayStatus()).toMatchObject({
      connected: true,
      webUrl: 'https://nhnent.dooray.com'
    })
    expect(existsSync(join(getDoorayTestHome(), '.orca', 'dooray-token.enc'))).toBe(true)
  })

  it('empty token returns an error without network', async () => {
    const d = await loadClient()
    expect(await d.connectDooray({ apiToken: '  ' })).toEqual({
      ok: false,
      error: 'API token is required.'
    })
    expect(netFetchMock).not.toHaveBeenCalled()
  })

  it('invalid URL returns an error without network', async () => {
    const d = await loadClient()
    expect(await d.connectDooray({ apiToken: 't', apiUrl: 'http://' })).toEqual({
      ok: false,
      error: 'Enter a valid Dooray URL.'
    })
    expect(netFetchMock).not.toHaveBeenCalled()
  })

  it('isSuccessful:false surfaces resultMessage and stays disconnected', async () => {
    netFetchMock.mockResolvedValueOnce(
      jsonResponse({ header: { isSuccessful: false, resultMessage: 'bad token' }, result: null })
    )
    const d = await loadClient()
    expect(await d.connectDooray({ apiToken: 't' })).toEqual({ ok: false, error: 'bad token' })
    expect(d.getDoorayStatus()).toEqual({ connected: false, viewer: null })
  })

  it('HTTP failure falls back to resultMessage, statusText, then a generic message', async () => {
    const d = await loadClient()
    netFetchMock.mockResolvedValueOnce(
      jsonResponse({ header: { resultMessage: 'nope' } }, { status: 401 })
    )
    expect(await d.connectDooray({ apiToken: 't' })).toEqual({ ok: false, error: 'nope' })
    netFetchMock.mockResolvedValueOnce(new Response('x', { status: 500, statusText: 'Boom' }))
    expect(await d.connectDooray({ apiToken: 't' })).toEqual({ ok: false, error: 'Boom' })
    netFetchMock.mockResolvedValueOnce(new Response('x', { status: 502 }))
    expect(await d.connectDooray({ apiToken: 't' })).toEqual({
      ok: false,
      error: 'Dooray request failed (502)'
    })
  })

  it('rejects a profile without an id and stores nothing', async () => {
    netFetchMock.mockResolvedValueOnce(jsonResponse({ header: { isSuccessful: true }, result: {} }))
    const d = await loadClient()
    expect(await d.connectDooray({ apiToken: 't' })).toEqual({
      ok: false,
      error: 'Dooray did not return a member profile for this token.'
    })
    expect(d.getDoorayStatus().connected).toBe(false)
  })

  it('testDoorayConnection and requireDoorayClient work after connect; disconnect clears', async () => {
    const d = await loadClient()
    expect(await d.testDoorayConnection()).toEqual({ ok: false, error: 'Not connected to Dooray.' })
    expect(() => d.requireDoorayClient()).toThrow('Not connected to Dooray.')
    netFetchMock.mockResolvedValueOnce(jsonResponse(me))
    await d.connectDooray({ apiToken: 'tok' })
    expect(d.requireDoorayClient().authorization).toBe('dooray-api tok')
    netFetchMock.mockResolvedValueOnce(jsonResponse(me))
    expect(await d.testDoorayConnection()).toMatchObject({ ok: true })
    d.disconnectDooray()
    expect(d.getDoorayStatus()).toEqual({ connected: false, viewer: null })
    expect(existsSync(join(getDoorayTestHome(), '.orca', 'dooray-token.enc'))).toBe(false)
  })

  it('limits concurrency to 4', async () => {
    const d = await loadClient()
    const resolvers: (() => void)[] = []
    let inFlight = 0
    let peak = 0
    netFetchMock.mockImplementation(async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise<void>((resolve) => resolvers.push(resolve))
      inFlight -= 1
      return jsonResponse({ header: { isSuccessful: true }, result: [] })
    })
    const client = {
      apiUrl: 'https://api.dooray.com',
      webUrl: null,
      viewer: { id: '1', name: 'K', userCode: 'k', email: null },
      authorization: 'dooray-api t',
      transport: { fetch: (url: string, init?: RequestInit) => netFetchMock(url, init) }
    }
    const all = Promise.all(Array.from({ length: 7 }, () => d.doorayRequest(client, '/x')))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(inFlight).toBe(4)
    while (resolvers.length > 0 || inFlight > 0) {
      resolvers.shift()?.()
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    await all
    expect(peak).toBe(4)
    expect(netFetchMock).toHaveBeenCalledTimes(7)
  })
})
