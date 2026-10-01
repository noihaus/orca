import { describe, expect, it, vi } from 'vitest'
import { doorayRequest, type DoorayClient } from './dooray-request'

function hangingUntilAborted(_url: string, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
  })
}

function makeClient(send: DoorayClient['transport']['send']): DoorayClient {
  return {
    apiUrl: 'https://api.dooray.com',
    webUrl: null,
    viewer: { id: '1', name: 'K', userCode: 'k', email: null },
    authorization: 'dooray-api t',
    transport: { send }
  }
}

describe('doorayRequest timeout', () => {
  it('fails a hung request and releases its slot for queued requests', async () => {
    const ok = new Response(JSON.stringify({ header: { isSuccessful: true }, result: [] }))
    const send = vi.fn(hangingUntilAborted)
    const client = makeClient(send)
    const hung = Array.from({ length: 4 }, () =>
      doorayRequest(client, '/x', { timeoutMs: 20 }).catch((error: unknown) => error)
    )
    const queued = doorayRequest(
      makeClient(async () => ok),
      '/y'
    )
    for (const result of await Promise.all(hung)) {
      expect(result).toMatchObject({ message: 'Dooray did not respond in time.' })
    }
    await expect(queued).resolves.toMatchObject({ result: [] })
  })

  it('still honors a caller abort signal', async () => {
    const controller = new AbortController()
    const pending = doorayRequest(makeClient(hangingUntilAborted), '/x', {
      signal: controller.signal
    })
    controller.abort(new Error('cancelled'))
    await expect(pending).rejects.toThrow('cancelled')
  })
})
