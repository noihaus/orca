import { describe, expect, it } from 'vitest'
import { RightSidebarTabParam } from './client-ui-params'

describe('RightSidebarTabParam extension tabs', () => {
  it('accepts well-formed keys even when not installed (persistence normalizes them away)', () => {
    expect(RightSidebarTabParam.safeParse('ext:gone/tasks').success).toBe(true)
  })

  it('rejects malformed extension keys', () => {
    expect(RightSidebarTabParam.safeParse('ext:gone').success).toBe(false)
    expect(RightSidebarTabParam.safeParse('ext:a/b/c').success).toBe(false)
  })
})
