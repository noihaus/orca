import type { DoorayWorkflowClass } from '../../../../../shared/extensions/dooray/dooray-types'

// Tone keys off data-workflow so the class list stays static: closed = success, working = emphasized neutral.
export const DOORAY_WORKFLOW_PILL_CLASS =
  'inline-flex max-w-full min-w-0 items-center rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground data-[workflow=closed]:border-status-success-border data-[workflow=closed]:bg-status-success-background data-[workflow=closed]:text-status-success data-[workflow=working]:border-foreground/20 data-[workflow=working]:bg-accent data-[workflow=working]:text-foreground'

export function DoorayWorkflowPill({
  workflowClass,
  name
}: {
  workflowClass: DoorayWorkflowClass
  name: string
}): React.JSX.Element {
  return (
    <span data-workflow={workflowClass} className={DOORAY_WORKFLOW_PILL_CLASS}>
      <span className="truncate">{name}</span>
    </span>
  )
}
