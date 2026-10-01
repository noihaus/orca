export type RepoExtensionSettings = Record<string, unknown>

export const MAX_REPO_EXTENSION_SETTINGS_BYTES = 16 * 1024

export type RepoExtensionSettingsResult =
  | { ok: true; value: RepoExtensionSettings }
  | { ok: false; error: string }

// Returns a JSON round-tripped copy so stored data is exactly what disk and RPC will carry.
export function validateRepoExtensionSettings(value: unknown): RepoExtensionSettingsResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, error: 'extensionSettings must be a plain object.' }
  }
  const prototype: unknown = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    return { ok: false, error: 'extensionSettings must be a plain object.' }
  }
  let json: string
  try {
    json = JSON.stringify(value)
  } catch {
    return { ok: false, error: 'extensionSettings must be JSON-serializable.' }
  }
  const bytes = new TextEncoder().encode(json).length
  if (bytes > MAX_REPO_EXTENSION_SETTINGS_BYTES) {
    return {
      ok: false,
      error: `extensionSettings is ${bytes} bytes; the limit is ${MAX_REPO_EXTENSION_SETTINGS_BYTES}.`
    }
  }
  const parsed: unknown = JSON.parse(json)
  return isRecord(parsed) ? { ok: true, value: parsed } : { ok: false, error: 'invalid' }
}

// Load-time tolerance: a corrupt persisted value is dropped rather than failing startup.
export function normalizeRepoExtensionSettings(value: unknown): RepoExtensionSettings | undefined {
  const result = validateRepoExtensionSettings(value)
  return result.ok ? result.value : undefined
}

function isRecord(value: unknown): value is RepoExtensionSettings {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// For boundaries that receive a raw patch: throws the validation error, leaves null/absent alone.
export function assertRepoExtensionSettingsUpdate(patch: { extensionSettings?: unknown }): void {
  if (patch.extensionSettings == null) {
    return
  }
  const result = validateRepoExtensionSettings(patch.extensionSettings)
  if (!result.ok) {
    throw new Error(result.error)
  }
}
