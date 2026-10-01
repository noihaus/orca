import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import type * as Os from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DoorayCredentialBackend } from './dooray-credential-store'

type StoreOptions = { encryptionAvailable?: boolean; decryptString?: (value: Buffer) => string }

let tempHome = ''
let orcaDir = ''

const account = {
  version: 1,
  apiUrl: 'https://api.dooray.com',
  webUrl: 'https://nhnent.dooray.com',
  viewer: { id: '1', name: 'Kim', userCode: 'kim', email: null }
} as const

async function loadStore(options: StoreOptions = {}) {
  vi.resetModules()
  const { setSecretStore } = await import('../../../shared/secret-store')
  setSecretStore({
    isEncryptionAvailable: () => options.encryptionAvailable ?? false,
    encryptString: (value) => Buffer.from(`enc:${value}`),
    decryptString:
      options.decryptString ?? ((value) => value.toString('utf-8').replace(/^enc:/, '')),
    describeProtectionGap: () => null
  })
  vi.doMock('os', async () => {
    const actual = await vi.importActual<typeof Os>('os')
    return { ...actual, homedir: () => tempHome }
  })
  return import('./dooray-credential-store')
}

beforeEach(() => {
  tempHome = mkdtempSync(join(tmpdir(), 'orca-dooray-cred-'))
  orcaDir = join(tempHome, '.orca')
  mkdirSync(orcaDir, { recursive: true })
})

describe('Dooray credential store', () => {
  it('reads a v0.2.2 account file and plaintext token without reconnecting', async () => {
    writeFileSync(join(orcaDir, 'dooray-account.json'), JSON.stringify(account))
    writeFileSync(join(orcaDir, 'dooray-token.enc'), 'tok-abc')
    const store = await loadStore({
      encryptionAvailable: true,
      decryptString: () => {
        throw new Error('x')
      }
    })
    expect(store.readDoorayAccount()?.viewer.id).toBe('1')
    expect(store.readDoorayAccount()?.webUrl).toBe('https://nhnent.dooray.com')
    expect(store.readDoorayToken()).toBe('tok-abc')
    expect(store.hasStoredDoorayToken()).toBe(true)
  })

  it('rejects an account missing viewer.id', async () => {
    writeFileSync(
      join(orcaDir, 'dooray-account.json'),
      JSON.stringify({ ...account, viewer: { name: 'Kim' } })
    )
    const store = await loadStore()
    expect(store.readDoorayAccount()).toBeNull()
  })

  it('returns null for a missing or malformed account file', async () => {
    const store = await loadStore()
    expect(store.readDoorayAccount()).toBeNull()
    writeFileSync(join(orcaDir, 'dooray-account.json'), '{nope')
    const again = await loadStore()
    expect(again.readDoorayAccount()).toBeNull()
  })

  it('defaults optional account fields', async () => {
    writeFileSync(
      join(orcaDir, 'dooray-account.json'),
      JSON.stringify({ apiUrl: 'https://a', viewer: { id: '2', name: 'Lee' } })
    )
    const store = await loadStore()
    expect(store.readDoorayAccount()).toEqual({
      version: 1,
      apiUrl: 'https://a',
      webUrl: null,
      viewer: { id: '2', name: 'Lee', userCode: '', email: null }
    })
  })

  it('writes the account as 2-space JSON', async () => {
    const store = await loadStore()
    store.writeDoorayAccount(account)
    expect(readFileSync(join(orcaDir, 'dooray-account.json'), 'utf-8')).toBe(
      JSON.stringify(account, null, 2)
    )
    expect(store.readDoorayAccount()).toEqual(account)
  })

  it('creates the orca dir when missing', async () => {
    const store = await loadStore()
    const fresh = mkdtempSync(join(tmpdir(), 'orca-dooray-fresh-'))
    tempHome = fresh
    store.writeDoorayAccount(account)
    expect(existsSync(join(fresh, '.orca', 'dooray-account.json'))).toBe(true)
  })

  it('saves the token encrypted when available and reads it back after reload', async () => {
    const store = await loadStore({ encryptionAvailable: true })
    store.saveDoorayToken('tok-1')
    expect(readFileSync(join(orcaDir, 'dooray-token.enc'), 'utf-8')).toBe('enc:tok-1')
    const reloaded = await loadStore({ encryptionAvailable: true })
    expect(reloaded.readDoorayToken()).toBe('tok-1')
  })

  it('saves plaintext when encryption is unavailable', async () => {
    const store = await loadStore({ encryptionAvailable: false })
    store.saveDoorayToken('tok-2')
    expect(readFileSync(join(orcaDir, 'dooray-token.enc'), 'utf-8')).toBe('tok-2')
  })

  it('records and rethrows a decryption failure', async () => {
    writeFileSync(join(orcaDir, 'dooray-token.enc'), Buffer.from([0x76, 0x31, 0x30, 0x01, 0x02]))
    const store = await loadStore({
      encryptionAvailable: true,
      decryptString: () => {
        throw new Error('denied')
      }
    })
    expect(() => store.readDoorayToken()).toThrow(/Could not decrypt saved Dooray credential/)
    expect(store.getDoorayCredentialError()).toMatch(/Dooray/)
  })

  it('returns null without a token file and clears a prior error on save', async () => {
    const store = await loadStore()
    expect(store.readDoorayToken()).toBeNull()
    expect(store.hasStoredDoorayToken()).toBe(false)
    expect(store.getDoorayCredentialError()).toBeNull()
  })

  it('clear removes both files and caches', async () => {
    const store = await loadStore()
    store.writeDoorayAccount(account)
    store.saveDoorayToken('tok-3')
    store.clearDoorayCredentials()
    expect(existsSync(join(orcaDir, 'dooray-account.json'))).toBe(false)
    expect(existsSync(join(orcaDir, 'dooray-token.enc'))).toBe(false)
    expect(store.readDoorayAccount()).toBeNull()
    expect(store.readDoorayToken()).toBeNull()
    expect(store.hasStoredDoorayToken()).toBe(false)
  })

  it('runs against an injected backend without touching disk', async () => {
    const { createDoorayCredentialStore } = await loadStore()
    const calls: string[] = []
    const backend: DoorayCredentialBackend = {
      readAccountText: () => JSON.stringify(account),
      writeAccountText: (text) => calls.push(`account:${text.length > 0}`),
      deleteAccount: () => calls.push('deleteAccount'),
      readToken: () => 'mem-token',
      writeToken: (token) => calls.push(`token:${token}`),
      deleteToken: () => calls.push('deleteToken'),
      hasToken: () => true
    }
    const store = createDoorayCredentialStore(backend)
    expect(store.readDoorayAccount()?.viewer.name).toBe('Kim')
    expect(store.readDoorayToken()).toBe('mem-token')
    store.saveDoorayToken('t')
    store.clearDoorayCredentials()
    expect(calls).toEqual(['token:t', 'deleteToken', 'deleteAccount'])
  })
})
