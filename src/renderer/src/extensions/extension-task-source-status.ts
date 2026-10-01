import { useEffect } from 'react'
import { INSTALLED_RENDERER_EXTENSIONS } from './installed-renderer-extensions'
import { rendererExtensionSlot } from './extension-slot-hooks'
import type { RendererExtension } from './renderer-extension-contract'

export type ExtensionTaskSourceFact = { label: string; ready: boolean; connected: boolean }

// Installed list is a module constant, so the hook count is stable across renders.
export function useExtensionTaskSourceFacts(
  extensions: readonly RendererExtension[] = INSTALLED_RENDERER_EXTENSIONS
): ExtensionTaskSourceFact[] {
  return rendererExtensionSlot('taskSource', extensions).map((source) => ({
    label: source.label(),
    ...source.useStatus()
  }))
}

// Unready or unconnected sources contribute nothing, so they never stall a checklist.
export function connectedExtensionTaskSourceNames(
  facts: readonly ExtensionTaskSourceFact[] | undefined
): string[] {
  return (facts ?? []).filter((fact) => fact.ready && fact.connected).map((fact) => fact.label)
}

export function useExtensionTaskSourceStatusRefresh(
  extensions: readonly RendererExtension[] = INSTALLED_RENDERER_EXTENSIONS
): void {
  useEffect(() => {
    for (const source of rendererExtensionSlot('taskSource', extensions)) {
      source.ensureStatus()
    }
  }, [extensions])
}

// For surfaces that read facts without the integrations pane mounted.
export function useRefreshedExtensionTaskSourceFacts(
  extensions: readonly RendererExtension[] = INSTALLED_RENDERER_EXTENSIONS
): ExtensionTaskSourceFact[] {
  useExtensionTaskSourceStatusRefresh(extensions)
  return useExtensionTaskSourceFacts(extensions)
}
