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

  it('includes the fixture RPC method in the runtime method list', async () => {
    const { ALL_RPC_METHODS } = await import('../runtime/rpc/methods')
    expect(
      ALL_RPC_METHODS.map((method) => method.name),
      'seam "runtime-rpc-methods"'
    ).toContain('fixture.ping')
  })
})
