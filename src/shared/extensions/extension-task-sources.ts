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

/** Built-in ids with installed extension ids in front, as a tuple so the provider union stays derived. */
export function withExtensionTaskProviders<const B extends readonly string[]>(
  builtin: B
): readonly [...ExtensionTaskProvider[], ...B] {
  return [...EXTENSION_TASK_PROVIDER_IDS, ...builtin]
}

/** null for built-in providers; extensions without a live signal are available only when alwaysAvailable. */
export function extensionTaskProviderAvailability(provider: string): boolean | null {
  const extension = EXTENSION_TASK_PROVIDERS.find((candidate) => candidate.id === provider)
  return extension ? extension.alwaysAvailable : null
}

function coversEveryExtensionTaskProvider<T>(
  record: Record<string, T>
): record is Record<ExtensionTaskProvider, T> {
  return EXTENSION_TASK_PROVIDER_IDS.every((provider) => provider in record)
}

/** Fills the extension keys of a `Record<TaskProvider, T>` so upstream literals stay exhaustive. */
export function extensionTaskProviderDefaults<T>(
  build: (provider: ExtensionTaskProvider) => T
): Record<ExtensionTaskProvider, T> {
  const record = Object.fromEntries(
    EXTENSION_TASK_PROVIDER_IDS.map((provider) => [provider, build(provider)])
  )
  if (coversEveryExtensionTaskProvider(record)) {
    return record
  }
  throw new Error('extension task provider record is missing an installed id')
}

type ExtensionSeedSettings = { seededExtensionTaskProviders?: unknown } | undefined

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
  settings: ExtensionSeedSettings,
  extensions: readonly ExtensionTaskProviderMeta[] = EXTENSION_TASK_PROVIDERS
): string[] {
  const seeded = normalizeSeededIds(settings?.seededExtensionTaskProviders)
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
  return stampSeededExtensionTaskProviders(undefined, extensions)
}

// Why: mirrors the one-shot Jira default so an extension appears once but a later opt-out survives reloads.
export function seedExtensionTaskProviders<P extends string>(
  visibleTaskProviders: readonly P[],
  settings: ExtensionSeedSettings,
  extensions: readonly ExtensionTaskProviderMeta[] = EXTENSION_TASK_PROVIDERS
): {
  visibleTaskProviders: string[]
  seededExtensionTaskProviders: string[]
  changed: boolean
} {
  const previous = normalizeSeededIds(settings?.seededExtensionTaskProviders)
  const seeded = stampSeededExtensionTaskProviders(
    { seededExtensionTaskProviders: previous },
    extensions
  )
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

/** A visible-provider list as an unseeded profile ends up after load: defaultVisible extensions in front. */
export function seededVisibleTaskProviders(builtin: readonly string[]): string[] {
  return seedExtensionTaskProviders(builtin, undefined).visibleTaskProviders
}
