import type { Repo } from '../../../shared/repo-types'
import { validateRepoExtensionSettings } from '../../../shared/repo-extension-settings'

// Throws before any repo mutation so a rejected patch leaves the row untouched.
export function applyRepoExtensionSettingsUpdate(
  repo: Repo,
  patch: { extensionSettings?: Repo['extensionSettings'] | null }
): void {
  if (!('extensionSettings' in patch)) {
    return
  }
  if (patch.extensionSettings == null) {
    delete repo.extensionSettings
  } else {
    const result = validateRepoExtensionSettings(patch.extensionSettings)
    if (!result.ok) {
      throw new Error(result.error)
    }
    repo.extensionSettings = result.value
  }
  delete patch.extensionSettings
}
