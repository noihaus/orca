import { INSTALLED_TASK_PROVIDER_EXTENSIONS } from './installed-extension-manifest'

export type ExtensionTaskProviderMeta = {
  id: string
  /** Prepended to visibleTaskProviders once per profile; a later user opt-out sticks. */
  defaultVisible: boolean
  /** Shown even while disconnected so the Tasks tab can host its own connect CTA. */
  alwaysAvailable: boolean
}

export type ExtensionTaskProvider = (typeof INSTALLED_TASK_PROVIDER_EXTENSIONS)[number]['id']

export const EXTENSION_TASK_PROVIDERS: readonly ExtensionTaskProviderMeta[] =
  INSTALLED_TASK_PROVIDER_EXTENSIONS

export function isExtensionTaskProvider(value: unknown): value is ExtensionTaskProvider {
  return EXTENSION_TASK_PROVIDERS.some((extension) => extension.id === value)
}

export const EXTENSION_TASK_PROVIDER_IDS: readonly ExtensionTaskProvider[] =
  EXTENSION_TASK_PROVIDERS.map((extension) => extension.id).filter(isExtensionTaskProvider)

export function isExtensionTaskProviderAlwaysAvailable(provider: ExtensionTaskProvider): boolean {
  return EXTENSION_TASK_PROVIDERS.some(
    (extension) => extension.id === provider && extension.alwaysAvailable
  )
}

/** Fills the extension keys of a `Record<TaskProvider, T>` so upstream literals stay exhaustive. */
export function extensionTaskProviderDefaults<T>(
  build: (provider: ExtensionTaskProvider) => T
): Record<ExtensionTaskProvider, T> {
  const entries = EXTENSION_TASK_PROVIDER_IDS.map((provider) => [provider, build(provider)])
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: entries cover every ExtensionTaskProvider id exactly once.
  return Object.fromEntries(entries) as Record<ExtensionTaskProvider, T>
}

function normalizeSeededIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  const seeded: string[] = []
  for (const id of value) {
    if (typeof id === 'string' && !seeded.includes(id)) {
      seeded.push(id)
    }
  }
  return seeded
}

/** Records every defaultVisible extension as seeded, keeping earlier seeds (e.g. of uninstalled extensions). */
export function stampSeededExtensionTaskProviders(
  existing: unknown,
  extensions: readonly ExtensionTaskProviderMeta[] = EXTENSION_TASK_PROVIDERS
): string[] {
  const seeded = normalizeSeededIds(existing)
  for (const extension of extensions) {
    if (extension.defaultVisible && !seeded.includes(extension.id)) {
      seeded.push(extension.id)
    }
  }
  return seeded
}

/** A fresh profile already shows every defaultVisible extension, so it starts fully seeded. */
export function defaultSeededExtensionTaskProviders(
  extensions: readonly ExtensionTaskProviderMeta[] = EXTENSION_TASK_PROVIDERS
): string[] {
  return stampSeededExtensionTaskProviders([], extensions)
}

// Why: mirrors the one-shot Jira default so an extension appears once but a later opt-out survives reloads.
export function seedDefaultVisibleExtensionTaskProviders<P extends string>(
  visibleTaskProviders: readonly P[],
  seededExtensionTaskProviders: unknown,
  extensions: readonly ExtensionTaskProviderMeta[] = EXTENSION_TASK_PROVIDERS
): {
  visibleTaskProviders: string[]
  seededExtensionTaskProviders: string[]
  changed: boolean
} {
  const previous = normalizeSeededIds(seededExtensionTaskProviders)
  const seeded = stampSeededExtensionTaskProviders(previous, extensions)
  const newlySeeded = seeded.slice(previous.length)
  const prepended = newlySeeded.filter(
    (id) => !visibleTaskProviders.some((provider) => provider === id)
  )
  return {
    visibleTaskProviders: [...prepended, ...visibleTaskProviders],
    seededExtensionTaskProviders: seeded,
    changed: newlySeeded.length > 0
  }
}
