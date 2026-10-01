import { describe, expect, it, vi } from 'vitest'
import { defineMethod } from '../runtime/rpc/core'
import type { MainExtension, MainExtensionIpcContext } from './main-extension-contract'
import {
  bindMainExtensionRuntimeCommands,
  getMainExtensionRpcMethods,
  registerMainExtensionIpc
} from './register-main-extensions'

// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: registration only forwards the context
const FAKE_CONTEXT = { store: {} } as MainExtensionIpcContext

function createFakeExtension(registerIpc = vi.fn()): MainExtension {
  return {
    id: 'fake',
    registerIpcHandlers: registerIpc,
    rpcMethods: [defineMethod({ name: 'fake.ping', params: null, handler: () => 'pong' })],
    runtimeCommands: { prefix: 'fake', create: () => ({ fakePing: () => 'pong' }) }
  }
}

describe('main extension registration', () => {
  it('is a no-op with no extensions', () => {
    registerMainExtensionIpc(FAKE_CONTEXT, [])
    expect(getMainExtensionRpcMethods([])).toEqual([])
    expect(bindMainExtensionRuntimeCommands(Object.create(null), {}, [])).toEqual({})
  })

  it('registers IPC handlers of each extension', () => {
    const registerIpc = vi.fn()
    registerMainExtensionIpc(FAKE_CONTEXT, [createFakeExtension(registerIpc)])
    expect(registerIpc).toHaveBeenCalledWith(FAKE_CONTEXT)
  })

  it('exposes RPC methods that stay callable', () => {
    const [method] = getMainExtensionRpcMethods([createFakeExtension()])
    expect(method.name).toBe('fake.ping')
    expect(Reflect.apply(method.handler, undefined, [])).toBe('pong')
  })

  it('binds runtime commands under the extension prefix', () => {
    const bound = bindMainExtensionRuntimeCommands(Object.create(null), {}, [createFakeExtension()])
    expect(Object.keys(bound)).toEqual(['fakePing'])
    expect(bound.fakePing()).toBe('pong')
  })

  it('rejects runtime commands outside the declared prefix', () => {
    const extension: MainExtension = {
      ...createFakeExtension(),
      runtimeCommands: { prefix: 'fake', create: () => ({ jiraConnect: () => 1 }) }
    }
    expect(() => bindMainExtensionRuntimeCommands(Object.create(null), {}, [extension])).toThrow(
      /must start with "fake"/
    )
  })

  it('rejects duplicate command names across extensions', () => {
    const other: MainExtension = { ...createFakeExtension(), id: 'other' }
    expect(() =>
      bindMainExtensionRuntimeCommands(Object.create(null), {}, [createFakeExtension(), other])
    ).toThrow(/"other" runtime command "fakePing" is already bound/)
  })

  it('rejects commands colliding with reserved or runtime-instance names', () => {
    expect(() =>
      bindMainExtensionRuntimeCommands(Object.create(null), { fakePing: () => 1 }, [
        createFakeExtension()
      ])
    ).toThrow(/collides with an existing runtime command/)
    const runtime = Object.assign(Object.create(null), { fakePing: () => 1 })
    expect(() => bindMainExtensionRuntimeCommands(runtime, {}, [createFakeExtension()])).toThrow(
      /collides/
    )
  })
})
