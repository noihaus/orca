import { RefreshCw } from 'lucide-react'
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
  DoorayIssue,
  DoorayIssueFilter
} from '../../../../../shared/extensions/dooray/dooray-types'
import { translateDoorayError } from '../lib/dooray-error-messages'
import { DoorayIssueRow } from './DoorayIssueRow'
import { DooraySortControls } from './DooraySortControls'
import type { DoorayIssueListModel } from './use-dooray-issue-list'

const K = 'auto.ext.dooray.components.TaskPageDooray'

export type DoorayIssueListPanelProps = {
  list: DoorayIssueListModel
  credentialError?: string
  selectedIssueId?: string | null
  onSelectIssue?: (issue: DoorayIssue) => void
  onStartIssue?: (issue: DoorayIssue) => void
}

function filterOptions(): { id: DoorayIssueFilter; label: string }[] {
  return [
    { id: 'assigned', label: translate(`${K}.filter_assigned`, 'Assigned to me') },
    { id: 'all', label: translate(`${K}.filter_all`, 'All Open') },
    { id: 'done', label: translate(`${K}.filter_done`, 'Done') }
  ]
}

function ErrorBanner({ message }: { message: string }): React.JSX.Element {
  return (
    <div role="alert" className="border-b border-border px-4 py-4 text-sm text-destructive">
      {message}
    </div>
  )
}

function LoadingSkeleton(): React.JSX.Element {
  return (
    <div className="divide-y divide-border/50" data-testid="dooray-issue-skeleton">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-3 py-3">
          <div className="h-4 w-4/5 animate-pulse rounded bg-muted/70" />
          <div className="mt-2 h-3 w-3/5 animate-pulse rounded bg-muted/60" />
        </div>
      ))}
    </div>
  )
}

export function DoorayIssueListPanel({
  list,
  credentialError,
  selectedIssueId = null,
  onSelectIssue,
  onStartIssue
}: DoorayIssueListPanelProps): React.JSX.Element {
  const refreshLabel = translate(`${K}.refresh`, 'Refresh tasks')
  const anyError = credentialError ?? list.projectsError ?? list.error
  const showEmpty = !list.loading && !list.projectsLoading && list.issues.length === 0 && !anyError

  return (
    <div className="flex max-h-full min-h-0 flex-col overflow-hidden rounded-md rounded-t-none border border-t-0 border-border/50 bg-background shadow-sm">
      <div className="flex h-10 flex-none items-center justify-between gap-3 border-b border-border/50 bg-muted/35 px-3">
        <div className="min-w-0 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          {translate(`${K}.panel_title`, 'Dooray tasks')}
        </div>
        <div className="shrink-0 text-[11px] text-muted-foreground">
          {list.issues.length} / {list.totalCount}{' '}
          {translate('auto.components.TaskPage.b7bae28b6a', 'shown')}
        </div>
      </div>

      <div className="flex flex-none flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2">
        <Select
          value={list.selectedProjectId ?? undefined}
          onValueChange={list.selectProject}
          disabled={list.projectsLoading || list.projects.length === 0}
        >
          <SelectTrigger size="sm" className="w-[220px]">
            <SelectValue
              placeholder={
                list.projectsLoading
                  ? translate(`${K}.loading_projects`, 'Loading projects…')
                  : translate(`${K}.select_project`, 'Select project')
              }
            />
          </SelectTrigger>
          <SelectContent>
            {list.projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          {filterOptions().map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={list.filter === option.id}
              onClick={() => list.setFilter(option.id)}
              className="rounded-md border border-border/50 bg-transparent px-2 py-1 text-xs text-foreground transition hover:bg-muted/50 aria-pressed:bg-foreground/90 aria-pressed:text-background aria-pressed:hover:bg-foreground/90"
            >
              {option.label}
            </button>
          ))}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={list.refresh}
              disabled={list.loading || !list.selectedProjectId}
              aria-label={refreshLabel}
            >
              <RefreshCw
                data-spinning={list.loading ? 'true' : undefined}
                className="size-3.5 data-[spinning=true]:animate-spin"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {refreshLabel}
          </TooltipContent>
        </Tooltip>
      </div>

      <DooraySortControls
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSort={list.sortBy}
        onToggleSortDir={list.toggleSortDir}
        clientOnlySort={list.clientOnlySort}
        hasActiveClientFilter={list.hasActiveClientFilter}
        milestones={list.milestones}
        milestoneFilter={list.milestoneFilter}
        onMilestoneFilterChange={list.setMilestoneFilter}
        workflows={list.workflows}
        workflowFilter={list.workflowFilter}
        onWorkflowFilterChange={list.setWorkflowFilter}
        priorityFilter={list.priorityFilter}
        onPriorityFilterChange={list.setPriorityFilter}
      />

      <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {credentialError ? <ErrorBanner message={credentialError} /> : null}
        {list.projectsError ? (
          <ErrorBanner message={translateDoorayError(list.projectsError)} />
        ) : null}
        {list.error ? <ErrorBanner message={translateDoorayError(list.error)} /> : null}
        {list.loading && list.rawIssues.length === 0 ? <LoadingSkeleton /> : null}
        {showEmpty ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">
              {translate(`${K}.no_tasks`, 'No Dooray tasks found')}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {translate(`${K}.no_tasks_hint`, 'No tasks match the selected project and filter.')}
            </p>
          </div>
        ) : null}
        <div className="divide-y divide-border/50">
          {list.issues.map((issue) => (
            <DoorayIssueRow
              key={issue.id}
              issue={issue}
              selected={issue.id === selectedIssueId}
              onSelectIssue={onSelectIssue}
              onStartIssue={onStartIssue}
            />
          ))}
        </div>
        {list.canLoadMore ? (
          <div className="flex justify-center px-3 py-3">
            <Button variant="outline" size="sm" onClick={list.loadMore}>
              {translate(`${K}.load_more`, 'Load more')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
