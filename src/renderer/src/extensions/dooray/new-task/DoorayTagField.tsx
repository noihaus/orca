import { useId, useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { translate } from '@/i18n/i18n'
import type { DoorayTag } from '../../../../../shared/extensions/dooray/dooray-types'
import {
  groupDoorayTags,
  missingMandatoryTagGroups,
  toggleDoorayTag
} from '../lib/dooray-tag-groups'
import { DoorayRemovableChip } from './DoorayRemovableChip'

type DoorayTagFieldProps = {
  tags: DoorayTag[]
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  disabled?: boolean
}

export function DoorayTagField({
  tags,
  selectedTagIds,
  onChange,
  disabled
}: DoorayTagFieldProps): React.JSX.Element {
  const labelId = useId()
  const hintId = useId()
  const [query, setQuery] = useState('')
  const selected = useMemo(() => new Set(selectedTagIds), [selectedTagIds])
  const sections = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return groupDoorayTags(
      needle ? tags.filter((tag) => tag.name.toLowerCase().includes(needle)) : tags
    )
  }, [query, tags])
  const selectedTags = selectedTagIds.map(
    (id) => tags.find((tag) => tag.id === id) ?? { id, name: id }
  )
  const missingGroups = missingMandatoryTagGroups(tags, selectedTagIds)
  const toggle = (tagId: string): void => onChange(toggleDoorayTag(tags, selectedTagIds, tagId))

  return (
    <div className="space-y-2">
      <Label id={labelId}>
        {translate('auto.ext.dooray.components.dooray.new.task.dialog.tags', 'Tags')}
      </Label>
      <Popover onOpenChange={(open) => !open && setQuery('')}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-labelledby={labelId}
            aria-invalid={missingGroups.length > 0}
            aria-describedby={missingGroups.length > 0 ? hintId : undefined}
            disabled={disabled || tags.length === 0}
            className="w-full justify-between"
          >
            <span className="truncate text-muted-foreground">
              {selectedTagIds.length > 0
                ? translate(
                    'auto.ext.dooray.components.dooray.new.task.fields.tags_selected',
                    '{{value0}} tag(s) selected',
                    { value0: selectedTagIds.length }
                  )
                : translate(
                    'auto.ext.dooray.components.dooray.new.task.fields.tags_placeholder',
                    'Add tags'
                  )}
            </span>
            <ChevronDown className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(320px,calc(100vw-1rem))] min-w-[var(--radix-popover-trigger-width)]"
        >
          <Command shouldFilter={false}>
            <CommandInput
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={translate(
                'auto.ext.dooray.components.dooray.new.task.fields.tags_search',
                'Search tags…'
              )}
            />
            <CommandList className="max-h-56">
              <CommandEmpty>
                {translate(
                  'auto.ext.dooray.components.dooray.new.task.fields.tags_empty',
                  'No matching tags.'
                )}
              </CommandEmpty>
              {sections.map((section) => (
                <CommandGroup
                  key={section.group?.id ?? '__ungrouped__'}
                  heading={
                    <span className="flex items-center gap-1">
                      <span className="min-w-0 truncate">
                        {section.group?.name ||
                          translate(
                            'auto.ext.dooray.components.dooray.tag.field.ungrouped',
                            'Other'
                          )}
                      </span>
                      {section.group?.mandatory ? (
                        <Badge variant="destructive">
                          {translate(
                            'auto.ext.dooray.components.dooray.tag.field.mandatory',
                            'Required'
                          )}
                        </Badge>
                      ) : null}
                    </span>
                  }
                >
                  {section.tags.map((tag) => (
                    <CommandItem key={tag.id} value={tag.id} onSelect={() => toggle(tag.id)}>
                      {/* selectOne groups swap rather than accumulate, so draw them round like a radio. */}
                      <span
                        data-shape={section.group?.selectOne ? 'radio' : 'checkbox'}
                        data-checked={selected.has(tag.id)}
                        className="flex size-3.5 shrink-0 items-center justify-center rounded-sm border border-border data-[checked=true]:border-foreground/50 data-[checked=true]:bg-foreground data-[checked=true]:text-background data-[shape=radio]:rounded-full"
                      >
                        {selected.has(tag.id) ? <Check className="size-2.5" /> : null}
                      </span>
                      <span className="min-w-0 truncate">{tag.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedTags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <DoorayRemovableChip
              key={tag.id}
              label={tag.name}
              disabled={disabled}
              removeLabel={translate(
                'auto.ext.dooray.components.dooray.new.task.fields.remove_tag',
                'Remove tag {{value0}}',
                { value0: tag.name }
              )}
              onRemove={() => onChange(selectedTagIds.filter((id) => id !== tag.id))}
            />
          ))}
        </div>
      ) : null}
      {missingGroups.length > 0 ? (
        <p id={hintId} className="text-[11px] text-destructive">
          {translate(
            'auto.ext.dooray.components.dooray.tag.field.missing_required',
            'Select a required tag from: {{value0}}',
            { value0: missingGroups.map((group) => group.name).join(', ') }
          )}
        </p>
      ) : null}
    </div>
  )
}
