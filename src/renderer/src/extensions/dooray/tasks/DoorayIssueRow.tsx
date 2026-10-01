import { ArrowRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { formatUiRelativeTimeFromDate } from '@/i18n/relative-time-format'
import type { DoorayIssue } from '../../../../../shared/extensions/dooray/dooray-types'
import { openDoorayUrl } from '../lib/dooray-open-link'
import { DoorayPriorityIndicator } from './DoorayPriorityIndicator'
import { DoorayWorkflowPill } from './DoorayWorkflowPill'

const K = 'auto.ext.dooray.components.TaskPageDooray'

export type DoorayIssueRowProps = {
  issue: DoorayIssue
  selected?: boolean
  onSelectIssue?: (issue: DoorayIssue) => void
  onStartIssue?: (issue: DoorayIssue) => void
}

function assigneeLabel(issue: DoorayIssue): string {
  return issue.assignees.length > 0
    ? issue.assignees.join(', ')
    : translate(`${K}.unassigned`, 'Unassigned')
}

function RowActions({
  issue,
  onStartIssue
}: Pick<DoorayIssueRowProps, 'issue' | 'onStartIssue'>): React.JSX.Element {
  return (
    <div className="flex shrink-0 items-center justify-end gap-1 md:opacity-0 md:transition-opacity md:group-hover/row:opacity-100 md:group-focus-within/row:opacity-100">
      {onStartIssue ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={translate(
                `${K}.start_workspace_from`,
                'Start workspace from {{value0}}',
                {
                  value0: issue.taskNumber
                }
              )}
              onClick={(event) => {
                event.stopPropagation()
                onStartIssue(issue)
              }}
            >
              <ArrowRight className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {translate('auto.components.TaskPage.9497f2787c', 'Start workspace')}
          </TooltipContent>
        </Tooltip>
      ) : null}
      {issue.url ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={translate(`${K}.open_in_dooray_aria`, 'Open {{value0}} in Dooray', {
                value0: issue.taskNumber
              })}
              onClick={(event) => {
                event.stopPropagation()
                openDoorayUrl(issue.url)
              }}
            >
              <ExternalLink className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {translate(`${K}.open_in_dooray`, 'Open in Dooray')}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
}

export function DoorayIssueRow({
  issue,
  selected = false,
  onSelectIssue,
  onStartIssue
}: DoorayIssueRowProps): React.JSX.Element {
  const interactive = onSelectIssue !== undefined
  return (
    // Why: the row hosts action buttons, so a native button wrapper would nest buttons; role + keys keep it accessible.
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-current={selected ? 'true' : undefined}
      data-interactive={interactive ? 'true' : undefined}
      data-testid="dooray-issue-row"
      onClick={() => onSelectIssue?.(issue)}
      onKeyDown={(event) => {
        if (!interactive || event.target !== event.currentTarget) {
          return
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelectIssue?.(issue)
        }
      }}
      className="group/row grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left transition hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none aria-[current=true]:bg-accent data-[interactive=true]:cursor-pointer md:grid-cols-[170px_minmax(0,1fr)_128px_136px_80px_64px]"
    >
      <span className="block truncate font-mono text-[12px] text-muted-foreground max-md:!hidden">
        {issue.taskNumber}
      </span>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground md:hidden">
            {issue.taskNumber}
          </span>
          <h3 className="min-w-0 truncate text-[13px] font-medium text-foreground">
            {issue.subject}
          </h3>
          {issue.milestoneName ? (
            <span className="max-w-[140px] shrink-0 truncate rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {issue.milestoneName}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 md:!hidden">
          <DoorayPriorityIndicator priority={issue.priority} />
          <DoorayWorkflowPill workflowClass={issue.workflowClass} name={issue.workflowName} />
          <span className="min-w-0 truncate text-[11px] text-muted-foreground">
            {issue.assignees.join(', ')}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1.5 max-md:!hidden">
        <DoorayPriorityIndicator priority={issue.priority} />
        <DoorayWorkflowPill workflowClass={issue.workflowClass} name={issue.workflowName} />
      </div>

      <span className="block truncate text-[12px] text-muted-foreground max-md:!hidden">
        {assigneeLabel(issue)}
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="block min-w-0 truncate text-[12px] text-muted-foreground max-md:!hidden">
            {formatUiRelativeTimeFromDate(issue.updatedAt)}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {new Date(issue.updatedAt).toLocaleString()}
        </TooltipContent>
      </Tooltip>

      <RowActions issue={issue} onStartIssue={onStartIssue} />
    </div>
  )
}
