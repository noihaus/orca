import type { Store } from '../../../persistence'
import type { MainExtensionIpcContext } from '../../main-extension-contract'
import type { GitRuntimeOptions } from '../../../git/git-runtime-options'
import { resolveRegisteredWorktreePath } from '../../../ipc/registered-worktree-roots-cache'
import {
  getLocalGitOptionsForRepo,
  getLocalRepoForRegisteredWorktree
} from '../../../ipc/local-worktree-runtime-options'
import { getStoredRepoSshConnectionId } from '../../../repo-execution-host'
import { isFolderRepo } from '../../../../shared/repo-kind'
import { asRecord } from '../dooray-json-guards'
import {
  discardTaskBranchTargets,
  inspectTaskBranchTargets,
  listTaskBranchSubmodules,
  stashTaskBranchTargets,
  switchTaskBranchTargets
} from './task-branch-git'

export const TASK_BRANCH_LOCAL_ONLY_ERROR =
  'Task branch switching is only available for local git worktrees.'
export const TASK_BRANCH_FOLDER_ERROR =
  'Task branch switching needs a git worktree; this workspace is a folder.'

type ResolvedWorktree = { worktreePath: string; options: GitRuntimeOptions }

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid task branch argument: ${key}`)
  }
  return value
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  return record[key] === undefined ? undefined : requireString(record, key)
}

function stringArrayOf(record: Record<string, unknown>, key: string): string[] | undefined {
  const value = record[key]
  if (value === undefined) {
    return undefined
  }
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) {
    throw new Error(`Invalid task branch argument: ${key}`)
  }
  return value
}

function submodulePathsOf(record: Record<string, unknown>): string[] {
  return stringArrayOf(record, 'submodulePaths') ?? []
}

function onlyTargetsOf(record: Record<string, unknown>): { onlyTargets?: string[] } {
  const onlyTargets = stringArrayOf(record, 'onlyTargets')
  return onlyTargets ? { onlyTargets } : {}
}

/** Only registered, local, git-kind worktrees qualify; SSH and folder workspaces are refused. */
export async function resolveLocalTaskBranchWorktree(
  store: Store,
  record: Record<string, unknown>
): Promise<ResolvedWorktree> {
  if (record.connectionId !== undefined && record.connectionId !== null) {
    throw new Error(TASK_BRANCH_LOCAL_ONLY_ERROR)
  }
  const requestedPath = requireString(record, 'worktreePath')
  const worktreePath = await resolveRegisteredWorktreePath(requestedPath, store)
  const repo = getLocalRepoForRegisteredWorktree(store, requestedPath, worktreePath)
  if (!repo || getStoredRepoSshConnectionId(repo) !== null) {
    throw new Error(TASK_BRANCH_LOCAL_ONLY_ERROR)
  }
  if (isFolderRepo(repo)) {
    throw new Error(TASK_BRANCH_FOLDER_ERROR)
  }
  return { worktreePath, options: getLocalGitOptionsForRepo(store, repo) }
}

async function resolveTargets(
  store: Store,
  raw: unknown
): Promise<{
  record: Record<string, unknown>
  worktreePath: string
  submodulePaths: string[]
  options: GitRuntimeOptions
}> {
  const record = asRecord(raw)
  const submodulePaths = submodulePathsOf(record)
  const resolved = await resolveLocalTaskBranchWorktree(store, record)
  return { record, submodulePaths, ...resolved }
}

export function registerTaskBranchIpcHandlers({ store, handle }: MainExtensionIpcContext): void {
  handle('dooray:taskBranch:listSubmodules', async (_event, raw: unknown) => {
    const { worktreePath, options } = await resolveLocalTaskBranchWorktree(store, asRecord(raw))
    return listTaskBranchSubmodules(worktreePath, options)
  })
  handle('dooray:taskBranch:inspect', async (_event, raw: unknown) => {
    const { worktreePath, submodulePaths, options } = await resolveTargets(store, raw)
    return inspectTaskBranchTargets({ worktreePath, submodulePaths, options })
  })
  handle('dooray:taskBranch:stash', async (_event, raw: unknown) => {
    const { record, worktreePath, submodulePaths, options } = await resolveTargets(store, raw)
    const message = requireString(record, 'message')
    await stashTaskBranchTargets({
      worktreePath,
      submodulePaths,
      options,
      message,
      ...onlyTargetsOf(record)
    })
  })
  handle('dooray:taskBranch:discard', async (_event, raw: unknown) => {
    const { record, worktreePath, submodulePaths, options } = await resolveTargets(store, raw)
    await discardTaskBranchTargets({
      worktreePath,
      submodulePaths,
      options,
      ...onlyTargetsOf(record)
    })
  })
  handle('dooray:taskBranch:switch', async (_event, raw: unknown) => {
    const { record, worktreePath, submodulePaths, options } = await resolveTargets(store, raw)
    const baseRef = optionalString(record, 'baseRef')
    return switchTaskBranchTargets({
      worktreePath,
      submodulePaths,
      options,
      branch: requireString(record, 'branch'),
      ...(baseRef ? { baseRef } : {}),
      // Why: fetching only makes sense for a named base; without one the branch starts at HEAD.
      fetchBase: record.fetchBase === true && baseRef !== undefined
    })
  })
}
