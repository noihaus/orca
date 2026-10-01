import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import type { DoorayIssue } from '../../../../../shared/extensions/dooray/dooray-types'

export type DoorayWorkspaceStartOption = {
  id: string
  label: string
  branch?: string
  projectName?: string
  isActive?: boolean
  isConfiguredTarget?: boolean
  // Set when the workspace cannot switch branches here (SSH, remote, folder).
  disabledReason?: string
}

export type DoorayWorkspaceStart = {
  options: DoorayWorkspaceStartOption[]
  onSelect: (issue: DoorayIssue, optionId: string) => void
}

function OptionBody({ option }: { option: DoorayWorkspaceStartOption }): React.JSX.Element {
  const detail =
    option.disabledReason ?? [option.projectName, option.branch].filter(Boolean).join(' · ')
  return (
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 truncate text-[12px] font-medium">{option.label}</span>
        {option.isConfiguredTarget ? (
          <span className="shrink-0 rounded border border-border/60 px-1 text-[9px] tracking-wide text-muted-foreground uppercase">
            {translate('auto.ext.dooray.components.dooray.workspace.start.menu.default', 'default')}
          </span>
        ) : null}
      </div>
      {detail ? <div className="truncate text-[10px] text-muted-foreground">{detail}</div> : null}
    </div>
  )
}

// The trigger is the caller's button so the sheet and rows keep their own styling.
export function DoorayWorkspaceStartMenu({
  issue,
  workspaceStart,
  children
}: {
  issue: DoorayIssue
  workspaceStart: DoorayWorkspaceStart
  children: ReactNode
}): React.JSX.Element {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64"
        onClick={(event) => event.stopPropagation()}
      >
        {workspaceStart.options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            disabled={Boolean(option.disabledReason)}
            onSelect={() => workspaceStart.onSelect(issue, option.id)}
          >
            <OptionBody option={option} />
            {option.isActive ? <Check className="size-3.5 shrink-0" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
