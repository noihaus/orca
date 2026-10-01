import { ChevronDown, ChevronsDown, ChevronsUp, ChevronUp, Minus } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import type { DoorayPriority } from '../../../../../shared/extensions/dooray/dooray-types'

const K = 'auto.ext.dooray.components.dooray.priority'

export const DOORAY_PRIORITY_FILTER_OPTIONS: readonly DoorayPriority[] = [
  'highest',
  'high',
  'normal',
  'low',
  'lowest',
  'none'
]

export function getDoorayPriorityLabel(priority: DoorayPriority | undefined): string {
  switch (priority) {
    case 'highest':
      return translate(`${K}.highest`, 'Highest')
    case 'high':
      return translate(`${K}.high`, 'High')
    case 'normal':
      return translate(`${K}.normal`, 'Normal')
    case 'low':
      return translate(`${K}.low`, 'Low')
    case 'lowest':
      return translate(`${K}.lowest`, 'Lowest')
    case 'none':
    case undefined:
      return translate(`${K}.none`, 'None')
  }
}

function PriorityGlyph({
  priority,
  label
}: {
  priority: Exclude<DoorayPriority, 'none'>
  label: string
}): React.JSX.Element {
  switch (priority) {
    case 'highest':
      return <ChevronsUp aria-label={label} className="size-3.5 shrink-0 text-destructive" />
    case 'high':
      return <ChevronUp aria-label={label} className="size-3.5 shrink-0 text-status-warning" />
    case 'normal':
      return <Minus aria-label={label} className="size-3.5 shrink-0 text-muted-foreground" />
    case 'low':
      return <ChevronDown aria-label={label} className="size-3.5 shrink-0 text-muted-foreground" />
    case 'lowest':
      return (
        <ChevronsDown aria-label={label} className="size-3.5 shrink-0 text-muted-foreground/60" />
      )
  }
}

export function DoorayPriorityIndicator({
  priority
}: {
  priority: DoorayPriority | undefined
}): React.JSX.Element | null {
  if (!priority || priority === 'none') {
    return null
  }
  const label = getDoorayPriorityLabel(priority)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0">
          <PriorityGlyph priority={priority} label={label} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
