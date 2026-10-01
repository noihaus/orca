import { stat } from 'node:fs/promises'
import * as path from 'node:path'
import type {
  TaskBranchDirtyTarget,
  TaskBranchSwitchResult
} from '../../../../shared/extensions/dooray/task-branch-types'
import { assertValidBranchName, listLocalBranches } from '../../../git/checkout'
import type { GitRuntimeOptions } from '../../../git/git-runtime-options'
import { gitOptionsForWorktree } from '../../../git/git-runtime-options'
import { gitExecFileAsync } from '../../../git/runner'
import { runWithGitReadCacheInvalidation } from '../../../git/source-control/git-read-cache-invalidation'
import {
  listSubmodulePaths,
  resolveSubmoduleWorktreePath
} from '../../../git/source-control/submodule-paths'

type TaskBranchTarget = { submodulePath: string; absolutePath: string }

type TargetsInput = {
  worktreePath: string
  submodulePaths?: readonly string[]
  options?: GitRuntimeOptions
}

const PARENT_TARGET = ''

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isSafeRelativeSubmodulePath(value: string): boolean {
  if (value.length === 0 || value.includes('\0') || value.includes('\\')) {
    return false
  }
  if (value.startsWith('/') || value.startsWith('-') || /^[A-Za-z]:/.test(value)) {
    return false
  }
  return value.split('/').every((segment) => segment !== '..' && segment !== '.')
}

export async function listTaskBranchSubmodules(
  worktreePath: string,
  options: GitRuntimeOptions = {}
): Promise<string[]> {
  const declared = await listSubmodulePaths(worktreePath, options)
  // Why: a hostile .gitmodules could declare an escaping path; never offer it as a target.
  return declared.filter(isSafeRelativeSubmodulePath)
}

async function resolveTargets(input: TargetsInput): Promise<TaskBranchTarget[]> {
  const requested = [...new Set(input.submodulePaths ?? [])]
  const targets: TaskBranchTarget[] = [
    { submodulePath: PARENT_TARGET, absolutePath: input.worktreePath }
  ]
  if (requested.length === 0) {
    return targets
  }
  const declared = new Set(await listTaskBranchSubmodules(input.worktreePath, input.options))
  for (const submodulePath of requested) {
    if (!isSafeRelativeSubmodulePath(submodulePath) || !declared.has(submodulePath)) {
      throw new Error(`Invalid submodule path: ${submodulePath}`)
    }
    targets.push({
      submodulePath,
      absolutePath: resolveSubmoduleWorktreePath(input.worktreePath, submodulePath)
    })
  }
  return targets
}

async function isCheckedOut(target: TaskBranchTarget): Promise<boolean> {
  if (target.submodulePath === PARENT_TARGET) {
    return true
  }
  // Why: git run inside an uninitialized submodule dir silently resolves to the parent repo.
  try {
    await stat(path.join(target.absolutePath, '.git'))
    return true
  } catch {
    return false
  }
}

async function checkedOutTargets(input: TargetsInput): Promise<TaskBranchTarget[]> {
  const targets = await resolveTargets(input)
  const present = await Promise.all(targets.map(isCheckedOut))
  return targets.filter((_, index) => present[index])
}

async function countTrackedChanges(
  target: TaskBranchTarget,
  ignoreSubmodules: boolean,
  options: GitRuntimeOptions
): Promise<number> {
  const { stdout } = await gitExecFileAsync(
    ['status', '--porcelain', ...(ignoreSubmodules ? ['--ignore-submodules=all'] : [])],
    gitOptionsForWorktree(target.absolutePath, options)
  )
  return stdout.split('\n').filter((line) => line.trim().length > 0 && !line.startsWith('??'))
    .length
}

async function listDirtyTargets(
  input: TargetsInput
): Promise<{ target: TaskBranchTarget; changeCount: number }[]> {
  const targets = await checkedOutTargets(input)
  // Why: once submodules switch too, the parent's submodule-pointer rows resolve themselves.
  const ignoreParentSubmodules = (input.submodulePaths?.length ?? 0) > 0
  const dirty: { target: TaskBranchTarget; changeCount: number }[] = []
  for (const target of targets) {
    const changeCount = await countTrackedChanges(
      target,
      target.submodulePath === PARENT_TARGET && ignoreParentSubmodules,
      input.options ?? {}
    )
    if (changeCount > 0) {
      dirty.push({ target, changeCount })
    }
  }
  return dirty
}

export async function inspectTaskBranchTargets(
  input: TargetsInput
): Promise<TaskBranchDirtyTarget[]> {
  const dirty = await listDirtyTargets(input)
  return dirty.map(({ target, changeCount }) => ({
    submodulePath: target.submodulePath,
    changeCount
  }))
}

export async function stashTaskBranchTargets(
  input: TargetsInput & { message: string }
): Promise<void> {
  const dirty = await listDirtyTargets(input)
  await runWithGitReadCacheInvalidation(async () => {
    for (const { target } of dirty.toReversed()) {
      // Tracked changes only: untracked files stay put across the switch.
      await gitExecFileAsync(
        ['stash', 'push', '-m', input.message],
        gitOptionsForWorktree(target.absolutePath, input.options)
      )
    }
  })
}

export async function discardTaskBranchTargets(input: TargetsInput): Promise<void> {
  const targets = await checkedOutTargets(input)
  await runWithGitReadCacheInvalidation(async () => {
    for (const target of targets.toReversed()) {
      // No `git clean`: untracked files are deliberately kept.
      await gitExecFileAsync(
        ['reset', '--hard', 'HEAD', '--'],
        gitOptionsForWorktree(target.absolutePath, input.options)
      )
    }
  })
}

async function fetchBaseRef(
  target: TaskBranchTarget,
  baseRef: string,
  options: GitRuntimeOptions
): Promise<void> {
  const slash = baseRef.indexOf('/')
  if (slash <= 0) {
    return
  }
  const remote = baseRef.slice(0, slash)
  const branch = baseRef.slice(slash + 1)
  if (branch.length === 0 || branch.startsWith('-')) {
    return
  }
  try {
    await gitExecFileAsync(
      ['fetch', remote, branch],
      gitOptionsForWorktree(target.absolutePath, options)
    )
  } catch {
    // Best effort: offline or a target without this remote falls back to local refs.
  }
}

async function resolvesToCommit(
  target: TaskBranchTarget,
  ref: string,
  options: GitRuntimeOptions
): Promise<boolean> {
  try {
    await gitExecFileAsync(
      ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`],
      gitOptionsForWorktree(target.absolutePath, options)
    )
    return true
  } catch {
    return false
  }
}

type SwitchInput = TargetsInput & { branch: string; baseRef?: string; fetchBase?: boolean }

async function switchTarget(
  target: TaskBranchTarget,
  input: SwitchInput
): Promise<'already-on' | 'switched' | 'created'> {
  const options = input.options ?? {}
  const gitOptions = gitOptionsForWorktree(target.absolutePath, options)
  const { current, branches } = await listLocalBranches(target.absolutePath, options)
  if (current === input.branch) {
    return 'already-on'
  }
  if (branches.includes(input.branch)) {
    await gitExecFileAsync(['checkout', input.branch, '--'], gitOptions)
    return 'switched'
  }
  if (input.baseRef && input.fetchBase) {
    await fetchBaseRef(target, input.baseRef, options)
  }
  const startPoint =
    input.baseRef && (await resolvesToCommit(target, input.baseRef, options)) ? [input.baseRef] : []
  await gitExecFileAsync(['checkout', '-b', input.branch, ...startPoint, '--'], gitOptions)
  return 'created'
}

/**
 * Parent first, then each submodule. A parent failure throws before any submodule
 * is touched; a submodule failure is reported as 'failed' and the rest continue,
 * since submodules are independent repos and a partial result is still actionable.
 */
export async function switchTaskBranchTargets(
  input: SwitchInput
): Promise<TaskBranchSwitchResult[]> {
  assertValidBranchName(input.branch)
  if (
    input.baseRef !== undefined &&
    (input.baseRef.length === 0 || input.baseRef.startsWith('-'))
  ) {
    throw new Error(`Invalid base ref: ${input.baseRef}`)
  }
  const targets = await resolveTargets(input)
  return runWithGitReadCacheInvalidation(async () => {
    const results: TaskBranchSwitchResult[] = []
    for (const target of targets) {
      if (!(await isCheckedOut(target))) {
        results.push({ submodulePath: target.submodulePath, status: 'skipped-missing' })
        continue
      }
      try {
        const status = await switchTarget(target, input)
        results.push({ submodulePath: target.submodulePath, status })
      } catch (error) {
        if (target.submodulePath === PARENT_TARGET) {
          throw new Error(
            `Could not switch the workspace to "${input.branch}": ${errorMessage(error)}`
          )
        }
        results.push({
          submodulePath: target.submodulePath,
          status: 'failed',
          error: errorMessage(error)
        })
      }
    }
    return results
  })
}
