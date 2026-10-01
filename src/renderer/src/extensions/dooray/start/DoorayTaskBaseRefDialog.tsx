import { useEffect, useState } from 'react'
import { BaseRefPicker } from '@/components/settings/BaseRefPicker'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { translate } from '@/i18n/i18n'
import { getRuntimeEnvironmentIdForRepo } from '@/lib/repo-runtime-owner'
import { getRuntimeRepoBaseRefDefault } from '@/runtime/runtime-repo-client'
import { useAppStore } from '@/store'
import type { DoorayBaseRefChoice, DoorayBaseRefRequest } from './dooray-task-base-ref-context'

function useBaseRefDialogData(request: DoorayBaseRefRequest): {
  defaultBaseRef: string | null
  submodules: string[]
} {
  const [defaultBaseRef, setDefaultBaseRef] = useState<string | null>(null)
  const [submodules, setSubmodules] = useState<string[]>([...request.defaultSubmodulePaths])
  useEffect(() => {
    let stale = false
    const activeRuntimeEnvironmentId = getRuntimeEnvironmentIdForRepo(
      useAppStore.getState(),
      request.repoId
    )
    getRuntimeRepoBaseRefDefault({ activeRuntimeEnvironmentId }, request.repoId)
      .then((result) => {
        if (!stale && result.defaultBaseRef) {
          setDefaultBaseRef(result.defaultBaseRef)
        }
      })
      .catch(() => {})
    window.api.dooray?.taskBranch
      ?.listSubmodules({ worktreePath: request.worktreePath })
      .then((all) => {
        if (!stale) {
          // Configured paths stay listed even if .gitmodules no longer declares them.
          setSubmodules((current) => [...current, ...all.filter((path) => !current.includes(path))])
        }
      })
      .catch(() => {})
    return () => {
      stale = true
    }
  }, [request.repoId, request.worktreePath])
  return { defaultBaseRef, submodules }
}

// Mounted per request (keyed by the provider), so state starts fresh for every prompt.
export function DoorayTaskBaseRefDialog({
  request,
  onSettle
}: {
  request: DoorayBaseRefRequest
  onSettle: (choice: DoorayBaseRefChoice | 'cancel') => void
}): React.JSX.Element {
  const { defaultBaseRef, submodules } = useBaseRefDialogData(request)
  const [picked, setPicked] = useState<string | null>(null)
  const [fetchBase, setFetchBase] = useState(true)
  const [checked, setChecked] = useState<ReadonlySet<string>>(
    () => new Set(request.defaultSubmodulePaths)
  )
  const selected = picked ?? defaultBaseRef
  const checkedPaths = submodules.filter((path) => checked.has(path))
  const toggle = (path: string, on: boolean): void =>
    setChecked((current) => {
      const next = new Set(current)
      if (on) {
        next.add(path)
      } else {
        next.delete(path)
      }
      return next
    })
  return (
    <Dialog open onOpenChange={(open) => !open && onSettle('cancel')}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {translate(
              'auto.ext.dooray.components.doorayTaskBaseRefDialog.title',
              'Where should {{value0}} start?',
              { value0: request.branch }
            )}
          </DialogTitle>
          <DialogDescription>
            <span className="block font-medium text-foreground">
              {translate(
                'auto.ext.dooray.components.doorayTaskBaseRefDialog.target',
                'Workspace: {{value0}}',
                { value0: request.workspaceLabel }
              )}
            </span>
            {translate(
              'auto.ext.dooray.components.doorayTaskBaseRefDialog.description',
              'The new branch is created from the base you pick. If the branch already exists, it is switched to as-is.'
            )}
          </DialogDescription>
        </DialogHeader>
        <BaseRefPicker
          repoId={request.repoId}
          {...(selected ? { currentBaseRef: selected } : {})}
          onSelect={setPicked}
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={fetchBase} onCheckedChange={(next) => setFetchBase(next === true)} />
          {translate(
            'auto.ext.dooray.components.doorayTaskBaseRefDialog.fetchFirst',
            'Fetch the base branch first (start from the latest tip)'
          )}
        </label>
        {submodules.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              {translate(
                'auto.ext.dooray.components.doorayTaskBaseRefDialog.submodulesLabel',
                'Also switch these submodules'
              )}
            </p>
            {submodules.map((path) => (
              <label key={path} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={checked.has(path)}
                  onCheckedChange={(next) => toggle(path, next === true)}
                />
                <span className="truncate font-mono text-[12px]">{path}</span>
              </label>
            ))}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onSettle('cancel')}>
            {translate('auto.ext.dooray.components.doorayTaskBaseRefDialog.cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onSettle({ baseRef: null, submodulePaths: checkedPaths })}
          >
            {translate(
              'auto.ext.dooray.components.doorayTaskBaseRefDialog.useCurrent',
              'From current branch'
            )}
          </Button>
          <Button
            type="button"
            disabled={!selected}
            onClick={() =>
              selected && onSettle({ baseRef: selected, fetchBase, submodulePaths: checkedPaths })
            }
          >
            {selected
              ? translate(
                  'auto.ext.dooray.components.doorayTaskBaseRefDialog.createFrom',
                  'Create from {{value0}}',
                  { value0: selected }
                )
              : translate(
                  'auto.ext.dooray.components.doorayTaskBaseRefDialog.pickBase',
                  'Pick a base'
                )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
