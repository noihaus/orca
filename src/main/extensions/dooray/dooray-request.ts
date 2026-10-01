import { isRecord } from './dooray-json-guards'
import type { DoorayViewer } from '../../../shared/extensions/dooray/dooray-types'

// Injected so a plugin worker can supply its own fetch; no Electron imports here.
export type DoorayTransport = { send: (url: string, init?: RequestInit) => Promise<Response> }

export type DoorayClient = {
  apiUrl: string
  webUrl: string | null
  viewer: DoorayViewer
  authorization: string
  transport: DoorayTransport
}

export type DoorayEnvelope = {
  result: unknown
  totalCount?: number
}

export class DoorayApiError extends Error {
  readonly status: number | null
  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'DoorayApiError'
    this.status = status
  }
}

const MAX_CONCURRENT = 4
let active = 0
const waiters: (() => void)[] = []

export async function withDoorayRequestSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    // The releasing request hands its slot over, so `active` stays put.
    await new Promise<void>((resolve) => waiters.push(resolve))
  } else {
    active += 1
  }
  try {
    return await fn()
  } finally {
    const next = waiters.shift()
    if (next) {
      next()
    } else {
      active -= 1
    }
  }
}

function readHeader(body: unknown): { isSuccessful?: boolean; resultMessage?: string } {
  const header = isRecord(body) ? body.header : null
  if (!isRecord(header)) {
    return {}
  }
  return {
    isSuccessful: typeof header.isSuccessful === 'boolean' ? header.isSuccessful : undefined,
    resultMessage:
      typeof header.resultMessage === 'string' && header.resultMessage
        ? header.resultMessage
        : undefined
  }
}

export async function doorayRequest(
  client: DoorayClient,
  path: string,
  init?: RequestInit
): Promise<DoorayEnvelope> {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  // Multipart bodies need the runtime to set the boundary.
  if (!(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Authorization', client.authorization)
  return withDoorayRequestSlot(async () => {
    const response = await client.transport.send(`${client.apiUrl}${path}`, { ...init, headers })
    const body: unknown = await response.json().catch(() => null)
    const header = readHeader(body)
    if (!response.ok) {
      throw new DoorayApiError(
        header.resultMessage || response.statusText || `Dooray request failed (${response.status})`,
        response.status
      )
    }
    if (header.isSuccessful === false) {
      throw new DoorayApiError(header.resultMessage || 'Dooray request failed', response.status)
    }
    if (!isRecord(body)) {
      return { result: null }
    }
    return {
      result: body.result ?? null,
      totalCount: typeof body.totalCount === 'number' ? body.totalCount : undefined
    }
  })
}
