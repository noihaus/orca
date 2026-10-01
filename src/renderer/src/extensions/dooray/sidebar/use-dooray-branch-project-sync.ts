import { useCallback, useEffect, useRef } from 'react'
import type { DoorayProject } from '../../../../../shared/extensions/dooray/dooray-types'
import { parseDoorayTaskFromBranch } from '../lib/dooray-branch-matching'

// Follows the active branch's project until the user picks one, which then holds until the branch changes.
export function useDoorayBranchProjectSync({
  activeBranch,
  projects,
  selectedProjectId,
  selectProject
}: {
  activeBranch: string | null
  projects: DoorayProject[]
  selectedProjectId: string | null
  selectProject: (projectId: string) => void
}): (projectId: string) => void {
  const manualBranchRef = useRef<{ branch: string | null } | null>(null)

  useEffect(() => {
    if (manualBranchRef.current && manualBranchRef.current.branch === activeBranch) {
      return
    }
    manualBranchRef.current = null
    const parsed = parseDoorayTaskFromBranch(activeBranch, projects)
    if (parsed && parsed.project.id !== selectedProjectId) {
      selectProject(parsed.project.id)
    }
  }, [activeBranch, projects, selectedProjectId, selectProject])

  return useCallback(
    (projectId: string) => {
      manualBranchRef.current = { branch: activeBranch }
      selectProject(projectId)
    },
    [activeBranch, selectProject]
  )
}
