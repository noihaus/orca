// '' is the parent worktree; anything else is a submodule path relative to it.
export type TaskBranchTargetArgs = {
  worktreePath: string
  submodulePaths?: string[]
  // Set for SSH worktrees; task-branch switching is local-only, so its presence is rejected.
  connectionId?: string | null
}

export type TaskBranchDirtyTarget = { submodulePath: string; changeCount: number }

// Stash/discard only these targets ('' = parent), so nothing the user was not shown is touched.
export type TaskBranchScopedArgs = TaskBranchTargetArgs & { onlyTargets?: string[] }

export type TaskBranchStashArgs = TaskBranchScopedArgs & { message: string }

export type TaskBranchSwitchArgs = TaskBranchTargetArgs & {
  branch: string
  baseRef?: string
  fetchBase?: boolean
}

export type TaskBranchSwitchResult =
  | {
      submodulePath: string
      status: 'already-on' | 'switched' | 'created' | 'skipped-missing'
    }
  | { submodulePath: string; status: 'failed'; error: string }

export type TaskBranchPreloadApi = {
  listSubmodules: (args: {
    worktreePath: string
    connectionId?: string | null
  }) => Promise<string[]>
  inspect: (args: TaskBranchTargetArgs) => Promise<TaskBranchDirtyTarget[]>
  stash: (args: TaskBranchStashArgs) => Promise<void>
  discard: (args: TaskBranchScopedArgs) => Promise<void>
  switch: (args: TaskBranchSwitchArgs) => Promise<TaskBranchSwitchResult[]>
}
