import { translate } from '@/i18n/i18n'
import { getRepoExecutionHostId, parseExecutionHostId } from '../../../../../shared/execution-host'
import { isFolderRepo } from '../../../../../shared/repo-kind'
import type { Repo } from '../../../../../shared/repo-types'
import type { Worktree } from '../../../../../shared/worktree/types'
import { getRuntimeEnvironmentIdForRepo } from '@/lib/repo-runtime-owner'
import { isWebClientLocation } from '@/lib/web-client-location'
import { findRepoForHost } from '@/store/slices/repo-host-identity'
import type { GlobalSettings } from '../../../../../shared/global-settings-types'

export type DoorayStartAvailability = { available: true } | { available: false; reason: string }

export type DoorayStartAvailabilityInput = {
  isWebClient: boolean
  // The runtime environment that owns the repo (null = this machine).
  runtimeEnvironmentId: string | null
  repo: Pick<Repo, 'kind' | 'connectionId' | 'executionHostId'> | null
  worktree: Pick<Worktree, 'hostId'>
}

export function unavailableInClientReason(): string {
  return translate(
    'auto.ext.dooray.lib.dooray.start.in.current.workspace.unavailable',
    'Branch switching is unavailable in this client.'
  )
}

// taskBranch runs git through local IPC only, so any non-local owner is refused up front.
export function getDoorayStartAvailability({
  isWebClient,
  runtimeEnvironmentId,
  repo,
  worktree
}: DoorayStartAvailabilityInput): DoorayStartAvailability {
  if (isWebClient) {
    return { available: false, reason: unavailableInClientReason() }
  }
  const hostKinds = [
    parseExecutionHostId(worktree.hostId)?.kind,
    repo ? parseExecutionHostId(getRepoExecutionHostId(repo))?.kind : undefined
  ]
  if (hostKinds.includes('ssh')) {
    return {
      available: false,
      reason: translate(
        'auto.ext.dooray.lib.dooray.start.in.current.workspace.ssh_unsupported',
        'Branch switching is only available for local workspaces, not SSH.'
      )
    }
  }
  if (runtimeEnvironmentId || hostKinds.includes('runtime')) {
    return {
      available: false,
      reason: translate(
        'auto.ext.dooray.lib.dooray.start.in.current.workspace.remote_runtime_unsupported',
        'Branch switching is unavailable for workspaces on a remote Orca server.'
      )
    }
  }
  if (!repo) {
    return { available: false, reason: unavailableInClientReason() }
  }
  if (isFolderRepo(repo)) {
    return {
      available: false,
      reason: translate(
        'auto.ext.dooray.lib.dooray.start.in.current.workspace.folder_unsupported',
        'Branch switching needs a git worktree; this workspace is a folder.'
      )
    }
  }
  return { available: true }
}

export type DoorayStartStateView = {
  repos: readonly Repo[]
  settings: Pick<GlobalSettings, 'activeRuntimeEnvironmentId'> | null
}

export function findDoorayWorktreeRepo(
  state: DoorayStartStateView,
  worktree: Pick<Worktree, 'repoId' | 'hostId'>
): Repo | null {
  return findRepoForHost(state.repos, worktree.repoId, {
    hostId: worktree.hostId,
    settings: state.settings
  })
}

// Web-client detection uses the page location: the web preload proxies window.api.dooray, so a feature check lies.
export function readDoorayStartAvailability(
  state: DoorayStartStateView,
  worktree: Pick<Worktree, 'repoId' | 'hostId'>
): DoorayStartAvailability {
  return getDoorayStartAvailability({
    isWebClient: isWebClientLocation(),
    runtimeEnvironmentId: getRuntimeEnvironmentIdForRepo(state, worktree.repoId),
    repo: findDoorayWorktreeRepo(state, worktree),
    worktree
  })
}
