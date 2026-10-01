import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { activateAndRevealWorktree } from '@/lib/worktree-activation'
import { getWorktreeAttachmentLabel } from '@/lib/worktree-attachment-label'
import { useAppStore } from '@/store'
import type { DoorayIssue } from '../../../../../shared/extensions/dooray/dooray-types'
import type { Repo } from '../../../../../shared/repo-types'
import type { Worktree } from '../../../../../shared/worktree/types'
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
import { readDoorayErrorMessage } from '../lib/dooray-error-messages'

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

// Names the worktree the user is about to stash/discard in, not just its repo.
function describeWorkspace(worktree: Worktree, repo: Repo | null): string {
  const label = getWorktreeAttachmentLabel(worktree)
  return repo ? `${label} · ${repo.displayName}` : label
}

function readTaskBranchApi(): TaskBranchPreloadApi | undefined {
  return window.api?.dooray?.taskBranch
}

// One switch per worktree at a time: a second click would race inspect/stash against the first switch.
const switchingWorktreeIds = new Set<string>()

function renameFailed(detail: string): void {
  toast.warning(
    translate(
      'auto.ext.dooray.lib.dooray.start.in.current.workspace.rename_failed',
      "Couldn't rename the workspace to the task title: {{value0}}",
      { value0: detail }
    )
  )
}

function finishOnWorktree(worktreeId: string, subject: string): void {
  useAppStore
    .getState()
    .updateWorktreeMeta(worktreeId, { displayName: subject })
    .then((result) => {
      if (!result.ok) {
        renameFailed(result.error)
      }
    })
    .catch((error: unknown) => renameFailed(readDoorayErrorMessage(error, String(error))))
  activateAndRevealWorktree(worktreeId)
}

function targetLabel(submodulePath: string): string {
  return submodulePath === ''
    ? translate(
        'auto.ext.dooray.lib.dooray.start.in.current.workspace.parent_target',
        'workspace root'
      )
    : submodulePath
}

// Created branches that did not start from the chosen base must not read as a plain success.
function reportBaseFallbacks(
  branch: string,
  baseRef: string | null,
  results: readonly TaskBranchSwitchResult[]
): boolean {
  if (!baseRef) {
    return false
  }
  const created = results.flatMap((result) => (result.status === 'created' ? [result] : []))
  const fromHead = created.filter((result) => result.baseFallback === 'head')
  const fromLocal = created.filter((result) => result.fetchFailed && !result.baseFallback)
  if (fromHead.length > 0) {
    toast.warning(
      translate(
        'auto.ext.dooray.lib.dooray.start.in.current.workspace.base_fallback_head',
        'Created {{value0}} from current HEAD because {{value1}} was not found: {{value2}}',
        {
          value0: branch,
          value1: baseRef,
          value2: fromHead.map((result) => targetLabel(result.submodulePath)).join(', ')
        }
      )
    )
  }
  if (fromLocal.length > 0) {
    toast.warning(
      translate(
        'auto.ext.dooray.lib.dooray.start.in.current.workspace.base_fetch_failed',
        'Fetch failed; created {{value0}} from local {{value1}}: {{value2}}',
        {
          value0: branch,
          value1: baseRef,
          value2: fromLocal.map((result) => targetLabel(result.submodulePath)).join(', ')
        }
      )
    )
  }
  return fromHead.length > 0 || fromLocal.length > 0
}

function reportSwitchResults(
  branch: string,
  baseRef: string | null,
  results: readonly TaskBranchSwitchResult[],
  withSubmodules: boolean
): void {
  const failed = results.flatMap((result) =>
    result.status === 'failed' ? [`${result.submodulePath}: ${result.error}`] : []
  )
  const skipped = results.flatMap((result) =>
    result.status === 'skipped-missing' ? [result.submodulePath] : []
  )
  const fellBack = reportBaseFallbacks(branch, baseRef, results)
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
  if (failed.length > 0 || skipped.length > 0 || fellBack) {
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
  const submodulePaths = [...(readRepoDoorayStart(repo)?.submodulePaths ?? [])]
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
  if (switchingWorktreeIds.has(worktree.id)) {
    toast.info(
      translate(
        'auto.ext.dooray.lib.dooray.start.in.current.workspace.already_switching',
        'This workspace is already switching to a task branch.'
      )
    )
    return
  }
  switchingWorktreeIds.add(worktree.id)
  try {
    await switchToTaskBranch(issue, options, { worktree, repo, branch, submodulePaths })
  } finally {
    switchingWorktreeIds.delete(worktree.id)
  }
}

async function switchToTaskBranch(
  issue: DoorayIssue,
  options: DoorayStartInCurrentOptions,
  target: {
    worktree: Worktree
    repo: Repo | null
    branch: string
    submodulePaths: string[]
  }
): Promise<void> {
  const { worktree, repo, branch } = target
  let { submodulePaths } = target
  const availability = readDoorayStartAvailability(useAppStore.getState(), worktree)
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
            workspaceLabel: describeWorkspace(worktree, repo),
            dirtyTargets
          })
        : 'cancel'
      if (resolution === 'cancel') {
        return
      }
      // Only what the prompt listed; a target that got dirty since is never reset unseen.
      const scoped = { ...request, onlyTargets: dirtyTargets.map((dirty) => dirty.submodulePath) }
      if (resolution === 'stash') {
        await taskBranch.stash({ ...scoped, message: doorayStashMessage(branch) })
        toast.success(
          translate(
            'auto.ext.dooray.lib.dooray.start.in.current.workspace.stashed',
            'Changes stashed.'
          )
        )
      } else {
        await taskBranch.discard(scoped)
      }
    }
    const results = await taskBranch.switch({
      ...request,
      branch,
      ...(baseRef ? { baseRef } : {}),
      ...(baseRef && fetchBase ? { fetchBase: true } : {})
    })
    finishOnWorktree(worktree.id, issue.subject)
    reportSwitchResults(branch, baseRef, results, submodulePaths.length > 0)
  } catch (error) {
    toast.error(
      readDoorayErrorMessage(
        error,
        translate(
          'auto.ext.dooray.lib.dooray.start.in.current.workspace.failed',
          'Failed to switch to the task branch.'
        )
      )
    )
  }
}
