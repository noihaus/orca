import { useState } from 'react'
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'
import type { DoorayIssue } from '../../../../../shared/extensions/dooray/dooray-types'
import { translateDoorayError } from '../lib/dooray-error-messages'
import { filterOptions } from '../tasks/DoorayIssueListPanel'
import { DooraySortControls } from '../tasks/DooraySortControls'
import type { DoorayIssueListModel } from '../tasks/use-dooray-issue-list'
import { CompactDoorayIssueRow } from './CompactDoorayIssueRow'

function ErrorLine({ message }: { message: string }): React.JSX.Element {
  return (
    <div role="alert" className="border-b border-border px-3 py-3 text-xs text-destructive">
      {message}
    </div>
  )
}

export function DoorayAllTasksSection({
  list,
  credentialError,
  selectedIssueId,
  attachedIssueIds,
  onSelectProject,
  onOpenIssue,
  onStartIssue,
  startLabel,
  onOpenWorkspace
}: {
  list: DoorayIssueListModel
  credentialError?: string
  selectedIssueId: string | null
  attachedIssueIds: ReadonlySet<string>
  onSelectProject: (projectId: string) => void
  onOpenIssue: (issue: DoorayIssue) => void
  onStartIssue: (issue: DoorayIssue) => void
  startLabel: string
  onOpenWorkspace: (issue: DoorayIssue) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const refreshLabel = translate(
    'auto.ext.dooray.components.TaskPageDooray.refresh',
    'Refresh tasks'
  )
  const anyError = credentialError ?? list.projectsError ?? list.error
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-1.5 border-b border-border px-3 py-2 text-left transition-colors hover:bg-accent"
        >
          {open ? (
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {translate(
              'auto.ext.dooray.components.right.sidebar.DoorayTasksPanel.all_tasks',
              'All tasks'
            )}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {list.issues.length} / {list.totalCount}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-2 border-b border-border px-3 py-2">
          <Select
            value={list.selectedProjectId ?? undefined}
            onValueChange={onSelectProject}
            disabled={list.projectsLoading || list.projects.length === 0}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue
                placeholder={
                  list.projectsLoading
                    ? translate(
                        'auto.ext.dooray.components.TaskPageDooray.loading_projects',
                        'Loading projects…'
                      )
                    : translate(
                        'auto.ext.dooray.components.TaskPageDooray.select_project',
                        'Select project'
                      )
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
                className="min-w-0 truncate rounded-md border border-border/50 bg-transparent px-1.5 py-0.5 text-[11px] text-foreground transition hover:bg-muted/50 aria-pressed:bg-foreground/90 aria-pressed:text-background aria-pressed:hover:bg-foreground/90"
              >
                {option.label}
              </button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="ml-auto"
              onClick={list.refresh}
              disabled={list.loading || !list.selectedProjectId}
              aria-label={refreshLabel}
            >
              <RefreshCw
                data-spinning={list.loading ? 'true' : undefined}
                className="size-3.5 data-[spinning=true]:animate-spin"
              />
            </Button>
          </div>
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
        {credentialError ? <ErrorLine message={credentialError} /> : null}
        {list.projectsError ? (
          <ErrorLine message={translateDoorayError(list.projectsError)} />
        ) : null}
        {list.error ? <ErrorLine message={translateDoorayError(list.error)} /> : null}
        {!list.loading && !list.projectsLoading && list.issues.length === 0 && !anyError ? (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">
            {translate(
              'auto.ext.dooray.components.TaskPageDooray.no_tasks_hint',
              'No tasks match the selected project and filter.'
            )}
          </p>
        ) : null}
        <div className="divide-y divide-border/50">
          {list.issues.map((issue) => {
            const attached = attachedIssueIds.has(issue.id)
            return (
              <CompactDoorayIssueRow
                key={issue.id}
                issue={issue}
                selected={issue.id === selectedIssueId}
                primaryActionLabel={
                  attached
                    ? translate(
                        'auto.ext.dooray.components.TaskPageDooray.open_workspace',
                        'Open workspace'
                      )
                    : startLabel
                }
                onOpenIssue={onOpenIssue}
                onPrimaryAction={attached ? onOpenWorkspace : onStartIssue}
              />
            )
          })}
        </div>
        {list.canLoadMore ? (
          <div className="flex justify-center px-3 py-2.5">
            <Button variant="outline" size="xs" onClick={list.loadMore}>
              {translate('auto.ext.dooray.components.TaskPageDooray.load_more', 'Load more')}
            </Button>
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  )
}
