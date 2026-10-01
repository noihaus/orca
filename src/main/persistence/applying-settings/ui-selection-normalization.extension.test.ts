import type * as InstalledManifest from '../../../shared/extensions/installed-extension-manifest'
import { describe, expect, it, vi } from 'vitest'
import { getDefaultUIState } from '../../../shared/constants'
import { normalizeRightSidebarTab } from './ui-selection-normalization'

vi.mock('../../../shared/extensions/installed-extension-manifest', async (importOriginal) => ({
  ...(await importOriginal<typeof InstalledManifest>()),
  INSTALLED_RIGHT_SIDEBAR_TAB_KEYS: ['ext:fake/tasks']
}))

describe('normalizeRightSidebarTab with extension tabs', () => {
  it('keeps an installed extension tab key', () => {
    expect(normalizeRightSidebarTab('ext:fake/tasks')).toBe('ext:fake/tasks')
  })

  it('resets an uninstalled or malformed extension tab key to the default tab', () => {
    const fallback = getDefaultUIState().rightSidebarTab
    expect(normalizeRightSidebarTab('ext:gone/tasks')).toBe(fallback)
    expect(normalizeRightSidebarTab('ext:fake')).toBe(fallback)
  })
})
