import { INSTALLED_RENDERER_EXTENSIONS } from './installed-renderer-extensions'
import type { ExtensionTaskSource, RendererExtension } from './renderer-extension-contract'

type SlotValue<K extends keyof RendererExtension> = Exclude<RendererExtension[K], undefined>

// Values every extension contributes to one slot, in installed order.
export function rendererExtensionSlot<K extends keyof RendererExtension>(
  slot: K,
  extensions: readonly RendererExtension[] = INSTALLED_RENDERER_EXTENSIONS
): SlotValue<K>[] {
  return extensions
    .map((extension) => extension[slot])
    .filter((value): value is SlotValue<K> => value !== undefined)
}

export function findExtensionTaskSource(
  providerId: string,
  extensions: readonly RendererExtension[] = INSTALLED_RENDERER_EXTENSIONS
): ExtensionTaskSource | null {
  return (
    rendererExtensionSlot('taskSource', extensions).find(
      (source) => source.providerId === providerId
    ) ?? null
  )
}

// Falls back to the id so a manifest entry without a renderer task source still reads sensibly.
export function extensionTaskSourceLabel(
  providerId: string,
  extensions: readonly RendererExtension[] = INSTALLED_RENDERER_EXTENSIONS
): string {
  return findExtensionTaskSource(providerId, extensions)?.label() ?? providerId
}
