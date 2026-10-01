import type { i18n as I18nInstance } from 'i18next'
import { INSTALLED_RENDERER_EXTENSIONS } from './installed-renderer-extensions'
import type { RendererExtension } from './renderer-extension-contract'

type Catalog = Record<string, unknown>

// Must match the namespace i18n.ts seeds and the lazy backend fills.
const TRANSLATION_NAMESPACE = 'translation'

function isCatalog(value: unknown): value is Catalog {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Same semantics as addResourceBundle(deep, no overwrite), but copies only the touched path.
function mergeWithoutOverwrite(base: Catalog, addition: Catalog): Catalog {
  const merged: Catalog = { ...base }
  for (const [key, value] of Object.entries(addition)) {
    const existing = merged[key]
    if (existing === undefined) {
      merged[key] = value
    } else if (isCatalog(existing) && isCatalog(value)) {
      merged[key] = mergeWithoutOverwrite(existing, value)
    }
  }
  return merged
}

export async function loadExtensionLocaleBundles(
  language: string,
  extensions: readonly RendererExtension[] = INSTALLED_RENDERER_EXTENSIONS
): Promise<Catalog[]> {
  const loads = extensions.flatMap((extension) =>
    Object.entries(extension.locales ?? {})
      .filter(([locale]) => locale === language)
      .map(async ([, load]) => {
        try {
          return load ? await load() : null
        } catch (error) {
          // A broken extension bundle must not keep the core catalog from loading.
          console.warn(`Renderer extension "${extension.id}" ${language} bundle failed`, error)
          return null
        }
      })
  )
  const bundles = await Promise.all(loads)
  return bundles.filter((bundle) => bundle !== null)
}

// Loads a lazy core catalog with extension bundles merged in, so a language switch
// never resolves before extension strings are available.
export async function withExtensionLocaleBundles(
  language: string,
  loadCore: () => Promise<{ default: Catalog }>,
  extensions: readonly RendererExtension[] = INSTALLED_RENDERER_EXTENSIONS
): Promise<{ default: Catalog }> {
  const [core, bundles] = await Promise.all([
    loadCore(),
    loadExtensionLocaleBundles(language, extensions)
  ])
  return { default: bundles.reduce(mergeWithoutOverwrite, core.default) }
}

// For catalogs already in memory (the eager English bundle).
export async function addExtensionLocaleBundles(
  i18n: I18nInstance,
  language: string,
  extensions: readonly RendererExtension[] = INSTALLED_RENDERER_EXTENSIONS
): Promise<void> {
  for (const bundle of await loadExtensionLocaleBundles(language, extensions)) {
    i18n.addResourceBundle(language, TRANSLATION_NAMESPACE, bundle, true, false)
  }
}
