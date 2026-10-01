import { describe, expect, expectTypeOf, it } from 'vitest'
import type { PreloadApi } from '../api-types'
import { preloadExtensionApis, installedPreloadExtensionApis } from './expose-preload-extensions'
import type { PreloadExtension, PreloadExtensionApis } from './preload-extension-contract'

const fakeExtension = {
  key: 'fake',
  api: { ping: (): Promise<string> => Promise.resolve('pong') }
} as const satisfies PreloadExtension

describe('preload extension APIs', () => {
  it('exposes nothing with no installed extensions', () => {
    expect(installedPreloadExtensionApis()).toEqual({})
  })

  it('exposes each extension api under its key', async () => {
    const apis = preloadExtensionApis([fakeExtension])
    expect(Object.keys(apis)).toEqual(['fake'])
    await expect(apis.fake.ping()).resolves.toBe('pong')
  })

  it('rejects duplicate keys', () => {
    expect(() => preloadExtensionApis([fakeExtension, fakeExtension])).toThrow(/already exposed/)
  })

  it('types each api under its key and adds nothing for an empty list', () => {
    expectTypeOf<PreloadExtensionApis<[typeof fakeExtension]>['fake']['ping']>().toEqualTypeOf<
      () => Promise<string>
    >()
    expectTypeOf<keyof PreloadExtensionApis<readonly []>>().toEqualTypeOf<never>()
    expectTypeOf<PreloadApi>().toHaveProperty('app')
  })
})
