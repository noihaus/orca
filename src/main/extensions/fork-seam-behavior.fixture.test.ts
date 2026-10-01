import type * as InstalledManifest from '../../shared/extensions/installed-extension-manifest'
import { describe, expect, it, vi } from 'vitest'
import { defineMethod } from '../runtime/rpc/core'

vi.mock('../../shared/extensions/installed-extension-manifest', async (importOriginal) => ({
  ...(await importOriginal<typeof InstalledManifest>()),
  INSTALLED_TASK_PROVIDER_EXTENSIONS: [
    { id: 'fixture', defaultVisible: false, alwaysAvailable: false }
  ],
  INSTALLED_RIGHT_SIDEBAR_TAB_KEYS: ['ext:fixture/panel']
}))

vi.mock('./installed-main-extensions', () => ({
  INSTALLED_MAIN_EXTENSIONS: [
    {
      id: 'fixture',
      registerIpcHandlers: () => {},
      rpcMethods: [defineMethod({ name: 'fixture.ping', params: null, handler: () => 'pong' })]
    }
  ]
}))

describe('fork seams with a fixture extension installed', () => {
  it('adds the fixture id to TASK_PROVIDERS', async () => {
    const { TASK_PROVIDERS } = await import('../../shared/task-providers')
    expect(TASK_PROVIDERS, 'seam "task-provider-registry"').toContain('fixture')
  })

  it('keeps the fixture right-sidebar tab across normalization', async () => {
    const { normalizeRightSidebarTab } =
      await import('../persistence/applying-settings/ui-selection-normalization')
    expect(
      normalizeRightSidebarTab('ext:fixture/panel'),
      'seam "right-sidebar-extension-tab"'
    ).toBe('ext:fixture/panel')
  })

  it('dispatches the fixture RPC method through the full runtime method list', async () => {
    const { ALL_RPC_METHODS } = await import('../runtime/rpc/methods')
    const { RpcDispatcher } = await import('../runtime/rpc/dispatcher')
    const runtime = { getRuntimeId: () => 'runtime-fixture' }
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: fixture.ping reads nothing from the runtime
    const dispatcher = new RpcDispatcher({ runtime: runtime as never, methods: ALL_RPC_METHODS })
    const response = await dispatcher.dispatch({
      id: '1',
      authToken: 'fixture',
      method: 'fixture.ping'
    })
    expect(response, 'seam "runtime-rpc-methods"').toMatchObject({ ok: true, result: 'pong' })
    // The generated params catalog reads ALL_RPC_METHODS, so extension methods stay out of it.
    expect(ALL_RPC_METHODS.map((method) => method.name)).not.toContain('fixture.ping')
  })
})
