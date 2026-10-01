import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { activateAndRevealWorktree } from '@/lib/worktree-activation'
import { useAppStore } from '@/store'
import type { DoorayIssue } from '../../../../../shared/extensions/dooray/dooray-types'
import { findDoorayWorkspaceMatch } from '../lib/dooray-branch-matching'

// Which listed issues already have a workspace, and how to jump to it.
export function useDoorayWorkspaceActions(issues: readonly DoorayIssue[]): {
  attachedIssueIds: ReadonlySet<string>
  openWorkspace: (issue: DoorayIssue) => void
} {
  const worktreesByRepo = useAppStore((state) => state.worktreesByRepo)
  const worktrees = useMemo(() => Object.values(worktreesByRepo).flat(), [worktreesByRepo])
  const attachedIssueIds = useMemo(() => {
    const ids = new Set<string>()
    for (const issue of issues) {
      if (findDoorayWorkspaceMatch(worktrees, issue.taskNumber)) {
        ids.add(issue.id)
      }
    }
    return ids
  }, [issues, worktrees])
  const openWorkspace = useCallback((issue: DoorayIssue) => {
    const match = findDoorayWorkspaceMatch(useAppStore.getState().allWorktrees(), issue.taskNumber)
    if (!match || activateAndRevealWorktree(match.id) === false) {
      toast.error(
        translate(
          'auto.ext.dooray.components.TaskPageDooray.open_workspace_failed',
          'Unable to open the workspace for this task.'
        )
      )
    }
  }, [])
  return { attachedIssueIds, openWorkspace }
}
