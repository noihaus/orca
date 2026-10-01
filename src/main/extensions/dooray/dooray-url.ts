export const DEFAULT_DOORAY_API_URL = 'https://api.dooray.com'

export function normalizeDoorayUrl(url: string): string {
  const trimmed = url.trim()
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  let parsed: URL
  try {
    parsed = new URL(withScheme)
  } catch {
    throw new Error('Enter a valid Dooray URL.')
  }
  if (!parsed.hostname) {
    throw new Error('Enter a valid Dooray URL.')
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, '')
  parsed.search = ''
  parsed.hash = ''
  return parsed.toString().replace(/\/$/, '')
}
