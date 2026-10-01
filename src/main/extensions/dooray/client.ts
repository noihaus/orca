import type {
  DoorayConnectArgs,
  DoorayConnectResult,
  DoorayStatus,
  DoorayViewer
} from '../../../shared/extensions/dooray/dooray-types'
import { getMainHttpClient } from '../../network/http-client'
import { ensureElectronProxyFromEnvironment } from '../../network/proxy-settings'
import { withSpan } from '../../observability/tracer'
import {
  clearDoorayCredentials,
  getDoorayCredentialError,
  hasStoredDoorayToken,
  readDoorayAccount,
  readDoorayToken,
  saveDoorayToken,
  writeDoorayAccount
} from './dooray-credential-store'
import { asRecord } from './dooray-json-guards'
import { doorayRequest, type DoorayClient, type DoorayTransport } from './dooray-request'
import { DEFAULT_DOORAY_API_URL, normalizeDoorayUrl } from './dooray-url'

export { DoorayApiError, doorayRequest, withDoorayRequestSlot } from './dooray-request'
export type { DoorayClient } from './dooray-request'

// Assembly point: the only place that binds main-process HTTP, proxy setup and tracing.
async function sendThroughMainHttpClient(url: string, init?: RequestInit): Promise<Response> {
  const httpClient = getMainHttpClient()
  const proxySession = httpClient.proxySession()
  // Same proxy guard as Jira: a failed proxy apply must not block the request.
  await ensureElectronProxyFromEnvironment({
    ...(proxySession ? { proxySession } : {}),
    probeUrl: url
  }).catch(() => undefined)
  // Audited in proxy-guarded-fetch-call-site-audit via installed-audited-fetch-calls.ts.
  return httpClient.fetch(url, init)
}

const mainTransport: DoorayTransport = {
  send: (url, init) =>
    withSpan('dooray.request', () => sendThroughMainHttpClient(url, init), { kind: 'client' })
}

export function toDoorayViewer(data: unknown): DoorayViewer {
  const raw = asRecord(data)
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    name: typeof raw.name === 'string' ? raw.name : '',
    userCode: typeof raw.userCode === 'string' ? raw.userCode : '',
    email: typeof raw.externalEmailAddress === 'string' ? raw.externalEmailAddress : null
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Connection failed.'
}

function getDoorayClient(): DoorayClient | null {
  const account = readDoorayAccount()
  if (!account) {
    return null
  }
  const token = readDoorayToken()
  if (!token) {
    return null
  }
  return {
    apiUrl: account.apiUrl,
    webUrl: account.webUrl,
    viewer: account.viewer,
    authorization: `dooray-api ${token}`,
    transport: mainTransport
  }
}

export function requireDoorayClient(): DoorayClient {
  const client = getDoorayClient()
  if (!client) {
    throw new Error('Not connected to Dooray.')
  }
  return client
}

export function getDoorayStatus(): DoorayStatus {
  const account = readDoorayAccount()
  if (!account || !hasStoredDoorayToken()) {
    return { connected: false, viewer: null }
  }
  const credentialError = getDoorayCredentialError()
  return {
    connected: true,
    viewer: account.viewer,
    apiUrl: account.apiUrl,
    ...(account.webUrl ? { webUrl: account.webUrl } : {}),
    ...(credentialError ? { credentialError } : {})
  }
}

export async function connectDooray(args: DoorayConnectArgs): Promise<DoorayConnectResult> {
  const apiToken = args.apiToken.trim()
  if (!apiToken) {
    return { ok: false, error: 'API token is required.' }
  }
  let apiUrl: string
  let webUrl: string | null
  try {
    apiUrl = normalizeDoorayUrl(args.apiUrl?.trim() || DEFAULT_DOORAY_API_URL)
    webUrl = args.webUrl?.trim() ? normalizeDoorayUrl(args.webUrl) : null
  } catch {
    return { ok: false, error: 'Enter a valid Dooray URL.' }
  }
  try {
    const probe: DoorayClient = {
      apiUrl,
      webUrl,
      viewer: { id: '', name: '', userCode: '', email: null },
      authorization: `dooray-api ${apiToken}`,
      transport: mainTransport
    }
    const response = await doorayRequest(probe, '/common/v1/members/me')
    const viewer = toDoorayViewer(response.result)
    if (!viewer.id) {
      return { ok: false, error: 'Dooray did not return a member profile for this token.' }
    }
    saveDoorayToken(apiToken)
    writeDoorayAccount({ version: 1, apiUrl, webUrl, viewer })
    return { ok: true, viewer }
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}

export function disconnectDooray(): void {
  clearDoorayCredentials()
}

export async function testDoorayConnection(): Promise<DoorayConnectResult> {
  let client: DoorayClient | null
  try {
    client = getDoorayClient()
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
  if (!client) {
    return { ok: false, error: 'Not connected to Dooray.' }
  }
  try {
    const response = await doorayRequest(client, '/common/v1/members/me')
    return { ok: true, viewer: toDoorayViewer(response.result) }
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}
