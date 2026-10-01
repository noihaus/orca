import type { PreloadExtension } from './preload-extension-contract'

// Keys must be disjoint from core window.api keys (typecheck-enforced); web RPC opt-ins live in INSTALLED_RUNTIME_NAMESPACE_API_KEYS.
// The one list an extension edits to register itself; empty means stock upstream behavior.
export const INSTALLED_PRELOAD_EXTENSIONS = [] as const satisfies readonly PreloadExtension[]
