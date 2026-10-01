import type { MainExtension } from './main-extension-contract'

// The one list an extension edits to register itself; empty means stock upstream behavior.
export const INSTALLED_MAIN_EXTENSIONS: readonly MainExtension[] = []
