import type { RendererExtension } from './renderer-extension-contract'

// The one list an extension edits to register itself; empty means stock upstream behavior.
// Keep entries free of eager React component imports: the store and i18n import this list.
export const INSTALLED_RENDERER_EXTENSIONS = [] as const satisfies readonly RendererExtension[]
