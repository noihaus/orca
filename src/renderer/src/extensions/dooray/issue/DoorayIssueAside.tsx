import { ArrowRight, Clipboard, ExternalLink, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import type { DoorayIssue } from '../../../../../shared/extensions/dooray/dooray-types'
import { buildDoorayPrompt, copyDoorayText } from '../lib/dooray-issue-clipboard'
import { openDoorayUrl } from '../lib/dooray-open-link'
import {
  DoorayWorkspaceStartMenu,
  type DoorayWorkspaceStart
} from '../start/DoorayWorkspaceStartMenu'

export type { DoorayWorkspaceStart }

export type DoorayStartKind = 'new-worktree' | 'existing-workspace'

export type DoorayStartAction = {
  kind: DoorayStartKind
  disabledReason?: string
  run: (issue: DoorayIssue) => void
}

export function doorayStartLabel(kind: DoorayStartKind): string {
  return kind === 'existing-workspace'
    ? translate(
        'auto.ext.dooray.components.DoorayIssueWorkspace.start_in_current',
        'Start in current workspace'
      )
    : translate(
        'auto.ext.dooray.components.DoorayIssueWorkspace.start_workspace',
        'Start workspace'
      )
}

type PrimaryStartProps = {
  issue: DoorayIssue
  className?: string
  size?: 'sm'
  primaryStartKind: DoorayStartKind
  // Only applies to a start action; "Open workspace" is always available.
  primaryDisabledReason?: string
  // With several candidates, an existing-workspace primary opens this picker instead of running.
  workspaceStart?: DoorayWorkspaceStart
  onUse?: (issue: DoorayIssue) => void
  onOpenWorkspace?: (issue: DoorayIssue) => void
}

// Hidden until the host wires a start action (D10) or an existing workspace (onOpenWorkspace).
export function DoorayStartPrimaryButton({
  issue,
  className,
  size,
  primaryStartKind,
  primaryDisabledReason,
  workspaceStart,
  onUse,
  onOpenWorkspace
}: PrimaryStartProps): React.JSX.Element | null {
  const run = onOpenWorkspace ?? onUse
  if (!run) {
    return null
  }
  const usesMenu =
    !onOpenWorkspace &&
    primaryStartKind === 'existing-workspace' &&
    workspaceStart !== undefined &&
    workspaceStart.options.length > 1
  const blocked = !onOpenWorkspace && !usesMenu && Boolean(primaryDisabledReason)
  const button = (
    <Button
      onClick={usesMenu ? undefined : () => run(issue)}
      className={blocked ? 'w-full' : className}
      size={size}
      disabled={blocked}
    >
      {onOpenWorkspace
        ? translate('auto.ext.dooray.components.TaskPageDooray.open_workspace', 'Open workspace')
        : doorayStartLabel(primaryStartKind)}
      <ArrowRight className="size-4" />
    </Button>
  )
  if (usesMenu && workspaceStart) {
    return (
      <DoorayWorkspaceStartMenu issue={issue} workspaceStart={workspaceStart}>
        {button}
      </DoorayWorkspaceStartMenu>
    )
  }
  if (!blocked) {
    return button
  }
  // A disabled button swallows pointer events, so the tooltip hangs off a wrapper.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className}>{button}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {primaryDisabledReason}
      </TooltipContent>
    </Tooltip>
  )
}

function WorkspaceStartMenu({
  issue,
  workspaceStart
}: {
  issue: DoorayIssue
  workspaceStart: DoorayWorkspaceStart
}): React.JSX.Element {
  return (
    <DoorayWorkspaceStartMenu issue={issue} workspaceStart={workspaceStart}>
      <Button variant="outline" size="sm" className="mb-2 w-full justify-center">
        <GitBranch className="size-3.5" />
        {doorayStartLabel('existing-workspace')}
      </Button>
    </DoorayWorkspaceStartMenu>
  )
}

function SecondaryStart({
  issue,
  secondaryStart,
  workspaceStart
}: {
  issue: DoorayIssue
  secondaryStart: DoorayStartAction
  workspaceStart?: DoorayWorkspaceStart
}): React.JSX.Element {
  if (
    secondaryStart.kind === 'existing-workspace' &&
    workspaceStart &&
    workspaceStart.options.length > 1
  ) {
    return <WorkspaceStartMenu issue={issue} workspaceStart={workspaceStart} />
  }
  const hint =
    secondaryStart.disabledReason ??
    (secondaryStart.kind === 'existing-workspace'
      ? translate(
          'auto.ext.dooray.components.DoorayIssueWorkspace.start_in_current_hint',
          'Switch the active workspace to feature/{{value0}}',
          {
            value0: issue.taskNumber
          }
        )
      : translate(
          'auto.ext.dooray.components.DoorayIssueWorkspace.start_new_hint',
          'Create a new worktree for this task.'
        ))
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="mb-2 block w-full">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center"
            disabled={Boolean(secondaryStart.disabledReason)}
            onClick={() => secondaryStart.run(issue)}
          >
            <GitBranch className="size-3.5" />
            {doorayStartLabel(secondaryStart.kind)}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" sideOffset={6}>
        {hint}
      </TooltipContent>
    </Tooltip>
  )
}

type AsideAction = { label: string; icon: typeof Clipboard; run: () => void }

function buildAsideActions(issue: DoorayIssue): AsideAction[] {
  const link: AsideAction[] = issue.url
    ? [
        {
          label: translate(
            'auto.ext.dooray.components.DoorayIssueWorkspace.open_in_dooray',
            'Open in Dooray'
          ),
          icon: ExternalLink,
          run: () => openDoorayUrl(issue.url)
        },
        {
          label: translate('auto.ext.dooray.components.DoorayIssueWorkspace.copy_url', 'Copy URL'),
          icon: Clipboard,
          run: () => void copyDoorayText(issue.url, 'URL')
        }
      ]
    : []
  return [
    ...link,
    {
      label: translate(
        'auto.ext.dooray.components.DoorayIssueWorkspace.copy_task_number',
        'Copy task number'
      ),
      icon: Clipboard,
      run: () => void copyDoorayText(issue.taskNumber, 'Task number')
    },
    {
      label: translate(
        'auto.ext.dooray.components.DoorayIssueWorkspace.copy_prompt',
        'Copy prompt'
      ),
      icon: Clipboard,
      run: () => void copyDoorayText(buildDoorayPrompt(issue), 'Prompt')
    }
  ]
}

export function DoorayIssueAside({
  issue,
  primaryStartKind,
  primaryDisabledReason,
  onUse,
  onOpenWorkspace,
  secondaryStart,
  workspaceStart
}: PrimaryStartProps & {
  secondaryStart?: DoorayStartAction
  workspaceStart?: DoorayWorkspaceStart
}): React.JSX.Element {
  return (
    <aside className="border-t border-border/50 bg-muted/20 px-3 py-3 xl:border-l xl:border-t-0">
      <DoorayStartPrimaryButton
        issue={issue}
        className="mb-3 flex w-full justify-center sm:hidden"
        primaryStartKind={primaryStartKind}
        primaryDisabledReason={primaryDisabledReason}
        workspaceStart={workspaceStart}
        onUse={onUse}
        onOpenWorkspace={onOpenWorkspace}
      />
      {secondaryStart ? (
        <SecondaryStart
          issue={issue}
          secondaryStart={secondaryStart}
          workspaceStart={workspaceStart}
        />
      ) : null}
      <div className="grid gap-1">
        {buildAsideActions(issue).map(({ label, icon: Icon, run }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={run}
                className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={6}>
              {label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </aside>
  )
}
