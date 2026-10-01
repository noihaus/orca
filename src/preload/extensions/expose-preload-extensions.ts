import { INSTALLED_PRELOAD_EXTENSIONS } from './installed-preload-extensions'
import type { PreloadExtension, PreloadExtensionApis } from './preload-extension-contract'

type InstalledPreloadExtensionApis = PreloadExtensionApis<typeof INSTALLED_PRELOAD_EXTENSIONS>

// Collapses to never on a key collision with the core api, so `pnpm tc` fails.
export type ExtensionApisDisjointFrom<Core> = [
  Extract<keyof InstalledPreloadExtensionApis, keyof Core>
] extends [never]
  ? InstalledPreloadExtensionApis
  : never

export function preloadExtensionApis<const L extends readonly PreloadExtension[]>(
  extensions: L
): PreloadExtensionApis<L> {
  const apis: Record<string, unknown> = {}
  for (const { key, api } of extensions) {
    if (key in apis) {
      throw new Error(`Preload extension key "${key}" is already exposed`)
    }
    apis[key] = api
  }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: apis holds exactly one entry per extension key with that extension's api, which is what PreloadExtensionApis<L> maps.
  return apis as PreloadExtensionApis<L>
}

export function installedPreloadExtensionApis(): InstalledPreloadExtensionApis {
  return preloadExtensionApis(INSTALLED_PRELOAD_EXTENSIONS)
}
