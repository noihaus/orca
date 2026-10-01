import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import type * as Os from 'node:os'
import { join } from 'node:path'
import { beforeEach, vi, type Mock } from 'vitest'

export const netFetchMock: Mock<(url: string, init?: RequestInit) => Promise<Response>> = vi.fn()

let tempHome = ''

export function getDoorayTestHome(): string {
  return tempHome
}

export function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json' }
  })
}

// Call inside describe(): fresh temp home and reset fetch mock per test.
export function useDoorayTestEnvironment(): void {
  beforeEach(() => {
    tempHome = mkdtempSync(join(tmpdir(), 'orca-dooray-'))
    netFetchMock.mockReset()
  })
}

// Importer is passed by the caller so relative specifiers resolve from the test file.
export async function loadDoorayModule<T>(
  importer: () => Promise<T>,
  options: { encryptionAvailable?: boolean } = {}
): Promise<T> {
  vi.resetModules()
  const { setMainHttpClient } = await import('../../network/http-client')
  setMainHttpClient({
    fetch: (url, init) => netFetchMock(url, init),
    proxySession: () => null
  })
  const { setSecretStore } = await import('../../../shared/secret-store')
  setSecretStore({
    isEncryptionAvailable: () => options.encryptionAvailable ?? false,
    encryptString: (value) => Buffer.from(value),
    decryptString: (value) => value.toString('utf-8'),
    describeProtectionGap: () => null
  })
  vi.doMock('os', async () => {
    const actual = await vi.importActual<typeof Os>('os')
    return { ...actual, homedir: () => tempHome }
  })
  return importer()
}
