import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store'
import type {
  DoorayIssue,
  DoorayProject
} from '../../../../../shared/extensions/dooray/dooray-types'
import { parseDoorayTaskFromBranch } from '../lib/dooray-branch-matching'
import { useDoorayApi } from '../use-dooray-api'
import { translate } from '@/i18n/i18n'
import { readDoorayErrorMessage } from '../lib/dooray-error-messages'

// Folder workspaces and detached HEADs have no branch, so this is null there.
export function useActiveWorktreeBranch(): string | null {
  return useAppStore((state) =>
    state.activeWorktreeId
      ? (state.getKnownWorktreeById(state.activeWorktreeId)?.branch ?? null)
      : null
  )
}

// A result is tied to the lookup that produced it, so a branch switch never shows the previous task.
type Lookup = { key: string; issue: DoorayIssue | null; error: string | null }

export function useDoorayActiveTask(activeBranch: string | null, projects: DoorayProject[]) {
  const api = useDoorayApi()
  const parsed = useMemo(
    () => parseDoorayTaskFromBranch(activeBranch, projects),
    [activeBranch, projects]
  )
  const projectId = parsed?.project.id ?? null
  const postNumber = parsed?.postNumber ?? null
  const key = projectId && postNumber ? `${projectId}/${postNumber}` : null
  const [lookup, setLookup] = useState<Lookup | null>(null)

  useEffect(() => {
    if (!projectId || !postNumber || !key) {
      return
    }
    let cancelled = false
    api
      .getIssueByNumber({ projectId, postNumber })
      .then((issue) => {
        if (!cancelled) {
          setLookup({ key, issue, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLookup({
            key,
            issue: null,
            error: readDoorayErrorMessage(
              error,
              translate(
                'auto.ext.dooray.components.dooray.sidebar.active_task_load_failed',
                'Failed to load task.'
              )
            )
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [api, key, postNumber, projectId])

  const current = key && lookup?.key === key ? lookup : null
  const patchIssue = useCallback((patched: DoorayIssue) => {
    setLookup((previous) =>
      previous?.issue?.id === patched.id ? { ...previous, issue: patched } : previous
    )
  }, [])

  return {
    parsed,
    issue: current?.issue ?? null,
    error: current?.error ?? null,
    loading: key !== null && current === null,
    patchIssue
  }
}
