import { describe, expect, it, vi } from 'vitest'
import { defineMethod } from '../runtime/rpc/core'
import type { MainExtension } from './main-extension-contract'
import {
  bindMainExtensionRuntimeCommands,
  getMainExtensionRpcMethods,
  registerMainExtensionIpc
} from './register-main-extensions'

function createFakeExtension(registerIpc = vi.fn()): MainExtension {
  return {
    id: 'fake',
    registerIpcHandlers: registerIpc,
    rpcMethods: [defineMethod({ name: 'fake.ping', params: null, handler: () => 'pong' })],
    runtimeCommands: { prefix: 'fake', create: () => ({ fakePing: () => 'pong' }) }
  }
}

describe('main extension registration', () => {
  it('is a no-op with no installed extensions', () => {
    registerMainExtensionIpc()
    expect(getMainExtensionRpcMethods()).toEqual([])
    expect(bindMainExtensionRuntimeCommands(Object.create(null))).toEqual({})
  })

  it('registers IPC handlers of each extension', () => {
    const registerIpc = vi.fn()
    registerMainExtensionIpc([createFakeExtension(registerIpc)])
    expect(registerIpc).toHaveBeenCalledTimes(1)
  })

  it('exposes RPC methods that stay callable', () => {
    const [method] = getMainExtensionRpcMethods([createFakeExtension()])
    expect(method.name).toBe('fake.ping')
    expect(Reflect.apply(method.handler, undefined, [])).toBe('pong')
  })

  it('binds runtime commands under the extension prefix', () => {
    const bound = bindMainExtensionRuntimeCommands(Object.create(null), [createFakeExtension()])
    expect(Object.keys(bound)).toEqual(['fakePing'])
    expect(bound.fakePing()).toBe('pong')
  })

  it('rejects runtime commands outside the declared prefix', () => {
    const extension: MainExtension = {
      ...createFakeExtension(),
      runtimeCommands: { prefix: 'fake', create: () => ({ jiraConnect: () => 1 }) }
    }
    expect(() => bindMainExtensionRuntimeCommands(Object.create(null), [extension])).toThrow(
      /must start with "fake"/
    )
  })
})
