import { useEffect, useRef, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { translate } from '@/i18n/i18n'
import type { DoorayMember } from '../../../../../shared/extensions/dooray/dooray-types'
import { useDoorayApi } from '../use-dooray-api'
import { DoorayRemovableChip } from './DoorayRemovableChip'

export type DoorayMemberRef = { id: string; name: string }

const SEARCH_DEBOUNCE_MS = 300

type DoorayMemberPickerProps = {
  members: DoorayMemberRef[]
  onChange: (members: DoorayMemberRef[]) => void
  placeholder: string
  disabled?: boolean
  id?: string
}

export function DoorayMemberPicker({
  members,
  onChange,
  placeholder,
  disabled,
  id
}: DoorayMemberPickerProps): React.JSX.Element {
  const api = useDoorayApi()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DoorayMember[]>([])
  const [searching, setSearching] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const name = query.trim()

  useEffect(() => {
    if (!name) {
      return
    }
    let stale = false
    const timeout = window.setTimeout(() => {
      setSearching(true)
      api
        .searchMembers({ name })
        .then((found) => {
          if (!stale) {
            setResults(found)
          }
        })
        .catch(() => {
          if (!stale) {
            setResults([])
          }
        })
        .finally(() => {
          if (!stale) {
            setSearching(false)
          }
        })
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      stale = true
      window.clearTimeout(timeout)
    }
  }, [api, name])

  const changeQuery = (next: string): void => {
    setQuery(next)
    setResults([])
    setSearching(false)
  }

  const add = (member: DoorayMember): void => {
    if (!members.some((entry) => entry.id === member.id)) {
      onChange([...members, { id: member.id, name: member.name }])
    }
    changeQuery('')
  }

  const visibleResults = results.filter(
    (member) => !members.some((entry) => entry.id === member.id)
  )
  const showResults = Boolean(name) && visibleResults.length > 0

  return (
    <div className="space-y-1.5">
      <Popover open={showResults} onOpenChange={(open) => !open && setResults([])}>
        <PopoverAnchor asChild>
          <div ref={anchorRef} className="relative">
            <Input
              id={id}
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              placeholder={placeholder}
              disabled={disabled}
            />
            {searching ? (
              <LoaderCircle className="absolute top-2.5 right-2.5 size-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          wheelScroll
          className="w-[var(--radix-popover-trigger-width)]"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            // Typing in the anchored input must not dismiss its own results.
            if (event.target instanceof Node && anchorRef.current?.contains(event.target)) {
              event.preventDefault()
            }
          }}
        >
          <div className="scrollbar-sleek max-h-48 overflow-y-auto p-1">
            {visibleResults.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => add(member)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent"
              >
                <span className="min-w-0 truncate font-medium">{member.name}</span>
                {member.userCode ? (
                  <span className="shrink-0 text-muted-foreground">{member.userCode}</span>
                ) : null}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {members.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {members.map((member) => (
            <DoorayRemovableChip
              key={member.id}
              label={member.name}
              disabled={disabled}
              removeLabel={translate(
                'auto.ext.dooray.components.dooray.new.task.fields.remove_member',
                'Remove {{value0}}',
                { value0: member.name }
              )}
              onRemove={() => onChange(members.filter((entry) => entry.id !== member.id))}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
