import type { ActivityBarItem } from '@/components/right-sidebar/activity-bar-buttons'
import { INSTALLED_RENDERER_EXTENSIONS } from './installed-renderer-extensions'
import { rendererExtensionSlot } from './extension-slot-hooks'
import type { ExtensionRightSidebarTab, RendererExtension } from './renderer-extension-contract'

export function extensionRightSidebarTabs(
  extensions: readonly RendererExtension[] = INSTALLED_RENDERER_EXTENSIONS
): ExtensionRightSidebarTab[] {
  return rendererExtensionSlot('rightSidebarTabs', extensions).flat()
}

// No gitOnly: extension tabs stay visible for folder workspaces.
export function extensionRightSidebarActivityItems(
  extensions: readonly RendererExtension[] = INSTALLED_RENDERER_EXTENSIONS
): ActivityBarItem[] {
  return extensionRightSidebarTabs(extensions).map((tab) => ({
    id: tab.id,
    icon: tab.Icon,
    title: tab.title(),
    shortcut: ''
  }))
}

// Renders inside the caller's Suspense; unknown keys (uninstalled) render nothing.
export function ExtensionRightSidebarPanel({
  tabKey,
  extensions = INSTALLED_RENDERER_EXTENSIONS
}: {
  tabKey: string
  extensions?: readonly RendererExtension[]
}): React.JSX.Element | null {
  const Panel = extensionRightSidebarTabs(extensions).find((tab) => tab.id === tabKey)?.Panel
  return Panel ? <Panel /> : null
}
