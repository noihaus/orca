import { describe, expect, it } from 'vitest'
import { RepoUpdate } from './repo-params'

const parse = (updates: Record<string, unknown>) => RepoUpdate.safeParse({ repo: 'id:r1', updates })

describe('repo.update extensionSettings', () => {
  it('keeps a plain object and null (clear)', () => {
    const kept = parse({ extensionSettings: { fake: { a: 1 } } })
    expect(kept.success && kept.data.updates.extensionSettings).toEqual({ fake: { a: 1 } })
    const cleared = parse({ extensionSettings: null })
    expect(cleared.success && cleared.data.updates.extensionSettings).toBeNull()
  })

  it('omits the key when absent', () => {
    const result = parse({ displayName: 'x' })
    expect(result.success && result.data.updates.extensionSettings).toBeUndefined()
  })

  it('rejects non-objects and payloads over 16KB with a clear message', () => {
    expect(parse({ extensionSettings: [] }).success).toBe(false)
    expect(parse({ extensionSettings: 'x' }).success).toBe(false)
    const big = parse({ extensionSettings: { fake: 'x'.repeat(16 * 1024) } })
    expect(big.success).toBe(false)
    expect(!big.success && big.error.issues[0]?.message).toMatch(/limit/)
  })
})
