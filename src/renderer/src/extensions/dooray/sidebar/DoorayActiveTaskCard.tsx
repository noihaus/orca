import { useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, LoaderCircle } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { CommentMarkdownAsync } from '@/components/sidebar/comment-markdown-lazy'
import { translate } from '@/i18n/i18n'
import type {
  DoorayIssue,
  DoorayProject
} from '../../../../../shared/extensions/dooray/dooray-types'
import { WorkflowPicker } from '../issue/DoorayIssueWorkspace'
import { DoorayCommentComposer, DoorayIssueCommentsSection } from '../issue/DoorayIssueComments'
import { useDoorayComments } from '../issue/use-dooray-comments'
import { handleDoorayMarkdownLinkClick, openDoorayUrl } from '../lib/dooray-open-link'
import { useDoorayActiveTask } from './use-dooray-active-task'

const MESSAGE_CLASS = 'px-3 py-3 text-xs text-muted-foreground'

function TaskDetail({
  issue,
  onIssuePatched
}: {
  issue: DoorayIssue
  onIssuePatched: (issue: DoorayIssue) => void
}): React.JSX.Element {
  const [bodyOpen, setBodyOpen] = useState(true)
  const comments = useDoorayComments(issue)
  return (
    <div className="px-3 pb-3">
      <div className="mt-1.5 flex items-center gap-2">
        <span className="min-w-0 truncate font-mono text-[10px] text-muted-foreground">
          {issue.taskNumber}
        </span>
        {issue.url ? (
          <button
            type="button"
            onClick={() => openDoorayUrl(issue.url)}
            aria-label={translate(
              'auto.ext.dooray.components.TaskPageDooray.open_in_dooray',
              'Open in Dooray'
            )}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-3" />
          </button>
        ) : null}
      </div>
      <h3 className="mt-0.5 text-[13px] leading-snug font-semibold text-foreground">
        {issue.subject}
      </h3>
      <div className="mt-1.5">
        <WorkflowPicker key={issue.id} issue={issue} onIssuePatched={onIssuePatched} />
      </div>
      {issue.body?.trim() ? (
        <Collapsible open={bodyOpen} onOpenChange={setBodyOpen} className="mt-2">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              {bodyOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
              {translate(
                'auto.ext.dooray.components.right.sidebar.DoorayActiveTaskCard.description',
                'Description'
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CommentMarkdownAsync
              content={issue.body}
              variant="document"
              className="mt-1.5 text-[12px] leading-relaxed"
              onLinkClick={handleDoorayMarkdownLinkClick}
            />
          </CollapsibleContent>
        </Collapsible>
      ) : null}
      <div className="-mx-3">
        <DoorayIssueCommentsSection
          comments={comments.comments}
          commentsLoading={comments.commentsLoading}
          commentsError={comments.commentsError}
          retryLoadComments={comments.retryLoadComments}
        />
      </div>
      <DoorayCommentComposer
        commentDraft={comments.commentDraft}
        setCommentDraft={comments.setCommentDraft}
        commentSubmitting={comments.commentSubmitting}
        canSubmitComment={comments.canSubmitComment}
        submitComment={comments.submitComment}
      />
    </div>
  )
}

export function DoorayActiveTaskCard({
  activeBranch,
  projects,
  projectsLoading
}: {
  activeBranch: string | null
  projects: DoorayProject[]
  projectsLoading: boolean
}): React.JSX.Element {
  const task = useDoorayActiveTask(activeBranch, projects)
  let body: React.JSX.Element
  if (projectsLoading || task.loading) {
    body = (
      <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
        <LoaderCircle className="size-3.5 animate-spin" />
        {translate(
          'auto.ext.dooray.components.right.sidebar.DoorayActiveTaskCard.loading',
          'Loading task…'
        )}
      </div>
    )
  } else if (!task.parsed) {
    body = (
      <p className={MESSAGE_CLASS}>
        {translate(
          'auto.ext.dooray.components.right.sidebar.DoorayActiveTaskCard.no_task',
          'No Dooray task linked to this branch.'
        )}
      </p>
    )
  } else if (task.error) {
    body = <p className="px-3 py-3 text-xs text-destructive">{task.error}</p>
  } else if (!task.issue) {
    body = (
      <p className={MESSAGE_CLASS}>
        {translate(
          'auto.ext.dooray.components.right.sidebar.DoorayActiveTaskCard.not_found',
          'Task {{value0}}/{{value1}} was not found.',
          { value0: task.parsed.project.code, value1: task.parsed.postNumber }
        )}
      </p>
    )
  } else {
    body = <TaskDetail issue={task.issue} onIssuePatched={task.patchIssue} />
  }
  return (
    <div className="border-b border-border">
      <div className="px-3 pt-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {translate(
          'auto.ext.dooray.components.right.sidebar.DoorayActiveTaskCard.title',
          'Current task'
        )}
      </div>
      {body}
    </div>
  )
}
