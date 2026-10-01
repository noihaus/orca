import { describe, expect, it, vi } from 'vitest'
import type { StateCreator } from 'zustand'
import type { ExtensionStoreState, RendererExtension } from './renderer-extension-contract'

vi.mock('./installed-renderer-extensions', () => ({ INSTALLED_RENDERER_EXTENSIONS: [] }))

function unusedSliceArgs(): Parameters<StateCreator<ExtensionStoreState, [], [], object>> {
  const api = { setState: vi.fn(), getState: vi.fn(), getInitialState: vi.fn(), subscribe: vi.fn() }
  return [vi.fn(), vi.fn(), api]
}

describe('installed renderer extension slices', () => {
  // Runtime twin of the ExtensionSlicesDisjointFrom typecheck: core spreads last and would hide a collision.
  it('never shadow a core app state key', async () => {
    const { useAppStore } = await import('@/store')
    const coreKeys = new Set(Object.keys(useAppStore.getState()))
    const { INSTALLED_RENDERER_EXTENSIONS } = await vi.importActual<{
      INSTALLED_RENDERER_EXTENSIONS: readonly RendererExtension[]
    }>('./installed-renderer-extensions')
    for (const extension of INSTALLED_RENDERER_EXTENSIONS) {
      const keys = Object.keys(extension.createSlice?.(...unusedSliceArgs()) ?? {})
      expect(
        keys.filter((key) => coreKeys.has(key)),
        extension.id
      ).toEqual([])
    }
  })
})
