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

// Restricts a destructive op to the targets the user saw ('' = parent); submodulePaths still drive dirty detection.
type ScopedTargetsInput = TargetsInput & { onlyTargets?: readonly string[] }

const PARENT_TARGET = ''

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// Why: a user's submodule.recurse=true would make reset/checkout/fetch reach into unselected submodules.
const NO_SUBMODULE_RECURSION = ['-c', 'submodule.recurse=false']

function runTargetGit(
  target: TaskBranchTarget,
  args: string[],
  options: GitRuntimeOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  return gitExecFileAsync(
    [...NO_SUBMODULE_RECURSION, ...args],
    gitOptionsForWorktree(target.absolutePath, options)
  )
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
  const { stdout } = await runTargetGit(
    target,
    ['status', '--porcelain', ...(ignoreSubmodules ? ['--ignore-submodules=all'] : [])],
    options
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

function scopeTargets<T extends { submodulePath: string }>(
  input: ScopedTargetsInput,
  targets: T[]
): T[] {
  if (input.onlyTargets === undefined) {
    return targets
  }
  const allowed = new Set([PARENT_TARGET, ...(input.submodulePaths ?? [])])
  for (const target of input.onlyTargets) {
    if (!allowed.has(target)) {
      throw new Error(`Invalid target outside the selected submodules: ${target}`)
    }
  }
  const only = new Set(input.onlyTargets)
  return targets.filter((target) => only.has(target.submodulePath))
}

export async function stashTaskBranchTargets(
  input: ScopedTargetsInput & { message: string }
): Promise<void> {
  const dirty = scopeTargets(
    input,
    (await listDirtyTargets(input)).map((entry) => ({
      ...entry,
      submodulePath: entry.target.submodulePath
    }))
  )
  await runWithGitReadCacheInvalidation(async () => {
    for (const { target } of dirty.toReversed()) {
      // Tracked changes only: untracked files stay put across the switch.
      await runTargetGit(target, ['stash', 'push', '-m', input.message], input.options)
    }
  })
}

export async function discardTaskBranchTargets(input: ScopedTargetsInput): Promise<void> {
  const targets = scopeTargets(input, await checkedOutTargets(input))
  await runWithGitReadCacheInvalidation(async () => {
    for (const target of targets.toReversed()) {
      // No `git clean`: untracked files are deliberately kept.
      await runTargetGit(target, ['reset', '--hard', 'HEAD', '--'], input.options)
    }
  })
}

// Rejects refspec syntax (`:` `+`), globs, revision suffixes and `@{` so the name stays a plain branch.
const UNSAFE_FETCH_BRANCH = /[\s:+*?^~[\\]|\.\.|@\{|^[-/]|\/$|\.lock$/

async function isFetchableBaseBranch(
  target: TaskBranchTarget,
  branch: string,
  options: GitRuntimeOptions
): Promise<boolean> {
  if (branch.length === 0 || UNSAFE_FETCH_BRANCH.test(branch)) {
    return false
  }
  try {
    await runTargetGit(target, ['check-ref-format', '--branch', branch], options)
    return true
  } catch {
    return false
  }
}

async function listRemotes(
  target: TaskBranchTarget,
  options: GitRuntimeOptions
): Promise<string[]> {
  try {
    const { stdout } = await runTargetGit(target, ['remote'], options)
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
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
  // Why: only configured remotes, so a "host:repo" baseRef can never contact an arbitrary host.
  if (remote.startsWith('-') || !(await listRemotes(target, options)).includes(remote)) {
    return
  }
  if (!(await isFetchableBaseBranch(target, branch, options))) {
    return
  }
  try {
    // Explicit refspec: the destination is always this remote's tracking namespace, never a local branch.
    await runTargetGit(
      target,
      ['fetch', remote, `+refs/heads/${branch}:refs/remotes/${remote}/${branch}`],
      options
    )
  } catch {
    // Best effort: offline or a target without this branch falls back to local refs.
  }
}

async function resolvesToCommit(
  target: TaskBranchTarget,
  ref: string,
  options: GitRuntimeOptions
): Promise<boolean> {
  try {
    await runTargetGit(target, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], options)
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
  const { current, branches } = await listLocalBranches(target.absolutePath, options)
  if (current === input.branch) {
    return 'already-on'
  }
  if (branches.includes(input.branch)) {
    await runTargetGit(target, ['checkout', input.branch, '--'], options)
    return 'switched'
  }
  if (input.baseRef && input.fetchBase) {
    await fetchBaseRef(target, input.baseRef, options)
  }
  const startPoint =
    input.baseRef && (await resolvesToCommit(target, input.baseRef, options)) ? [input.baseRef] : []
  await runTargetGit(target, ['checkout', '-b', input.branch, ...startPoint, '--'], options)
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
