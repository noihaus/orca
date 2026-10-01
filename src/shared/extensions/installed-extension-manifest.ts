import type { ExtensionTaskProviderMeta } from './extension-task-sources'

// The one list an extension edits to register itself; empty means stock upstream behavior.
export const INSTALLED_TASK_PROVIDER_EXTENSIONS =
  [] as const satisfies readonly ExtensionTaskProviderMeta[]

export const INSTALLED_CREDENTIAL_SERVICES = [] as const satisfies readonly string[]

export type ExtensionCredentialService = (typeof INSTALLED_CREDENTIAL_SERVICES)[number]
