import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type DoorayRemovableChipProps = {
  label: string
  detail?: string
  removeLabel: string
  onRemove: () => void
  disabled?: boolean
}

export function DoorayRemovableChip({
  label,
  detail,
  removeLabel,
  onRemove,
  disabled
}: DoorayRemovableChipProps): React.JSX.Element {
  return (
    <Badge variant="outline" className="max-w-full">
      <span className="truncate font-normal">{label}</span>
      {detail ? <span className="shrink-0 font-normal text-muted-foreground">{detail}</span> : null}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={removeLabel}
        className="text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        <X className="size-3" />
      </button>
    </Badge>
  )
}
