import type { DoorayClient } from './dooray-request'
import { netFetchMock } from './dooray-test-harness'

export function makeTestDoorayClient(overrides: Partial<DoorayClient> = {}): DoorayClient {
  return {
    apiUrl: 'https://api.dooray.com',
    webUrl: 'https://nhnent.dooray.com',
    viewer: { id: 'm1', name: 'Kim', userCode: 'kim', email: null },
    authorization: 'dooray-api tok',
    transport: { send: (url, init) => netFetchMock(url, init) },
    ...overrides
  }
}

export function lastCall(index = 0): { url: URL; init: RequestInit | undefined } {
  const [url, init] = netFetchMock.mock.calls[index]
  return { url: new URL(url), init }
}
