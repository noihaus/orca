import { useId, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'
import type { DoorayMilestone } from '../../../../../shared/extensions/dooray/dooray-types'
import { formatDoorayMilestoneLabel, visibleDoorayMilestones } from '../lib/dooray-milestone-labels'
import { DOORAY_NONE_VALUE } from './dooray-new-task-options'

type DoorayMilestoneFieldProps = {
  milestones: DoorayMilestone[]
  milestoneId: string
  onMilestoneChange: (milestoneId: string) => void
  disabled?: boolean
}

export function DoorayMilestoneField({
  milestones,
  milestoneId,
  onMilestoneChange,
  disabled
}: DoorayMilestoneFieldProps): React.JSX.Element {
  const selectId = useId()
  const includeClosedId = useId()
  const [includeClosed, setIncludeClosed] = useState(false)
  const visible = visibleDoorayMilestones(
    milestones,
    includeClosed,
    milestoneId === DOORAY_NONE_VALUE ? null : milestoneId
  )
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={selectId}>
          {translate('auto.ext.dooray.components.dooray.new.task.dialog.milestone', 'Milestone')}
        </Label>
        <div className="flex items-center gap-1.5">
          <Checkbox
            id={includeClosedId}
            checked={includeClosed}
            disabled={disabled}
            onCheckedChange={(checked) => setIncludeClosed(checked === true)}
          />
          <label htmlFor={includeClosedId} className="text-xs text-muted-foreground">
            {translate(
              'auto.ext.dooray.components.dooray.new.task.fields.milestone_include_closed',
              'Include closed'
            )}
          </label>
        </div>
      </div>
      <Select
        value={milestoneId}
        onValueChange={onMilestoneChange}
        disabled={disabled || milestones.length === 0}
      >
        <SelectTrigger id={selectId} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DOORAY_NONE_VALUE}>
            {translate('auto.ext.dooray.components.dooray.new.task.dialog.no_milestone', 'None')}
          </SelectItem>
          {visible.map((milestone) => (
            <SelectItem key={milestone.id} value={milestone.id}>
              {formatDoorayMilestoneLabel(milestone)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
