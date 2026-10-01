import type { GitRuntimeOptions } from '../../../git/git-runtime-options'
import { runTargetGit, type TaskBranchTarget } from './task-branch-target-git'

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

export async function fetchBaseRef(
  target: TaskBranchTarget,
  baseRef: string,
  options: GitRuntimeOptions
): Promise<{ fetchFailed: boolean }> {
  const skipped = { fetchFailed: false }
  const slash = baseRef.indexOf('/')
  if (slash <= 0) {
    return skipped
  }
  const remote = baseRef.slice(0, slash)
  const branch = baseRef.slice(slash + 1)
  // Why: only configured remotes, so a "host:repo" baseRef can never contact an arbitrary host.
  if (remote.startsWith('-') || !(await listRemotes(target, options)).includes(remote)) {
    return skipped
  }
  if (!(await isFetchableBaseBranch(target, branch, options))) {
    return skipped
  }
  try {
    // Explicit refspec: the destination is always this remote's tracking namespace, never a local branch.
    await runTargetGit(
      target,
      ['fetch', remote, `+refs/heads/${branch}:refs/remotes/${remote}/${branch}`],
      options
    )
    return { fetchFailed: false }
  } catch {
    // Best effort: offline or a target without this branch falls back to local refs; reported to the user.
    return { fetchFailed: true }
  }
}

export async function resolvesToCommit(
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
