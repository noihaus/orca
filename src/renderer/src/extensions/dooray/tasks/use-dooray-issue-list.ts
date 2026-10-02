import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type {
  DoorayIssue,
  DoorayIssueFilter
} from '../../../../../shared/extensions/dooray/dooray-types'
import {
  defaultDooraySortDirection,
  doorayServerOrder,
  filterDoorayIssues,
  sortDoorayIssues,
  type DooraySortKey
} from '../lib/dooray-issue-ordering'
import { useDoorayApi } from '../use-dooray-api'
import { useDoorayProjectFilters } from './use-dooray-project-filters'
import { useDoorayProjects } from './use-dooray-projects'
import { translate } from '@/i18n/i18n'
import { readDoorayErrorMessage } from '../lib/dooray-error-messages'
import {
  getDoorayListPreferencesSnapshot,
  subscribeDoorayListPreferences,
  updateDoorayListPreferences,
  type DoorayPreferenceSurface
} from './dooray-filter-preferences'

export { DOORAY_SELECTED_PROJECT_STORAGE_KEY } from './use-dooray-projects'

export const DOORAY_ISSUE_PAGE_SIZE = 50

export type DooraySortDirection = 'asc' | 'desc'

// The list remembers which query produced it, so a query change hides stale rows without an effect.
type LoadedIssues = { queryKey: string; issues: DoorayIssue[]; totalCount: number }

type LoadStatus = { loading: boolean; error: string | null }

// The surface is bound per hook rather than passed in, so preferences never look prop-derived.
function createDoorayIssueListHook(preferenceSurface: DoorayPreferenceSurface) {
  return function useDoorayIssueListForSurface({
    withMilestones = false
  }: { withMilestones?: boolean } = {}) {
    const api = useDoorayApi()
    const {
      projects,
      projectsLoading,
      projectsError,
      selectedProjectId,
      readyProjectId,
      selectProject
    } = useDoorayProjects(api)
    const getPreferences = useCallback(
      () => getDoorayListPreferencesSnapshot(preferenceSurface),
      []
    )
    const preferences = useSyncExternalStore(subscribeDoorayListPreferences, getPreferences)
    const { filter, sortKey, sortDir } = preferences
    // Client-only keys keep the last server order, so choosing one never refetches.
    const { serverOrder } = preferences
    const [refreshNonce, setRefreshNonce] = useState(0)
    const [loaded, setLoaded] = useState<LoadedIssues | null>(null)
    const [status, setStatus] = useState<LoadStatus>({ loading: false, error: null })
    const requestIdRef = useRef(0)

    const queryKey = `${readyProjectId ?? ''}\n${filter}\n${serverOrder}`
    const rawIssues = useMemo(
      () => (loaded && loaded.queryKey === queryKey ? loaded.issues : []),
      [loaded, queryKey]
    )
    const totalCount = loaded && loaded.queryKey === queryKey ? loaded.totalCount : 0

    const loadPage = useCallback(
      (projectId: string, key: string, page: number) => {
        const requestId = ++requestIdRef.current
        setStatus({ loading: true, error: null })
        api
          .listIssues({
            projectId,
            filter,
            page,
            size: DOORAY_ISSUE_PAGE_SIZE,
            order: serverOrder
          })
          .then((result) => {
            if (requestId !== requestIdRef.current) {
              return
            }
            setLoaded((previous) => ({
              queryKey: key,
              totalCount: result.totalCount,
              issues:
                page === 0 || previous?.queryKey !== key
                  ? result.issues
                  : [...previous.issues, ...result.issues]
            }))
            setStatus({ loading: false, error: null })
          })
          .catch((error: unknown) => {
            if (requestId === requestIdRef.current) {
              setStatus({
                loading: false,
                error: readDoorayErrorMessage(
                  error,
                  translate(
                    'auto.ext.dooray.components.dooray.tasks.list_load_failed',
                    'Failed to load tasks.'
                  )
                )
              })
            }
          })
      },
      [api, filter, serverOrder]
    )

    useEffect(() => {
      if (!readyProjectId) {
        // Invalidate any in-flight page for the previous project.
        requestIdRef.current += 1
        return
      }
      loadPage(readyProjectId, queryKey, 0)
    }, [loadPage, readyProjectId, queryKey, refreshNonce])

    const loadMore = useCallback(() => {
      if (readyProjectId) {
        loadPage(readyProjectId, queryKey, Math.floor(rawIssues.length / DOORAY_ISSUE_PAGE_SIZE))
      }
    }, [loadPage, queryKey, rawIssues.length, readyProjectId])

    const refresh = useCallback(() => setRefreshNonce((nonce) => nonce + 1), [])

    const setFilter = useCallback(
      (next: DoorayIssueFilter) => updateDoorayListPreferences(preferenceSurface, { filter: next }),
      []
    )

    const applySort = useCallback((key: DooraySortKey, dir: DooraySortDirection) => {
      const order = doorayServerOrder(key, dir)
      updateDoorayListPreferences(preferenceSurface, {
        sortKey: key,
        sortDir: dir,
        ...(order ? { serverOrder: order } : {})
      })
    }, [])
    const toggleSortDir = useCallback(
      () => applySort(sortKey, sortDir === 'asc' ? 'desc' : 'asc'),
      [applySort, sortDir, sortKey]
    )
    const sortBy = useCallback(
      (key: DooraySortKey) =>
        key === sortKey ? toggleSortDir() : applySort(key, defaultDooraySortDirection(key)),
      [applySort, sortKey, toggleSortDir]
    )

    const projectFilters = useDoorayProjectFilters(
      api,
      readyProjectId,
      withMilestones,
      preferenceSurface
    )
    const { milestoneFilter, workflowFilter, priorityFilter } = projectFilters
    const issues = useMemo(
      () =>
        sortDoorayIssues(
          filterDoorayIssues(rawIssues, {
            milestoneName: milestoneFilter ?? undefined,
            workflowId: workflowFilter ?? undefined,
            priority: priorityFilter ?? undefined
          }),
          sortKey,
          sortDir
        ),
      [rawIssues, milestoneFilter, workflowFilter, priorityFilter, sortKey, sortDir]
    )

    const patchIssue = useCallback((patched: DoorayIssue) => {
      setLoaded((previous) =>
        previous
          ? {
              ...previous,
              issues: previous.issues.map((issue) => (issue.id === patched.id ? patched : issue))
            }
          : previous
      )
    }, [])

    const loading = readyProjectId ? status.loading : false
    return {
      projects,
      projectsLoading,
      projectsError,
      selectedProjectId,
      selectProject,
      filter,
      setFilter,
      sortKey,
      sortDir,
      sortBy,
      toggleSortDir,
      issues,
      rawIssues,
      totalCount,
      loading,
      error: readyProjectId ? status.error : null,
      canLoadMore: rawIssues.length < totalCount && !loading,
      loadMore,
      refresh,
      ...projectFilters,
      clientOnlySort: doorayServerOrder(sortKey, sortDir) === undefined,
      hasActiveClientFilter:
        milestoneFilter !== null || workflowFilter !== null || priorityFilter !== null,
      patchIssue
    }
  }
}

export const useDoorayIssueList = createDoorayIssueListHook('tasks')
export const useDooraySidebarIssueList = createDoorayIssueListHook('sidebar')

export type DoorayIssueListModel = ReturnType<typeof useDoorayIssueList>
