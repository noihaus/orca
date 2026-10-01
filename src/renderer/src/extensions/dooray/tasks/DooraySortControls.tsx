import { ArrowDown, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import type {
  DoorayMilestone,
  DoorayPriority,
  DoorayWorkflow
} from '../../../../../shared/extensions/dooray/dooray-types'
import type { DooraySortKey } from '../lib/dooray-issue-ordering'
import { formatDoorayMilestoneLabel } from '../lib/dooray-milestone-labels'
import { DOORAY_PRIORITY_FILTER_OPTIONS, getDoorayPriorityLabel } from './DoorayPriorityIndicator'

const K = 'auto.ext.dooray.components.TaskPageDooray'
// Radix Select forbids an empty item value, so "all" needs a sentinel.
const ALL = '__all__'

const SORT_KEYS: readonly DooraySortKey[] = [
  'number',
  'subject',
  'workflow',
  'milestone',
  'priority',
  'created',
  'updated'
]

function sortKeyLabel(key: DooraySortKey): string {
  switch (key) {
    case 'number':
      return translate(`${K}.sort_number`, 'Task number')
    case 'subject':
      return translate(`${K}.sort_subject`, 'Subject')
    case 'workflow':
      return translate(`${K}.sort_workflow`, 'Workflow')
    case 'milestone':
      return translate(`${K}.sort_milestone`, 'Milestone')
    case 'priority':
      return translate(`${K}.sort_priority`, 'Priority')
    case 'created':
      return translate(`${K}.sort_created`, 'Created')
    case 'updated':
      return translate(`${K}.sort_updated`, 'Updated')
  }
}

function isSortKey(value: string): value is DooraySortKey {
  return SORT_KEYS.some((key) => key === value)
}

function isPriority(value: string): value is DoorayPriority {
  return DOORAY_PRIORITY_FILTER_OPTIONS.some((priority) => priority === value)
}

export type DooraySortControlsProps = {
  sortKey: DooraySortKey
  sortDir: 'asc' | 'desc'
  onSort: (key: DooraySortKey) => void
  onToggleSortDir: () => void
  clientOnlySort: boolean
  hasActiveClientFilter: boolean
  milestones: readonly DoorayMilestone[]
  milestoneFilter: string | null
  onMilestoneFilterChange: (name: string | null) => void
  workflows: readonly DoorayWorkflow[]
  workflowFilter: string | null
  onWorkflowFilterChange: (workflowId: string | null) => void
  priorityFilter: DoorayPriority | null
  onPriorityFilterChange: (priority: DoorayPriority | null) => void
}

function fromAll(value: string): string | null {
  return value === ALL ? null : value
}

export function DooraySortControls(props: DooraySortControlsProps): React.JSX.Element {
  const sortByLabel = translate('auto.components.TaskPage.jiraSortBy', 'Sort by')
  const nextDirectionLabel =
    props.sortDir === 'asc'
      ? translate('auto.components.TaskPage.jiraSortDescending', 'descending')
      : translate('auto.components.TaskPage.jiraSortAscending', 'ascending')
  const toggleDirectionLabel = translate(
    'auto.components.TaskPage.jiraToggleSortDirection',
    'Sort {{value0}}',
    { value0: nextDirectionLabel }
  )
  const allMilestonesLabel = translate(`${K}.milestone_all`, 'All milestones')
  const allWorkflowsLabel = translate(`${K}.workflow_all`, 'All stages')
  const allPrioritiesLabel = translate(`${K}.priority_all`, 'All priorities')
  const loadedOnlyHint = props.hasActiveClientFilter
    ? translate(`${K}.milestone_loaded_only`, 'Filtered across loaded tasks only')
    : props.clientOnlySort
      ? translate(`${K}.sort_loaded_only`, 'Sorted across loaded tasks only')
      : null

  return (
    <div className="flex min-h-10 flex-none flex-wrap items-center gap-2 border-b border-border/50 bg-muted/25 px-3 py-1">
      <span className="shrink-0 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
        {sortByLabel}
      </span>
      <Select
        value={props.sortKey}
        onValueChange={(value) => (isSortKey(value) ? props.onSort(value) : undefined)}
      >
        <SelectTrigger size="sm" aria-label={sortByLabel} className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_KEYS.map((key) => (
            <SelectItem key={key} value={key}>
              {sortKeyLabel(key)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={toggleDirectionLabel}
            onClick={props.onToggleSortDir}
          >
            {props.sortDir === 'asc' ? (
              <ArrowUp aria-hidden="true" className="size-3.5" />
            ) : (
              <ArrowDown aria-hidden="true" className="size-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {toggleDirectionLabel}
        </TooltipContent>
      </Tooltip>

      {props.milestones.length > 0 ? (
        <Select
          value={props.milestoneFilter ?? ALL}
          onValueChange={(value) => props.onMilestoneFilterChange(fromAll(value))}
        >
          <SelectTrigger size="sm" aria-label={allMilestonesLabel} className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{allMilestonesLabel}</SelectItem>
            {props.milestones.map((milestone) => (
              <SelectItem key={milestone.id} value={milestone.name}>
                {formatDoorayMilestoneLabel(milestone)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {props.workflows.length > 0 ? (
        <Select
          value={props.workflowFilter ?? ALL}
          onValueChange={(value) => props.onWorkflowFilterChange(fromAll(value))}
        >
          <SelectTrigger size="sm" aria-label={allWorkflowsLabel} className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{allWorkflowsLabel}</SelectItem>
            {props.workflows.map((workflow) => (
              <SelectItem key={workflow.id} value={workflow.id}>
                {workflow.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Select
        value={props.priorityFilter ?? ALL}
        onValueChange={(value) => props.onPriorityFilterChange(isPriority(value) ? value : null)}
      >
        <SelectTrigger size="sm" aria-label={allPrioritiesLabel} className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allPrioritiesLabel}</SelectItem>
          {DOORAY_PRIORITY_FILTER_OPTIONS.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {getDoorayPriorityLabel(priority)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loadedOnlyHint ? (
        <span className="min-w-0 truncate text-[11px] text-muted-foreground">{loadedOnlyHint}</span>
      ) : null}
    </div>
  )
}
