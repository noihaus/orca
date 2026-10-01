import { useEffect, useMemo, useState } from 'react'
import type {
  DoorayMilestone,
  DoorayWorkflow
} from '../../../../../shared/extensions/dooray/dooray-types'
import { visibleDoorayMilestones } from '../lib/dooray-milestone-labels'
import type { DoorayApi } from '../runtime-dooray-client'

// Values remember the project they belong to, so a project switch resets them without an effect.
type ProjectScoped<T> = { projectId: string; value: T }

function scopedValue<T>(scoped: ProjectScoped<T> | null, projectId: string | null, empty: T): T {
  return scoped && scoped.projectId === projectId ? scoped.value : empty
}

const NO_ITEMS: readonly never[] = []

function useProjectScopedList<T>(
  projectId: string | null,
  enabled: boolean,
  load: (projectId: string) => Promise<T[]>
): readonly T[] {
  const [loaded, setLoaded] = useState<ProjectScoped<T[]> | null>(null)
  useEffect(() => {
    if (!projectId || !enabled) {
      return
    }
    let cancelled = false
    load(projectId)
      .then((value) => {
        if (!cancelled) {
          setLoaded({ projectId, value })
        }
      })
      // Filter options are optional chrome; a failed load just hides the picker.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [projectId, enabled, load])
  return enabled ? scopedValue<readonly T[]>(loaded, projectId, NO_ITEMS) : NO_ITEMS
}

function useProjectScopedSelection(projectId: string | null) {
  const [selection, setSelection] = useState<ProjectScoped<string | null> | null>(null)
  const value = scopedValue(selection, projectId, null)
  const setValue = (next: string | null): void => {
    setSelection(projectId ? { projectId, value: next } : null)
  }
  return [value, setValue] as const
}

export function useDoorayProjectFilters(
  api: Pick<DoorayApi, 'listMilestones' | 'listWorkflows'>,
  projectId: string | null,
  enabled: boolean
) {
  const loadMilestones = useMemo(() => (id: string) => api.listMilestones({ projectId: id }), [api])
  const loadWorkflows = useMemo(() => (id: string) => api.listWorkflows({ projectId: id }), [api])
  const allMilestones = useProjectScopedList<DoorayMilestone>(projectId, enabled, loadMilestones)
  const workflows = useProjectScopedList<DoorayWorkflow>(projectId, enabled, loadWorkflows)
  const milestones = useMemo(
    () => visibleDoorayMilestones(allMilestones, false, null),
    [allMilestones]
  )
  const [milestoneFilter, setMilestoneFilter] = useProjectScopedSelection(projectId)
  const [workflowFilter, setWorkflowFilter] = useProjectScopedSelection(projectId)

  return {
    milestones,
    workflows,
    milestoneFilter,
    setMilestoneFilter,
    workflowFilter,
    setWorkflowFilter
  }
}
