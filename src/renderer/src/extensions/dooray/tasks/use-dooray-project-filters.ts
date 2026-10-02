import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  DoorayMilestone,
  DoorayPriority,
  DoorayWorkflow
} from '../../../../../shared/extensions/dooray/dooray-types'
import { visibleDoorayMilestones } from '../lib/dooray-milestone-labels'
import type { DoorayApi } from '../runtime-dooray-client'
import {
  EMPTY_DOORAY_PROJECT_FILTERS,
  readDoorayProjectFilterPreferences,
  writeDoorayProjectFilterPreferences,
  type DoorayPreferenceSurface,
  type DoorayProjectFilterPreferences
} from './dooray-filter-preferences'

// Values remember the project they belong to, so a project switch resets them without an effect.
type ProjectScoped<T> = { projectId: string; value: T }

const NO_ITEMS: readonly never[] = []

type ScopedList<T> = { items: readonly T[]; loaded: boolean }

function useProjectScopedList<T>(
  projectId: string | null,
  enabled: boolean,
  load: (projectId: string) => Promise<T[]>
): ScopedList<T> {
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
  if (!enabled || !loaded || loaded.projectId !== projectId) {
    return { items: NO_ITEMS, loaded: false }
  }
  return { items: loaded.value, loaded: true }
}

function useStoredProjectFilters(surface: DoorayPreferenceSurface, projectId: string | null) {
  const [edited, setEdited] = useState<ProjectScoped<DoorayProjectFilterPreferences> | null>(null)
  const stored = useMemo(
    () =>
      projectId
        ? readDoorayProjectFilterPreferences(surface, projectId)
        : EMPTY_DOORAY_PROJECT_FILTERS,
    [surface, projectId]
  )
  const current = edited && edited.projectId === projectId ? edited.value : stored

  // Functional updates so several changes in one event all land.
  const update = useCallback(
    (patch: Partial<DoorayProjectFilterPreferences>): void => {
      if (!projectId) {
        return
      }
      setEdited((previous) => {
        const base =
          previous && previous.projectId === projectId
            ? previous.value
            : readDoorayProjectFilterPreferences(surface, projectId)
        return { projectId, value: { ...base, ...patch } }
      })
    },
    [surface, projectId]
  )

  useEffect(() => {
    if (edited) {
      writeDoorayProjectFilterPreferences(surface, edited.projectId, edited.value)
    }
  }, [surface, edited])

  return [current, update] as const
}

export function useDoorayProjectFilters(
  api: Pick<DoorayApi, 'listMilestones' | 'listWorkflows'>,
  projectId: string | null,
  enabled: boolean,
  surface: DoorayPreferenceSurface
) {
  const loadMilestones = useMemo(() => (id: string) => api.listMilestones({ projectId: id }), [api])
  const loadWorkflows = useMemo(() => (id: string) => api.listWorkflows({ projectId: id }), [api])
  const allMilestones = useProjectScopedList<DoorayMilestone>(projectId, enabled, loadMilestones)
  const workflowList = useProjectScopedList<DoorayWorkflow>(projectId, enabled, loadWorkflows)
  const milestones = useMemo(
    () => visibleDoorayMilestones(allMilestones.items, false, null),
    [allMilestones.items]
  )
  const [filters, updateFilters] = useStoredProjectFilters(surface, projectId)

  // A saved milestone or workflow that no longer exists is ignored once its options have loaded.
  const milestoneStale =
    filters.milestone !== null &&
    allMilestones.loaded &&
    !milestones.some((milestone) => milestone.name === filters.milestone)
  const workflowStale =
    filters.workflowId !== null &&
    workflowList.loaded &&
    !workflowList.items.some((workflow) => workflow.id === filters.workflowId)

  useEffect(() => {
    if (milestoneStale || workflowStale) {
      updateFilters({
        ...(milestoneStale ? { milestone: null } : {}),
        ...(workflowStale ? { workflowId: null } : {})
      })
    }
  }, [milestoneStale, workflowStale, updateFilters])

  return {
    milestones,
    workflows: workflowList.items,
    milestoneFilter: milestoneStale ? null : filters.milestone,
    setMilestoneFilter: (milestone: string | null) => updateFilters({ milestone }),
    workflowFilter: workflowStale ? null : filters.workflowId,
    setWorkflowFilter: (workflowId: string | null) => updateFilters({ workflowId }),
    priorityFilter: filters.priority,
    setPriorityFilter: (priority: DoorayPriority | null) => updateFilters({ priority })
  }
}
