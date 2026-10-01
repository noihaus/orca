import { describe, expect, it } from 'vitest'
import {
  MAX_REPO_EXTENSION_SETTINGS_BYTES,
  normalizeRepoExtensionSettings,
  validateRepoExtensionSettings
} from './repo-extension-settings'

describe('validateRepoExtensionSettings', () => {
  it('accepts plain JSON objects and returns a copy', () => {
    const input = { fake: { a: 1, list: ['x'] } }
    const result = validateRepoExtensionSettings(input)
    expect(result).toEqual({ ok: true, value: input })
    expect(result.ok && result.value).not.toBe(input)
  })

  it.each([null, undefined, 'x', 3, [], [1], new Date(), new Map()])('rejects %s', (value) => {
    expect(validateRepoExtensionSettings(value).ok).toBe(false)
  })

  it('rejects cyclic and bigint values as not serializable', () => {
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(validateRepoExtensionSettings(cyclic)).toMatchObject({ ok: false })
    expect(validateRepoExtensionSettings({ n: 1n })).toMatchObject({ ok: false })
  })

  it('rejects payloads over 16KB and accepts exactly the limit', () => {
    const overhead = JSON.stringify({ k: '' }).length
    const atLimit = { k: 'a'.repeat(MAX_REPO_EXTENSION_SETTINGS_BYTES - overhead) }
    expect(validateRepoExtensionSettings(atLimit).ok).toBe(true)
    const over = validateRepoExtensionSettings({ k: 'a'.repeat(MAX_REPO_EXTENSION_SETTINGS_BYTES) })
    expect(over).toMatchObject({ ok: false })
    expect(!over.ok && over.error).toContain('limit')
  })

  it('counts bytes, not characters', () => {
    const wide = { k: '한'.repeat(MAX_REPO_EXTENSION_SETTINGS_BYTES / 3) }
    expect(validateRepoExtensionSettings(wide).ok).toBe(false)
  })
})

describe('normalizeRepoExtensionSettings', () => {
  it('drops invalid persisted values', () => {
    expect(normalizeRepoExtensionSettings([])).toBeUndefined()
    expect(normalizeRepoExtensionSettings({ a: 1 })).toEqual({ a: 1 })
  })
})
