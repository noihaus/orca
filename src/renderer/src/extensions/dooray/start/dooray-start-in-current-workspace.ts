import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { activateAndRevealWorktree } from '@/lib/worktree-activation'
import { useAppStore } from '@/store'
import type { DoorayIssue } from '../../../../../shared/extensions/dooray/dooray-types'
import type {
  TaskBranchPreloadApi,
  TaskBranchSwitchResult
} from '../../../../../shared/extensions/dooray/task-branch-types'
import { getDoorayTaskBranchName } from '../lib/dooray-branch-matching'
import { readRepoDoorayStart } from './dooray-repo-start-settings'
import { findDoorayWorktreeRepo, readDoorayStartAvailability } from './dooray-start-availability'
import { normalizeDoorayBranch } from './dooray-start-workspace-options'
import type { DoorayDirtyPrompt } from './dooray-dirty-workspace-prompt'
import type { DoorayBaseRefPrompt } from './dooray-task-base-ref-context'

export type DoorayStartInCurrentOptions = {
  // Omitted/null = the active workspace.
  worktreeId?: string | null
  promptBaseRef?: DoorayBaseRefPrompt | null
  promptDirtyWorkspace?: DoorayDirtyPrompt | null
}

// Git metadata, not UI text: identifies Orca's stash entry in `git stash list`.
function doorayStashMessage(branch: string): string {
  return `orca: ${branch}`
}

function readTaskBranchApi(): TaskBranchPreloadApi | undefined {
  return window.api?.dooray?.taskBranch
}

function finishOnWorktree(worktreeId: string, subject: string): void {
  void useAppStore.getState().updateWorktreeMeta(worktreeId, { displayName: subject })
  activateAndRevealWorktree(worktreeId)
}

function reportSwitchResults(
  branch: string,
  results: readonly TaskBranchSwitchResult[],
  withSubmodules: boolean
): void {
  const failed = results.flatMap((result) =>
    result.status === 'failed' ? [`${result.submodulePath}: ${result.error}`] : []
  )
  const skipped = results.flatMap((result) =>
    result.status === 'skipped-missing' ? [result.submodulePath] : []
  )
  if (failed.length > 0) {
    toast.warning(
      translate(
        'auto.ext.dooray.lib.dooray.start.in.current.workspace.submodules_failed',
        'Switched to {{value0}}, but these submodules did not switch: {{value1}}',
        { value0: branch, value1: failed.join('; ') }
      )
    )
  }
  if (skipped.length > 0) {
    toast.warning(
      translate(
        'auto.ext.dooray.lib.dooray.start.in.current.workspace.skipped',
        'Switched to {{value0}}. Not checked out here: {{value1}}',
        { value0: branch, value1: skipped.join(', ') }
      )
    )
  }
  if (failed.length > 0 || skipped.length > 0) {
    return
  }
  toast.success(
    withSubmodules
      ? translate(
          'auto.ext.dooray.lib.dooray.start.in.current.workspace.switched_with_submodules',
          'Switched to {{value0}} ({{count}} checkouts).',
          { value0: branch, count: results.length }
        )
      : translate(
          'auto.ext.dooray.lib.dooray.start.in.current.workspace.switched',
          'Switched to {{value0}}.',
          { value0: branch }
        )
  )
}

export async function startDoorayTaskInCurrentWorkspace(
  issue: DoorayIssue,
  options: DoorayStartInCurrentOptions = {}
): Promise<void> {
  const state = useAppStore.getState()
  const worktreeId = options.worktreeId ?? state.activeWorktreeId
  const worktree = worktreeId ? (state.getKnownWorktreeById(worktreeId) ?? null) : null
  if (!worktree) {
    toast.error(
      options.worktreeId
        ? translate(
            'auto.ext.dooray.lib.dooray.start.in.current.workspace.target_missing',
            'The configured target workspace was not found.'
          )
        : translate(
            'auto.ext.dooray.lib.dooray.start.in.current.workspace.no_active',
            'No active workspace to start this task in.'
          )
    )
    return
  }
  const branch = getDoorayTaskBranchName(issue)
  const repo = findDoorayWorktreeRepo(state, worktree)
  let submodulePaths = [...(readRepoDoorayStart(repo)?.submodulePaths ?? [])]
  if (normalizeDoorayBranch(worktree.branch) === branch && submodulePaths.length === 0) {
    finishOnWorktree(worktree.id, issue.subject)
    toast.success(
      translate(
        'auto.ext.dooray.lib.dooray.start.in.current.workspace.already_on',
        'Already on {{value0}}.',
        { value0: branch }
      )
    )
    return
  }
  const availability = readDoorayStartAvailability(state, worktree)
  const taskBranch = readTaskBranchApi()
  if (!availability.available || !taskBranch) {
    toast.error(
      availability.available
        ? translate(
            'auto.ext.dooray.lib.dooray.start.in.current.workspace.unavailable',
            'Branch switching is unavailable in this client.'
          )
        : availability.reason
    )
    return
  }
  let baseRef: string | null = null
  let fetchBase = false
  if (options.promptBaseRef) {
    const choice = await options.promptBaseRef({
      branch,
      repoId: worktree.repoId,
      worktreePath: worktree.path,
      defaultSubmodulePaths: submodulePaths
    })
    if (choice === 'cancel') {
      return
    }
    baseRef = choice.baseRef
    fetchBase = choice.fetchBase ?? false
    if (choice.submodulePaths) {
      submodulePaths = [...choice.submodulePaths]
    }
  }
  try {
    const request = { worktreePath: worktree.path, submodulePaths }
    const dirtyTargets = await taskBranch.inspect(request)
    if (dirtyTargets.length > 0) {
      const resolution = options.promptDirtyWorkspace
        ? await options.promptDirtyWorkspace({
            branch,
            workspaceLabel: repo?.displayName ?? worktree.displayName,
            dirtyTargets
          })
        : 'cancel'
      if (resolution === 'cancel') {
        return
      }
      if (resolution === 'stash') {
        await taskBranch.stash({ ...request, message: doorayStashMessage(branch) })
        toast.success(
          translate(
            'auto.ext.dooray.lib.dooray.start.in.current.workspace.stashed',
            'Changes stashed.'
          )
        )
      } else {
        await taskBranch.discard(request)
      }
    }
    const results = await taskBranch.switch({
      ...request,
      branch,
      ...(baseRef ? { baseRef } : {}),
      ...(baseRef && fetchBase ? { fetchBase: true } : {})
    })
    finishOnWorktree(worktree.id, issue.subject)
    reportSwitchResults(branch, results, submodulePaths.length > 0)
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : translate(
            'auto.ext.dooray.lib.dooray.start.in.current.workspace.failed',
            'Failed to switch to the task branch.'
          )
    )
  }
}
