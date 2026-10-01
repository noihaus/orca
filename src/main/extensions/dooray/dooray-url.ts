export const DEFAULT_DOORAY_API_URL = 'https://api.dooray.com'

// The token rides in a header, so plain http is only allowed to a loopback host (local stubs).
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

function isAllowedScheme(parsed: URL): boolean {
  return (
    parsed.protocol === 'https:' ||
    (parsed.protocol === 'http:' && LOOPBACK_HOSTS.has(parsed.hostname))
  )
}

export function normalizeDoorayUrl(url: string): string {
  const trimmed = url.trim()
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  let parsed: URL
  try {
    parsed = new URL(withScheme)
  } catch {
    throw new Error('Enter a valid Dooray URL.')
  }
  if (!parsed.hostname || !isAllowedScheme(parsed)) {
    throw new Error('Enter a valid Dooray URL.')
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, '')
  parsed.search = ''
  parsed.hash = ''
  return parsed.toString().replace(/\/$/, '')
}
