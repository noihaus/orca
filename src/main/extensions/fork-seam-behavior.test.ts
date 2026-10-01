import { describe, expect, it } from 'vitest'
import { getDefaultUIState } from '../../shared/constants'
import { TASK_PROVIDERS } from '../../shared/task-providers'
import {
  INSTALLED_RIGHT_SIDEBAR_TAB_KEYS,
  INSTALLED_TASK_PROVIDER_EXTENSIONS
} from '../../shared/extensions/installed-extension-manifest'
import type { ExtensionTaskProviderMeta } from '../../shared/extensions/extension-task-sources'
import { normalizeRightSidebarTab } from '../persistence/applying-settings/ui-selection-normalization'
import { ALL_RPC_METHODS } from '../runtime/rpc/methods'
import { INSTALLED_MAIN_EXTENSIONS } from './installed-main-extensions'
import { withMainExtensionRpcMethods } from './register-main-extensions'

describe('installed extensions reach every seam', () => {
  it('lists each installed task provider in TASK_PROVIDERS', () => {
    const ids: readonly string[] = INSTALLED_TASK_PROVIDER_EXTENSIONS.map(
      (extension: ExtensionTaskProviderMeta) => extension.id
    )
    for (const id of ids) {
      expect(TASK_PROVIDERS, `seam "task-provider-registry": ${id}`).toContain(id)
    }
  })

  it('keeps each installed right-sidebar tab across normalization', () => {
    const keys: readonly string[] = INSTALLED_RIGHT_SIDEBAR_TAB_KEYS
    for (const key of keys) {
      expect(normalizeRightSidebarTab(key), `seam "right-sidebar-extension-tab": ${key}`).toBe(key)
    }
    expect(normalizeRightSidebarTab('ext:not-installed/x')).toBe(
      getDefaultUIState().rightSidebarTab
    )
  })

  it('exposes each installed main extension RPC method', () => {
    const exposed = new Set(
      withMainExtensionRpcMethods(ALL_RPC_METHODS, ALL_RPC_METHODS).map((method) => method.name)
    )
    for (const extension of INSTALLED_MAIN_EXTENSIONS) {
      for (const method of extension.rpcMethods) {
        expect(exposed.has(method.name), `seam "runtime-rpc-methods": ${method.name}`).toBe(true)
      }
    }
  })
})
