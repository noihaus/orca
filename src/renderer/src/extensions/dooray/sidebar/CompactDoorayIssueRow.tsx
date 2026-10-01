import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { DoorayIssue } from '../../../../../shared/extensions/dooray/dooray-types'
import { DoorayPriorityIndicator } from '../tasks/DoorayPriorityIndicator'
import { DoorayWorkflowPill } from '../tasks/DoorayWorkflowPill'

export function CompactDoorayIssueRow({
  issue,
  selected,
  primaryActionLabel,
  onOpenIssue,
  onPrimaryAction
}: {
  issue: DoorayIssue
  selected: boolean
  primaryActionLabel: string
  onOpenIssue: (issue: DoorayIssue) => void
  onPrimaryAction: (issue: DoorayIssue) => void
}): React.JSX.Element {
  return (
    // Why: the row hosts an action button, so a native button wrapper would nest buttons; role + keys keep it accessible.
    <div
      role="button"
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      data-testid="dooray-compact-row"
      onClick={() => onOpenIssue(issue)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenIssue(issue)
        }
      }}
      className="group/row flex cursor-pointer items-center gap-2 px-3 py-2 text-left transition hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none aria-[current=true]:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-[10px] text-muted-foreground">
          {issue.taskNumber}
        </div>
        <div className="mt-0.5 truncate text-[12px] font-medium text-foreground">
          {issue.subject}
        </div>
        <div className="mt-1 flex max-w-full items-center gap-1">
          <DoorayPriorityIndicator priority={issue.priority} />
          <DoorayWorkflowPill workflowClass={issue.workflowClass} name={issue.workflowName} />
        </div>
      </div>
      <span className="shrink-0 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={primaryActionLabel}
              onClick={(event) => {
                event.stopPropagation()
                onPrimaryAction(issue)
              }}
            >
              <ArrowRight className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={6}>
            {primaryActionLabel}
          </TooltipContent>
        </Tooltip>
      </span>
    </div>
  )
}
