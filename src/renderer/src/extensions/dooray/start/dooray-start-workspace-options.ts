import { getWorktreeAttachmentLabel } from '@/lib/worktree-attachment-label'
import type { Repo } from '../../../../../shared/repo-types'
import type { Worktree } from '../../../../../shared/worktree/types'
import { readRepoDoorayStart } from './dooray-repo-start-settings'

export type DoorayStartResolution =
  | { kind: 'new-worktree' }
  // null = the active workspace at click time.
  | { kind: 'existing-workspace'; worktreeId: string | null }

export function resolveDoorayStartAction(
  repo: Pick<Repo, 'extensionSettings'> | null,
  repoWorktrees: readonly Pick<Worktree, 'id' | 'isArchived'>[]
): DoorayStartResolution {
  const settings = readRepoDoorayStart(repo)
  if (settings?.mode !== 'existing-workspace') {
    return { kind: 'new-worktree' }
  }
  const targetId = settings.targetWorktreeId ?? null
  const targetExists =
    targetId !== null &&
    repoWorktrees.some((worktree) => worktree.id === targetId && !worktree.isArchived)
  return { kind: 'existing-workspace', worktreeId: targetExists ? targetId : null }
}

export function normalizeDoorayBranch(branch: string | null | undefined): string {
  const trimmed = branch?.trim() ?? ''
  return trimmed.startsWith('refs/heads/') ? trimmed.slice('refs/heads/'.length) : trimmed
}

export type DoorayStartWorkspaceOption = {
  id: string
  label: string
  branch: string
  projectName: string
  isActive: boolean
  isConfiguredTarget: boolean
  disabledReason?: string
}

// Active workspace first, then the start repo's, then everything else in store order.
export function buildDoorayStartWorkspaceOptions(args: {
  repos: readonly Pick<Repo, 'id' | 'displayName'>[]
  worktreesByRepo: Readonly<Record<string, readonly Worktree[] | undefined>>
  startRepoId: string | null
  activeWorktreeId: string | null
  configuredTargetId: string | null
  disabledReasonFor?: (worktree: Worktree) => string | undefined
}): DoorayStartWorkspaceOption[] {
  const ranked: { option: DoorayStartWorkspaceOption; rank: number }[] = []
  const seenRepoIds = new Set<string>()
  for (const repo of args.repos) {
    // Same repo id on two hosts shares one worktreesByRepo bucket.
    if (seenRepoIds.has(repo.id)) {
      continue
    }
    seenRepoIds.add(repo.id)
    for (const worktree of args.worktreesByRepo[repo.id] ?? []) {
      if (worktree.isArchived) {
        continue
      }
      const isActive = worktree.id === args.activeWorktreeId
      const disabledReason = args.disabledReasonFor?.(worktree)
      ranked.push({
        option: {
          id: worktree.id,
          label: getWorktreeAttachmentLabel(worktree),
          branch: normalizeDoorayBranch(worktree.branch),
          projectName: repo.displayName,
          isActive,
          isConfiguredTarget: worktree.id === args.configuredTargetId,
          ...(disabledReason ? { disabledReason } : {})
        },
        rank: isActive ? 0 : repo.id === args.startRepoId ? 1 : 2
      })
    }
  }
  // Array.prototype.sort is stable, so equal ranks keep store order.
  return ranked.sort((a, b) => a.rank - b.rank).map(({ option }) => option)
}
