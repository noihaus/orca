import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import type {
  DoorayIssue,
  DoorayWorkflow
} from '../../../../../shared/extensions/dooray/dooray-types'
import { useDoorayApi } from '../use-dooray-api'

// Workflow list for the issue's project, plus an optimistic change that rolls back on failure.
export function useDoorayWorkflows(
  issue: DoorayIssue | null,
  onIssuePatched: (issue: DoorayIssue) => void
) {
  const api = useDoorayApi()
  const [workflows, setWorkflows] = useState<DoorayWorkflow[]>([])
  const [workflowPending, setWorkflowPending] = useState(false)
  const projectId = issue?.projectId ?? null
  const issueId = issue?.id ?? null
  // Lets a slow call for a previous issue settle without touching the current one's UI.
  const currentIssueIdRef = useRef(issueId)
  const [shownIssueId, setShownIssueId] = useState(issueId)
  if (shownIssueId !== issueId) {
    setShownIssueId(issueId)
    setWorkflowPending(false)
  }
  useEffect(() => {
    currentIssueIdRef.current = issueId
  }, [issueId])

  useEffect(() => {
    setWorkflows([])
    if (!projectId) {
      return
    }
    let cancelled = false
    api
      .listWorkflows({ projectId })
      .then((next) => {
        if (!cancelled) {
          setWorkflows(next)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [api, projectId])

  const selectWorkflow = useCallback(
    async (workflow: DoorayWorkflow) => {
      if (!issue || workflowPending) {
        return
      }
      setWorkflowPending(true)
      onIssuePatched({
        ...issue,
        workflowId: workflow.id,
        workflowName: workflow.name,
        workflowClass: workflow.workflowClass
      })
      try {
        const result = await api.setWorkflow({
          projectId: issue.projectId,
          postId: issue.id,
          workflowId: workflow.id
        })
        if (!result.ok) {
          throw new Error(result.error)
        }
      } catch (error) {
        // Data rollback always applies (keyed by id); user-facing feedback only for the current issue.
        onIssuePatched(issue)
        if (currentIssueIdRef.current !== issue.id) {
          return
        }
        toast.error(
          error instanceof Error
            ? error.message
            : translate(
                'auto.ext.dooray.components.DoorayIssueWorkspace.workflow_failed',
                'Failed to update Dooray workflow.'
              )
        )
      } finally {
        if (currentIssueIdRef.current === issue.id) {
          setWorkflowPending(false)
        }
      }
    },
    [api, issue, onIssuePatched, workflowPending]
  )

  return { workflows, workflowPending, selectWorkflow }
}
