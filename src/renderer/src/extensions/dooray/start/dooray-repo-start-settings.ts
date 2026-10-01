import type { Repo } from '../../../../../shared/repo-types'
import type { RepoExtensionSettings } from '../../../../../shared/repo-extension-settings'
import type { RepoDoorayStart } from '../../../../../shared/extensions/dooray/dooray-types'

const EXTENSION_KEY = 'dooray'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// extensionSettings is opaque JSON from disk or a remote host, so every field is re-validated.
export function readRepoDoorayStart(
  repo: Pick<Repo, 'extensionSettings'> | null | undefined
): RepoDoorayStart | null {
  const raw = repo?.extensionSettings?.[EXTENSION_KEY]
  if (!isRecord(raw)) {
    return null
  }
  const mode = raw.mode === 'existing-workspace' || raw.mode === 'new-worktree' ? raw.mode : null
  if (!mode) {
    return null
  }
  return {
    mode,
    targetWorktreeId: typeof raw.targetWorktreeId === 'string' ? raw.targetWorktreeId : null,
    submodulePaths: Array.isArray(raw.submodulePaths)
      ? raw.submodulePaths.filter((path): path is string => typeof path === 'string')
      : []
  }
}

export function hasRepoDoorayStart(
  repo: Pick<Repo, 'extensionSettings'> | null | undefined
): boolean {
  return isRecord(repo?.extensionSettings?.[EXTENSION_KEY])
}

// Keeps other extensions' keys intact.
export function withRepoDoorayStart(
  repo: Pick<Repo, 'extensionSettings'>,
  next: RepoDoorayStart
): RepoExtensionSettings {
  return { ...repo.extensionSettings, [EXTENSION_KEY]: next }
}
