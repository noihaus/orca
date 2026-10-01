import { useCallback, useEffect, useRef, useState } from 'react'
import { LoaderCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CommentMarkdownAsync } from '@/components/sidebar/comment-markdown-lazy'
import { translate } from '@/i18n/i18n'
import { formatUiRelativeTimeFromDate } from '@/i18n/relative-time-format'
import type { DoorayIssue } from '../../../../../shared/extensions/dooray/dooray-types'
import { DoorayIcon } from '../DoorayIcon'
import { handleDoorayMarkdownLinkClick } from '../lib/dooray-open-link'
import { DOORAY_WORKFLOW_PILL_CLASS } from '../tasks/DoorayWorkflowPill'
import { useDoorayApi } from '../use-dooray-api'
import {
  DoorayIssueAside,
  DoorayStartPrimaryButton,
  type DoorayStartAction,
  type DoorayStartKind,
  type DoorayWorkspaceStart
} from './DoorayIssueAside'
import { DoorayCommentComposer, DoorayIssueCommentsSection } from './DoorayIssueComments'
import { useDoorayComments } from './use-dooray-comments'
import { useDoorayWorkflows } from './use-dooray-workflows'

export type DoorayIssueWorkspaceProps = {
  issue: DoorayIssue | null
  onUse?: (issue: DoorayIssue) => void
  primaryStartKind?: DoorayStartKind
  primaryDisabledReason?: string
  secondaryStart?: DoorayStartAction
  workspaceStart?: DoorayWorkspaceStart
  onOpenWorkspace?: (issue: DoorayIssue) => void
  onClose: () => void
  onIssuePatched?: (issue: DoorayIssue) => void
}

function assigneeLabel(issue: DoorayIssue): string {
  return issue.assignees.length > 0
    ? issue.assignees.join(', ')
    : translate('auto.ext.dooray.components.DoorayIssueWorkspace.unassigned', 'Unassigned')
}

// Fetches the full issue (with body) and keeps optimistic workflow patches local until the list catches up.
function useDisplayedIssue(issue: DoorayIssue | null) {
  const api = useDoorayApi()
  const [fullIssue, setFullIssue] = useState<DoorayIssue | null>(null)
  const [loading, setLoading] = useState(false)
  const requestIdRef = useRef(0)
  const issueId = issue?.id ?? null
  const projectId = issue?.projectId ?? null

  useEffect(() => {
    requestIdRef.current += 1
    const requestId = requestIdRef.current
    if (!issueId || !projectId) {
      setLoading(false)
      return
    }
    setLoading(true)
    api
      .getIssue({ projectId, postId: issueId })
      .then((result) => {
        // Only the body is taken; workflow fields stay with whatever the user last saw.
        if (requestId === requestIdRef.current && result) {
          setFullIssue((current) =>
            current && current.id === result.id ? { ...current, body: result.body } : result
          )
        }
      })
      .catch(() => {})
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      })
  }, [api, issueId, projectId])

  return { fullIssue, setFullIssue, loading }
}

export function WorkflowPicker({
  issue,
  onIssuePatched
}: {
  issue: DoorayIssue
  onIssuePatched: (issue: DoorayIssue) => void
}): React.JSX.Element {
  const { workflows, workflowPending, selectWorkflow } = useDoorayWorkflows(issue, onIssuePatched)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-workflow={issue.workflowClass}
          disabled={workflowPending || workflows.length === 0}
          className={`${DOORAY_WORKFLOW_PILL_CLASS} gap-1.5 transition hover:opacity-80 disabled:opacity-50`}
        >
          {issue.workflowName}
          {workflowPending ? <LoaderCircle className="size-3 animate-spin" /> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52" align="start">
        {workflows.map((workflow) => (
          <button
            key={workflow.id}
            type="button"
            onClick={() => void selectWorkflow(workflow)}
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-[12px] hover:bg-accent"
          >
            {workflow.name}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function WorkspaceHeader({
  issue,
  loading,
  onClose,
  startButton
}: {
  issue: DoorayIssue
  loading: boolean
  onClose: () => void
  startButton: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex-none border-b border-border/50 bg-muted/30 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span className="font-mono">{issue.taskNumber}</span>
            <span>{issue.projectCode}</span>
            <span>{formatUiRelativeTimeFromDate(issue.updatedAt)}</span>
            {loading ? <LoaderCircle className="size-3 animate-spin" /> : null}
          </div>
          <h2 className="mt-1 text-[20px] leading-tight font-semibold text-foreground">
            {issue.subject}
          </h2>
        </div>
        {startButton}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              onClick={onClose}
              aria-label={translate(
                'auto.ext.dooray.components.DoorayIssueWorkspace.close_preview',
                'Close Dooray task preview'
              )}
            >
              <X className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {translate('auto.ext.dooray.components.DoorayIssueWorkspace.close', 'Close')}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

export function DoorayIssueWorkspace({
  issue,
  onUse,
  primaryStartKind = 'new-worktree',
  primaryDisabledReason,
  secondaryStart,
  workspaceStart,
  onOpenWorkspace,
  onClose,
  onIssuePatched
}: DoorayIssueWorkspaceProps): React.JSX.Element {
  const { fullIssue, setFullIssue, loading } = useDisplayedIssue(issue)
  const comments = useDoorayComments(issue)
  // A stale fullIssue from the previous selection must never render for the new one.
  const displayed = fullIssue && issue && fullIssue.id === issue.id ? fullIssue : issue
  const handlePatched = useCallback(
    (patched: DoorayIssue) => {
      // A late rollback for a previous issue must not clobber the current one's detail.
      if (patched.id === issue?.id) {
        setFullIssue(patched)
      }
      onIssuePatched?.(patched)
    },
    [issue?.id, onIssuePatched, setFullIssue]
  )

  const startButton = displayed ? (
    <DoorayStartPrimaryButton
      issue={displayed}
      className="hidden shrink-0 sm:inline-flex"
      size="sm"
      primaryStartKind={primaryStartKind}
      primaryDisabledReason={primaryDisabledReason}
      onUse={onUse}
      onOpenWorkspace={onOpenWorkspace}
    />
  ) : null

  return (
    <Sheet open={issue !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[min(92vw,780px)] sm:max-w-[780px]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <SheetTitle className="sr-only">
          {displayed?.subject ??
            translate('auto.ext.dooray.components.DoorayIssueWorkspace.sheet_title', 'Dooray task')}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {translate(
            'auto.ext.dooray.components.DoorayIssueWorkspace.sheet_description',
            'Preview, comment, and start work from the selected task.'
          )}
        </SheetDescription>
        {displayed ? (
          <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
            <WorkspaceHeader
              issue={displayed}
              loading={loading}
              onClose={onClose}
              startButton={startButton}
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border/60 px-4 py-2.5">
              <WorkflowPicker key={displayed.id} issue={displayed} onIssuePatched={handlePatched} />
              <span className="text-[11px] text-muted-foreground">{assigneeLabel(displayed)}</span>
              {displayed.milestoneName ? (
                <span className="text-[11px] text-muted-foreground">{displayed.milestoneName}</span>
              ) : null}
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_228px]">
              <div className="scrollbar-sleek min-h-0 overflow-y-auto">
                <section className="border-b border-border/40 px-4 py-4">
                  <div className="mb-2 flex items-center gap-2">
                    <DoorayIcon className="size-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {displayed.projectCode} · {assigneeLabel(displayed)}
                    </span>
                  </div>
                  {displayed.body?.trim() ? (
                    <CommentMarkdownAsync
                      content={displayed.body}
                      variant="document"
                      className="text-[14px] leading-relaxed"
                      onLinkClick={handleDoorayMarkdownLinkClick}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {translate(
                        'auto.ext.dooray.components.DoorayIssueWorkspace.no_description',
                        'No description provided.'
                      )}
                    </p>
                  )}
                </section>
                <DoorayIssueCommentsSection
                  comments={comments.comments}
                  commentsLoading={comments.commentsLoading}
                  commentsError={comments.commentsError}
                  retryLoadComments={comments.retryLoadComments}
                />
              </div>
              <DoorayIssueAside
                issue={displayed}
                primaryStartKind={primaryStartKind}
                primaryDisabledReason={primaryDisabledReason}
                onUse={onUse}
                onOpenWorkspace={onOpenWorkspace}
                secondaryStart={secondaryStart}
                workspaceStart={workspaceStart}
              />
            </div>
            <div className="flex-none border-t border-border/50 bg-background px-3 py-3">
              <DoorayCommentComposer
                commentDraft={comments.commentDraft}
                setCommentDraft={comments.setCommentDraft}
                commentSubmitting={comments.commentSubmitting}
                canSubmitComment={comments.canSubmitComment}
                submitComment={comments.submitComment}
              />
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
