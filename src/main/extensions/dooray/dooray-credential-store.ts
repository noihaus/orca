import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  CredentialDecryptionError,
  credentialFileHasContent,
  readStoredCredentialToken,
  writeCredentialFileAtomic,
  writeEncryptedCredential
} from '../../integration-credential-file'
import type { DoorayViewer } from '../../../shared/extensions/dooray/dooray-types'

export type DoorayAccountFile = {
  version: 1
  apiUrl: string
  webUrl: string | null
  viewer: DoorayViewer
}

// Storage seam: a plugin worker can supply `secrets.*` instead of the ~/.orca files.
export type DoorayCredentialBackend = {
  readAccountText(): string | null
  writeAccountText(text: string): void
  deleteAccount(): void
  // Throws CredentialDecryptionError when a stored token cannot be decrypted.
  readToken(): string | null
  writeToken(token: string): void
  deleteToken(): void
  hasToken(): boolean
}

function unlinkQuietly(path: string): void {
  try {
    unlinkSync(path)
  } catch {
    // Already gone.
  }
}

// Paths resolve per call so a changed home directory is honored.
export function createFileDoorayCredentialBackend(): DoorayCredentialBackend {
  const accountPath = (): string => join(homedir(), '.orca', 'dooray-account.json')
  const tokenPath = (): string => join(homedir(), '.orca', 'dooray-token.enc')
  const ensureDir = (path: string): void => {
    mkdirSync(dirname(path), { recursive: true })
  }
  return {
    readAccountText: () => {
      const path = accountPath()
      return existsSync(path) ? readFileSync(path, { encoding: 'utf-8' }) : null
    },
    writeAccountText: (text) => {
      const path = accountPath()
      ensureDir(path)
      writeCredentialFileAtomic(path, Buffer.from(text, 'utf-8'))
    },
    deleteAccount: () => unlinkQuietly(accountPath()),
    readToken: () => {
      const path = tokenPath()
      return existsSync(path) ? readStoredCredentialToken('Dooray', readFileSync(path)) : null
    },
    writeToken: (token) => {
      const path = tokenPath()
      ensureDir(path)
      writeEncryptedCredential('Dooray', path, token)
    },
    deleteToken: () => unlinkQuietly(tokenPath()),
    hasToken: () => credentialFileHasContent(tokenPath())
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseAccount(text: string): DoorayAccountFile | null {
  try {
    const parsed: unknown = JSON.parse(text)
    if (!isRecord(parsed) || !isRecord(parsed.viewer)) {
      return null
    }
    const { apiUrl, webUrl, viewer } = parsed
    const { id, name, userCode, email } = viewer
    if (typeof apiUrl !== 'string' || typeof id !== 'string' || typeof name !== 'string') {
      return null
    }
    return {
      version: 1,
      apiUrl,
      webUrl: typeof webUrl === 'string' ? webUrl : null,
      viewer: {
        id,
        name,
        userCode: typeof userCode === 'string' ? userCode : '',
        email: typeof email === 'string' ? email : null
      }
    }
  } catch {
    return null
  }
}

export type DoorayCredentialStore = ReturnType<typeof createDoorayCredentialStore>

export function createDoorayCredentialStore(backend: DoorayCredentialBackend) {
  let cachedAccount: DoorayAccountFile | null = null
  let accountLoaded = false
  let cachedToken: string | null = null
  let credentialErrorMessage: string | null = null

  return {
    readDoorayAccount(): DoorayAccountFile | null {
      if (!accountLoaded) {
        const text = backend.readAccountText()
        cachedAccount = text === null ? null : parseAccount(text)
        accountLoaded = true
      }
      return cachedAccount
    },
    writeDoorayAccount(account: DoorayAccountFile): void {
      backend.writeAccountText(JSON.stringify(account, null, 2))
      cachedAccount = account
      accountLoaded = true
    },
    readDoorayToken(): string | null {
      if (cachedToken !== null) {
        return cachedToken
      }
      try {
        const token = backend.readToken()
        if (token) {
          cachedToken = token
        }
        credentialErrorMessage = null
        return token
      } catch (error) {
        if (error instanceof CredentialDecryptionError) {
          credentialErrorMessage = error.message
          throw error
        }
        return null
      }
    },
    saveDoorayToken(token: string): void {
      backend.writeToken(token)
      cachedToken = token
      credentialErrorMessage = null
    },
    hasStoredDoorayToken(): boolean {
      return cachedToken !== null || backend.hasToken()
    },
    clearDoorayCredentials(): void {
      cachedToken = null
      credentialErrorMessage = null
      cachedAccount = null
      accountLoaded = true
      backend.deleteToken()
      backend.deleteAccount()
    },
    getDoorayCredentialError(): string | null {
      return credentialErrorMessage
    }
  }
}

const defaultStore = createDoorayCredentialStore(createFileDoorayCredentialBackend())

export const readDoorayAccount = defaultStore.readDoorayAccount
export const writeDoorayAccount = defaultStore.writeDoorayAccount
export const readDoorayToken = defaultStore.readDoorayToken
export const saveDoorayToken = defaultStore.saveDoorayToken
export const hasStoredDoorayToken = defaultStore.hasStoredDoorayToken
export const clearDoorayCredentials = defaultStore.clearDoorayCredentials
export const getDoorayCredentialError = defaultStore.getDoorayCredentialError
