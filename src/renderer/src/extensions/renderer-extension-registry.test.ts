import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import type { StateCreator } from 'zustand'
import type { ExtensionStoreState, RendererExtension } from './renderer-extension-contract'
import { rendererExtensionSlices, type RendererExtensionSlices } from './extension-store-slices'
import { findExtensionTaskSource, rendererExtensionSlot } from './extension-slot-hooks'
import { withExtensionLocaleBundles } from './extension-locale-bundles'

type FakeSlice = { fakeCount: number; fakeRepoCount: () => number }
type SliceArgs = Parameters<StateCreator<ExtensionStoreState, [], [], object>>

function unusedSliceArgs(): SliceArgs {
  const api = { setState: vi.fn(), getState: vi.fn(), getInitialState: vi.fn(), subscribe: vi.fn() }
  return [vi.fn(), vi.fn(), api]
}

const { fakeExtension } = vi.hoisted(() => {
  const createFakeSlice: StateCreator<ExtensionStoreState, [], [], FakeSlice> = (_set, get) => ({
    fakeCount: 42,
    // Reads core state through the shared store.
    fakeRepoCount: () => get().repos.length
  })
  return {
    fakeExtension: {
      id: 'fake',
      createSlice: createFakeSlice,
      locales: {
        en: async () => ({ auto: { ext: { fake: { bundled: 'From the English bundle' } } } }),
        // The `menu` entry tries to overwrite a core key and must lose.
        ko: async () => ({ auto: { ext: { fake: { hello: '안녕하세요' } } }, menu: { file: 'X' } }),
        ja: () => Promise.reject(new Error('broken bundle'))
      }
    } as const satisfies RendererExtension
  }
})

vi.mock('./installed-renderer-extensions', () => ({
  INSTALLED_RENDERER_EXTENSIONS: [fakeExtension]
}))

describe('renderer extension store slices', () => {
  it('exposes an installed extension slice on the app store', async () => {
    const { useAppStore } = await import('@/store')
    // Untyped read: AppState is typed from the real (empty) installed list.
    const state = (): Record<string, unknown> => useAppStore.getState()
    expect(state().fakeCount).toBe(42)
    const fakeRepoCount = state().fakeRepoCount
    expect(typeof fakeRepoCount === 'function' ? fakeRepoCount() : null).toBe(0)
    // Core slices still compose alongside the extension.
    expect(state().repos).toEqual([])
  })

  it('rejects two extensions owning the same slice key', () => {
    const twin = { ...fakeExtension, id: 'twin' }
    expect(() => rendererExtensionSlices([fakeExtension, twin], ...unusedSliceArgs())).toThrow(
      /"fakeCount" is already owned by "fake"/
    )
  })

  it('types the intersection of installed slices and adds nothing for an empty list', () => {
    expectTypeOf<
      RendererExtensionSlices<[typeof fakeExtension]>['fakeCount']
    >().toEqualTypeOf<number>()
    expectTypeOf<keyof RendererExtensionSlices<readonly []>>().toEqualTypeOf<never>()
  })
})

describe('renderer extension locale bundles', () => {
  it('serves an extension bundle once its locale loads', async () => {
    const { i18n, setRendererUiLanguage, translate } = await import('@/i18n/i18n')
    await setRendererUiLanguage('ko')
    expect(translate('auto.ext.fake.hello', 'Hello')).toBe('안녕하세요')
    expect(i18n.t('menu.file', { defaultValue: 'File' })).not.toBe('X')
    await setRendererUiLanguage('en')
  })

  it('merges the English bundle into the eager catalog after init', async () => {
    const { translate } = await import('@/i18n/i18n')
    await vi.waitFor(() =>
      expect(translate('auto.ext.fake.bundled', 'Bundled')).toBe('From the English bundle')
    )
  })

  it('keeps the core catalog when an extension bundle fails to load', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const loaded = await withExtensionLocaleBundles(
      'ja',
      async () => ({ default: { menu: { file: 'ファイル' } } }),
      [fakeExtension]
    )
    expect(loaded.default).toEqual({ menu: { file: 'ファイル' } })
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('does not mutate the core catalog it merges into', async () => {
    const core = { auto: { core: { kept: 'yes' } } }
    const loaded = await withExtensionLocaleBundles('ko', async () => ({ default: core }), [
      fakeExtension
    ])
    expect(loaded.default).toMatchObject({
      auto: { core: { kept: 'yes' }, ext: { fake: { hello: '안녕하세요' } } }
    })
    expect(core).toEqual({ auto: { core: { kept: 'yes' } } })
  })
})

describe('renderer extension slots', () => {
  it('collects slot values in installed order and finds task sources by provider', () => {
    const Icon = (): null => null
    const taskSource = {
      providerId: 'fake',
      label: () => 'Fake',
      Icon,
      useStatus: () => ({ ready: true, connected: true }),
      ensureStatus: () => {},
      Panel: Icon,
      navShortcutLabel: () => ''
    }
    const extensions = [{ id: 'a' }, { id: 'b', taskSource }] satisfies RendererExtension[]
    expect(rendererExtensionSlot('taskSource', extensions)).toEqual([taskSource])
    expect(findExtensionTaskSource('fake', extensions)).toBe(taskSource)
    expect(findExtensionTaskSource('missing', extensions)).toBeNull()
  })
})
