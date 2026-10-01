import { useCallback, useEffect, useState } from 'react'
import type { DoorayProject } from '../../../../../shared/extensions/dooray/dooray-types'
import type { DoorayApi } from '../runtime-dooray-client'

export const DOORAY_SELECTED_PROJECT_STORAGE_KEY = 'orca:dooray-selected-project'

function readPersistedProjectId(): string | null {
  try {
    return window.localStorage.getItem(DOORAY_SELECTED_PROJECT_STORAGE_KEY)
  } catch {
    return null
  }
}

function persistProjectId(projectId: string): void {
  try {
    window.localStorage.setItem(DOORAY_SELECTED_PROJECT_STORAGE_KEY, projectId)
  } catch {
    // Storage can be blocked; the in-memory selection still works for this session.
  }
}

type ProjectsState = {
  projects: DoorayProject[]
  loading: boolean
  error: string | null
}

export function useDoorayProjects(api: Pick<DoorayApi, 'listProjects'>) {
  const [state, setState] = useState<ProjectsState>({ projects: [], loading: true, error: null })
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(readPersistedProjectId)

  useEffect(() => {
    let cancelled = false
    setState((previous) => ({ ...previous, loading: true, error: null }))
    api
      .listProjects()
      .then((projects) => {
        if (cancelled) {
          return
        }
        setState({ projects, loading: false, error: null })
        setSelectedProjectId((current) =>
          current && projects.some((project) => project.id === current)
            ? current
            : (projects[0]?.id ?? null)
        )
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState((previous) => ({
            ...previous,
            loading: false,
            error: error instanceof Error ? error.message : String(error)
          }))
        }
      })
    return () => {
      cancelled = true
    }
  }, [api])

  const selectProject = useCallback((projectId: string) => {
    setSelectedProjectId(projectId)
    persistProjectId(projectId)
  }, [])

  // Issues wait for the project list so a stale stored id never fires a request.
  const readyProjectId = state.projects.some((project) => project.id === selectedProjectId)
    ? selectedProjectId
    : null

  return {
    projects: state.projects,
    projectsLoading: state.loading,
    projectsError: state.error,
    selectedProjectId,
    readyProjectId,
    selectProject
  }
}
