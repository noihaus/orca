import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import type {
  DoorayIssue,
  DoorayWorkflow
} from '../../../../../shared/extensions/dooray/dooray-types'
import { useDoorayApi } from '../use-dooray-api'

const K = 'auto.ext.dooray.components.DoorayIssueWorkspace'

// Workflow list for the issue's project, plus an optimistic change that rolls back on failure.
export function useDoorayWorkflows(
  issue: DoorayIssue | null,
  onIssuePatched: (issue: DoorayIssue) => void
) {
  const api = useDoorayApi()
  const [workflows, setWorkflows] = useState<DoorayWorkflow[]>([])
  const [workflowPending, setWorkflowPending] = useState(false)
  const projectId = issue?.projectId ?? null

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
        onIssuePatched(issue)
        toast.error(
          error instanceof Error
            ? error.message
            : translate(`${K}.workflow_failed`, 'Failed to update Dooray workflow.')
        )
      } finally {
        setWorkflowPending(false)
      }
    },
    [api, issue, onIssuePatched, workflowPending]
  )

  return { workflows, workflowPending, selectWorkflow }
}
