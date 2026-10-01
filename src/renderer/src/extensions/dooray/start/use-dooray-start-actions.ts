import { useCallback, useContext, useMemo } from 'react'
import { ConfirmationDialogContext } from '@/components/confirmation-dialog-context'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import type { DoorayIssue } from '../../../../../shared/extensions/dooray/dooray-types'
import type { Repo } from '../../../../../shared/repo-types'
import type { Worktree } from '../../../../../shared/worktree/types'
import type { DoorayStartAction, DoorayStartKind } from '../issue/DoorayIssueAside'
import { readRepoDoorayStart } from './dooray-repo-start-settings'
import { readDoorayStartAvailability } from './dooray-start-availability'
import { startDoorayTaskInCurrentWorkspace } from './dooray-start-in-current-workspace'
import {
  buildDoorayStartWorkspaceOptions,
  resolveDoorayStartAction
} from './dooray-start-workspace-options'
import { createDoorayDirtyWorkspacePrompt } from './dooray-dirty-workspace-prompt'
import { useDoorayTaskBaseRefPrompt } from './dooray-task-base-ref-context'
import type { DoorayWorkspaceStart } from './DoorayWorkspaceStartMenu'

export type DoorayStartActions = {
  primaryStartKind: DoorayStartKind
  onPrimaryStart: (issue: DoorayIssue) => void
  // Set when the primary action is "start in current workspace" and it cannot run.
  primaryDisabledReason?: string
  secondaryStart: DoorayStartAction
  workspaceStart: DoorayWorkspaceStart
  // Rows cannot host the picker, so they open the sheet instead.
  needsWorkspacePicker: boolean
}

const EMPTY_WORKTREES: Worktree[] = []

export function useDoorayStartActions(
  startRepo: Repo | null,
  onStartNewWorkspace: (issue: DoorayIssue) => void
): DoorayStartActions {
  const repoWorktrees = useAppStore((state) =>
    startRepo ? (state.worktreesByRepo[startRepo.id] ?? EMPTY_WORKTREES) : EMPTY_WORKTREES
  )
  const activeWorktreeId = useAppStore((state) => state.activeWorktreeId)
  const repos = useAppStore((state) => state.repos)
  const settings = useAppStore((state) => state.settings)
  const worktreesByRepo = useAppStore((state) => state.worktreesByRepo)
  const resolution = useMemo(
    () => resolveDoorayStartAction(startRepo, repoWorktrees),
    [repoWorktrees, startRepo]
  )
  const configuredTargetId = readRepoDoorayStart(startRepo)?.targetWorktreeId ?? null
  const options = useMemo(() => {
    const disabledReasonFor = (worktree: Worktree): string | undefined => {
      const availability = readDoorayStartAvailability({ repos, settings }, worktree)
      return availability.available ? undefined : availability.reason
    }
    return buildDoorayStartWorkspaceOptions({
      repos,
      worktreesByRepo,
      startRepoId: startRepo?.id ?? null,
      activeWorktreeId,
      configuredTargetId,
      disabledReasonFor
    })
  }, [activeWorktreeId, configuredTargetId, repos, settings, startRepo?.id, worktreesByRepo])

  const confirm = useContext(ConfirmationDialogContext)
  const promptBaseRef = useDoorayTaskBaseRefPrompt()
  const promptDirtyWorkspace = useMemo(
    () => (confirm ? createDoorayDirtyWorkspacePrompt(confirm) : null),
    [confirm]
  )
  const runInWorkspace = useCallback(
    (issue: DoorayIssue, worktreeId: string | null) => {
      void startDoorayTaskInCurrentWorkspace(issue, {
        worktreeId,
        promptBaseRef,
        promptDirtyWorkspace
      })
    },
    [promptBaseRef, promptDirtyWorkspace]
  )
  // A lone candidate wins over the configured/active target, matching what the menu would offer.
  const directTargetId =
    options.length === 1
      ? options[0].id
      : resolution.kind === 'existing-workspace' && resolution.worktreeId
        ? resolution.worktreeId
        : activeWorktreeId
  const directDisabledReason =
    options.length === 0
      ? translate(
          'auto.ext.dooray.components.DoorayIssueWorkspace.start_in_current_disabled',
          'No active workspace — open one first.'
        )
      : options.find((option) => option.id === directTargetId)?.disabledReason
  const startInWorkspaceDirect = useCallback(
    (issue: DoorayIssue) => runInWorkspace(issue, directTargetId),
    [directTargetId, runInWorkspace]
  )

  return useMemo(() => {
    const workspaceStart: DoorayWorkspaceStart = { options, onSelect: runInWorkspace }
    const needsWorkspacePicker = options.length > 1
    if (resolution.kind === 'existing-workspace') {
      return {
        primaryStartKind: 'existing-workspace',
        onPrimaryStart: startInWorkspaceDirect,
        ...(directDisabledReason && !needsWorkspacePicker
          ? { primaryDisabledReason: directDisabledReason }
          : {}),
        secondaryStart: { kind: 'new-worktree', run: onStartNewWorkspace },
        workspaceStart,
        needsWorkspacePicker
      }
    }
    return {
      primaryStartKind: 'new-worktree',
      onPrimaryStart: onStartNewWorkspace,
      secondaryStart: {
        kind: 'existing-workspace',
        run: startInWorkspaceDirect,
        ...(directDisabledReason ? { disabledReason: directDisabledReason } : {})
      },
      workspaceStart,
      needsWorkspacePicker
    }
  }, [
    directDisabledReason,
    onStartNewWorkspace,
    options,
    resolution.kind,
    runInWorkspace,
    startInWorkspaceDirect
  ])
}
