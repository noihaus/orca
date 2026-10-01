import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { SearchableSetting } from '@/components/settings/SearchableSetting'
import { SettingsSegmentedControl } from '@/components/settings/SettingsFormControls'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'
import { getWorktreeAttachmentLabel } from '@/lib/worktree-attachment-label'
import { useAppStore } from '@/store'
import { findRepoForHost } from '@/store/slices/repo-host-identity'
import type { RepoDoorayStart } from '../../../../../shared/extensions/dooray/dooray-types'
import { getRepoExecutionHostId } from '../../../../../shared/execution-host'
import { isFolderRepo } from '../../../../../shared/repo-kind'
import type { Repo } from '../../../../../shared/repo-types'
import type { Worktree } from '../../../../../shared/worktree/types'
import type { RepositorySettingsSectionProps } from '../../renderer-extension-contract'
import {
  hasRepoDoorayStart,
  readRepoDoorayStart,
  withRepoDoorayStart
} from '../start/dooray-repo-start-settings'
import { readDoorayStartAvailability } from '../start/dooray-start-availability'

const ACTIVE_WORKSPACE_VALUE = '__active__'
const EMPTY_WORKTREES: Worktree[] = []

// Only local git checkouts can list submodules; elsewhere the scope control stays hidden.
function useAvailableSubmodules(repo: Repo): string[] {
  const canList = useAppStore(
    (state) =>
      readDoorayStartAvailability(state, { repoId: repo.id, hostId: getRepoExecutionHostId(repo) })
        .available
  )
  const [submodules, setSubmodules] = useState<string[]>([])
  useEffect(() => {
    const listSubmodules = window.api.dooray?.taskBranch?.listSubmodules
    if (!canList || !listSubmodules) {
      setSubmodules([])
      return
    }
    let cancelled = false
    listSubmodules({ worktreePath: repo.path })
      .then((paths) => {
        if (!cancelled) {
          setSubmodules(paths)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [canList, repo.path])
  return submodules
}

export function DoorayRepositoryStartSection({
  repo,
  updateRepo,
  forceVisible
}: RepositorySettingsSectionProps): React.JSX.Element | null {
  const worktrees = useAppStore((state) => state.worktreesByRepo[repo.id] ?? EMPTY_WORKTREES)
  const availableSubmodules = useAvailableSubmodules(repo)
  if (isFolderRepo(repo)) {
    return null
  }
  const selectableWorktrees = worktrees.filter((worktree) => !worktree.isArchived)
  const current = readRepoDoorayStart(repo)
  const mode = current?.mode ?? 'new-worktree'
  const targetWorktreeId = current?.targetWorktreeId ?? null
  const selectedSubmodulePaths = current?.submodulePaths ?? []
  const save = async (next: RepoDoorayStart): Promise<void> => {
    const result = await updateRepo(repo.id, { extensionSettings: withRepoDoorayStart(repo, next) })
    if (result === false) {
      return
    }
    // Hosts that predate extensionSettings drop the field silently; the echoed repo shows it.
    const saved = findRepoForHost(useAppStore.getState().repos, repo.id, {
      hostId: getRepoExecutionHostId(repo)
    })
    if (!hasRepoDoorayStart(saved)) {
      toast.error(
        translate(
          'auto.ext.dooray.components.settings.RepositoryDoorayStartSection.saveUnsupported',
          "This host's Orca version can't save this setting. Update Orca on the host and try again."
        )
      )
    }
  }
  const applySubmodulePaths = (paths: string[]): void =>
    void save({ mode, targetWorktreeId, submodulePaths: paths })
  const submoduleScope = selectedSubmodulePaths.length > 0 ? 'with-submodules' : 'workspace-only'
  const targetValue =
    targetWorktreeId && selectableWorktrees.some((worktree) => worktree.id === targetWorktreeId)
      ? targetWorktreeId
      : ACTIVE_WORKSPACE_VALUE
  const title = translate(
    'auto.ext.dooray.components.settings.RepositoryDoorayStartSection.title',
    'Dooray Task Start'
  )
  const scopeLabel = translate(
    'auto.ext.dooray.components.settings.RepositoryDoorayStartSection.scopeLabel',
    'Branch scope'
  )
  return (
    <SearchableSetting
      title={title}
      description={translate(
        'auto.ext.dooray.components.settings.RepositoryDoorayStartSection.description',
        'How Start behaves on Dooray tasks for this repository.'
      )}
      keywords={['dooray', 'task', 'start', 'branch', 'worktree', 'workspace', repo.displayName]}
      className="space-y-3"
      forceVisible={forceVisible}
    >
      <div className="min-w-0 space-y-1">
        <div className="text-sm font-semibold">{title}</div>
        <p className="text-xs text-muted-foreground">
          {translate(
            'auto.ext.dooray.components.settings.RepositoryDoorayStartSection.longDescription',
            'Start on a Dooray task can create a new worktree, or check the task branch out in an existing workspace.'
          )}
        </p>
      </div>
      <SettingsSegmentedControl
        value={mode}
        onChange={(next) =>
          void save(
            next === 'new-worktree'
              ? { mode: next, submodulePaths: selectedSubmodulePaths }
              : { mode: next, targetWorktreeId, submodulePaths: selectedSubmodulePaths }
          )
        }
        ariaLabel={translate(
          'auto.ext.dooray.components.settings.RepositoryDoorayStartSection.modeLabel',
          'Dooray task start mode'
        )}
        size="sm"
        options={[
          {
            value: 'new-worktree',
            label: translate(
              'auto.ext.dooray.components.settings.RepositoryDoorayStartSection.newWorktree',
              'New worktree'
            )
          },
          {
            value: 'existing-workspace',
            label: translate(
              'auto.ext.dooray.components.settings.RepositoryDoorayStartSection.existingWorkspace',
              'Existing workspace'
            )
          }
        ]}
      />
      {mode === 'existing-workspace' ? (
        <Select
          value={targetValue}
          onValueChange={(value) =>
            void save({
              mode: 'existing-workspace',
              targetWorktreeId: value === ACTIVE_WORKSPACE_VALUE ? null : value,
              submodulePaths: selectedSubmodulePaths
            })
          }
        >
          <SelectTrigger size="sm" className="w-full max-w-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ACTIVE_WORKSPACE_VALUE}>
              {translate(
                'auto.ext.dooray.components.settings.RepositoryDoorayStartSection.activeWorkspace',
                'Active workspace'
              )}
            </SelectItem>
            {selectableWorktrees.map((worktree) => (
              <SelectItem key={worktree.id} value={worktree.id}>
                {getWorktreeAttachmentLabel(worktree)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {availableSubmodules.length > 0 ? (
        <div className="space-y-2 border-t border-border pt-3">
          <div className="text-xs font-medium text-foreground">{scopeLabel}</div>
          <SettingsSegmentedControl
            value={submoduleScope}
            onChange={(next) =>
              applySubmodulePaths(next === 'workspace-only' ? [] : [...availableSubmodules])
            }
            ariaLabel={scopeLabel}
            size="sm"
            options={[
              {
                value: 'workspace-only',
                label: translate(
                  'auto.ext.dooray.components.settings.RepositoryDoorayStartSection.workspaceOnly',
                  'Workspace only'
                )
              },
              {
                value: 'with-submodules',
                label: translate(
                  'auto.ext.dooray.components.settings.RepositoryDoorayStartSection.withSubmodules',
                  'With submodules'
                )
              }
            ]}
          />
          {submoduleScope === 'with-submodules' && availableSubmodules.length > 1 ? (
            <div className="space-y-1.5 pl-0.5">
              {availableSubmodules.map((path) => (
                <label key={path} className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={selectedSubmodulePaths.includes(path)}
                    onCheckedChange={(next) =>
                      applySubmodulePaths(
                        next === true
                          ? [...selectedSubmodulePaths, path]
                          : selectedSubmodulePaths.filter((entry) => entry !== path)
                      )
                    }
                  />
                  <span className="font-mono">{path}</span>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </SearchableSetting>
  )
}
