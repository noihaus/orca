import { INSTALLED_RUNTIME_NAMESPACE_API_KEYS } from '../../../../shared/extensions/installed-extension-manifest'
import { createRuntimeNamespaceApi } from './web-review-api'

export function createWebExtensionApis(
  keys: readonly string[] = INSTALLED_RUNTIME_NAMESPACE_API_KEYS
): Record<string, never> {
  return Object.fromEntries(keys.map((key) => [key, createRuntimeNamespaceApi(key)]))
}
