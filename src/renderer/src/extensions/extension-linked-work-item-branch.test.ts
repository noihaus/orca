import { describe, expect, it } from 'vitest'
import { resolveExtensionLinkedWorkItemBranch } from './extension-linked-work-item-branch'
import type { RendererExtension } from './renderer-extension-contract'

const item = { type: 'issue', number: 1, title: 'T', url: 'https://x.test/1' } as const
const resolver = (name: string | null): RendererExtension => ({
  id: 'fixture',
  resolveLinkedWorkItemBranch: () => name
})

describe('resolveExtensionLinkedWorkItemBranch', () => {
  it('prefers the item override, trimmed, over resolvers', () => {
    expect(
      resolveExtensionLinkedWorkItemBranch({ ...item, branchNameOverride: ' feature/X/1 ' }, [
        resolver('other')
      ])
    ).toBe('feature/X/1')
  })

  it('uses the first resolver that yields a name', () => {
    expect(
      resolveExtensionLinkedWorkItemBranch(item, [resolver(null), resolver('a'), resolver('b')])
    ).toBe('a')
  })

  it('returns undefined without an item or a result', () => {
    expect(resolveExtensionLinkedWorkItemBranch(null, [resolver('a')])).toBeUndefined()
    expect(resolveExtensionLinkedWorkItemBranch(item, [resolver('  ')])).toBeUndefined()
    expect(resolveExtensionLinkedWorkItemBranch(item, [])).toBeUndefined()
  })
})
