import type { PreloadExtension } from './preload-extension-contract'

// The one list an extension edits to register itself; empty means stock upstream behavior.
export const INSTALLED_PRELOAD_EXTENSIONS = [] as const satisfies readonly PreloadExtension[]
