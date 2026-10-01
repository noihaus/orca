import { describe, expect, it } from 'vitest'
import { DEFAULT_DOORAY_API_URL, normalizeDoorayUrl } from './dooray-url'

describe('normalizeDoorayUrl', () => {
  it('adds https and strips trailing slash', () => {
    expect(normalizeDoorayUrl(' nhnent.dooray.com/ ')).toBe('https://nhnent.dooray.com')
  })
  it('drops query and hash', () => {
    expect(normalizeDoorayUrl('https://api.dooray.com/?x=1#h')).toBe('https://api.dooray.com')
  })
  it('keeps the path prefix', () => {
    expect(normalizeDoorayUrl('https://host.example/base//')).toBe('https://host.example/base')
  })
  it('allows http only for loopback hosts', () => {
    expect(normalizeDoorayUrl('http://localhost:8080/')).toBe('http://localhost:8080')
    expect(normalizeDoorayUrl('http://127.0.0.1:9')).toBe('http://127.0.0.1:9')
    expect(normalizeDoorayUrl('http://[::1]:9')).toBe('http://[::1]:9')
    expect(() => normalizeDoorayUrl('http://host.example')).toThrow('Enter a valid Dooray URL.')
  })
  it('rejects non-http schemes', () => {
    for (const url of ['ftp://host.example', 'file:///etc/passwd', 'javascript://x']) {
      expect(() => normalizeDoorayUrl(url)).toThrow('Enter a valid Dooray URL.')
    }
  })
  it('throws on missing host', () => {
    expect(() => normalizeDoorayUrl('http://')).toThrow('Enter a valid Dooray URL.')
    expect(() => normalizeDoorayUrl('')).toThrow('Enter a valid Dooray URL.')
  })
  it('exposes the default api url', () => {
    expect(DEFAULT_DOORAY_API_URL).toBe('https://api.dooray.com')
  })
})
