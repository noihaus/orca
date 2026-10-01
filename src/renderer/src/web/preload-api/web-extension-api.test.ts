import { beforeEach, describe, expect, it, vi } from 'vitest'

const callRuntimeResult = vi.fn()
vi.mock('./web-runtime-calls', () => ({ callRuntimeResult }))

describe('web extension APIs', () => {
  beforeEach(() => {
    callRuntimeResult.mockReset()
    callRuntimeResult.mockResolvedValue('pong')
  })

  it('exposes exactly the opted-in runtime namespaces by default', async () => {
    const { createWebExtensionApis } = await import('./web-extension-api')
    const { INSTALLED_RUNTIME_NAMESPACE_API_KEYS } =
      await import('../../../../shared/extensions/installed-extension-manifest')
    expect(Object.keys(createWebExtensionApis())).toEqual([...INSTALLED_RUNTIME_NAMESPACE_API_KEYS])
  })

  it('routes an opted-in namespace over runtime RPC', async () => {
    const { createWebExtensionApis } = await import('./web-extension-api')
    const apis = createWebExtensionApis(['fake'])
    expect(Object.keys(apis)).toEqual(['fake'])
    const fake: { ping(args: unknown): Promise<string> } = apis.fake
    await expect(fake.ping({ a: 1 })).resolves.toBe('pong')
    expect(callRuntimeResult).toHaveBeenCalledWith('fake.ping', { a: 1 })
  })
})
