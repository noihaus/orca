import type { GitRuntimeOptions } from '../../../git/git-runtime-options'
import { gitOptionsForWorktree } from '../../../git/git-runtime-options'
import { gitExecFileAsync } from '../../../git/runner'

// '' is the parent worktree; anything else is a submodule path relative to it.
export type TaskBranchTarget = { submodulePath: string; absolutePath: string }

// Why: a user's submodule.recurse=true would make reset/checkout/fetch reach into unselected submodules.
const NO_SUBMODULE_RECURSION = ['-c', 'submodule.recurse=false']

export function runTargetGit(
  target: TaskBranchTarget,
  args: string[],
  options: GitRuntimeOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  return gitExecFileAsync(
    [...NO_SUBMODULE_RECURSION, ...args],
    gitOptionsForWorktree(target.absolutePath, options)
  )
}
