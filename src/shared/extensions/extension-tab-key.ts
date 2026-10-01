import { INSTALLED_RIGHT_SIDEBAR_TAB_KEYS } from './installed-extension-manifest'

const SEGMENT = /^[a-z0-9][a-z0-9_-]*$/i

/** Right-sidebar tab key for an extension panel: `ext:<extensionId>/<panelId>`. */
export function isExtensionTabKey(tab: string): tab is `ext:${string}` {
  if (!tab.startsWith('ext:')) {
    return false
  }
  const [extensionId, panelId, ...extra] = tab.slice('ext:'.length).split('/')
  return extra.length === 0 && SEGMENT.test(extensionId ?? '') && SEGMENT.test(panelId ?? '')
}

// Main can't import renderer code, so "installed" is the declarative manifest list.
export function isInstalledExtensionTabKey(
  tab: string,
  installed: readonly string[] = INSTALLED_RIGHT_SIDEBAR_TAB_KEYS
): tab is `ext:${string}` {
  return isExtensionTabKey(tab) && installed.includes(tab)
}
