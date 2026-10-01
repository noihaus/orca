import type { ExtensionTaskProviderMeta } from './extension-task-sources'

// The one list an extension edits to register itself; empty means stock upstream behavior.
export const INSTALLED_TASK_PROVIDER_EXTENSIONS =
  [] as const satisfies readonly ExtensionTaskProviderMeta[]

export const INSTALLED_CREDENTIAL_SERVICES = [] as const satisfies readonly string[]

export type ExtensionCredentialService = (typeof INSTALLED_CREDENTIAL_SERVICES)[number]

// Subset of INSTALLED_PRELOAD_EXTENSIONS keys the web client serves over runtime RPC (that list can't load in a browser).
export const INSTALLED_RUNTIME_NAMESPACE_API_KEYS = [] as const satisfies readonly string[]

// Right-sidebar tab keys (`ext:<id>/<panel>`) main-side persistence keeps; a drift test pins these to the renderer registry.
export const INSTALLED_RIGHT_SIDEBAR_TAB_KEYS = [] as const satisfies readonly `ext:${string}`[]
