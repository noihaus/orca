import { describe, expect, it } from 'vitest'
import { DEFAULT_DOORAY_API_URL, normalizeDoorayUrl } from './dooray-url'

describe('normalizeDoorayUrl', () => {
  it('adds https and strips trailing slash', () => {
    expect(normalizeDoorayUrl(' nhnent.dooray.com/ ')).toBe('https://nhnent.dooray.com')
  })
  it('drops query and hash', () => {
    expect(normalizeDoorayUrl('https://api.dooray.com/?x=1#h')).toBe('https://api.dooray.com')
  })
  it('keeps http scheme and path prefix', () => {
    expect(normalizeDoorayUrl('http://host.example/base//')).toBe('http://host.example/base')
  })
  it('throws on missing host', () => {
    expect(() => normalizeDoorayUrl('http://')).toThrow('Enter a valid Dooray URL.')
    expect(() => normalizeDoorayUrl('')).toThrow('Enter a valid Dooray URL.')
  })
  it('exposes the default api url', () => {
    expect(DEFAULT_DOORAY_API_URL).toBe('https://api.dooray.com')
  })
})
