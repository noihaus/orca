import { translate } from '@/i18n/i18n'
import type { ConfirmationDialogContextValue } from '@/components/confirmation-dialog-context'
import type { TaskBranchDirtyTarget } from '../../../../../shared/extensions/dooray/task-branch-types'

export type DoorayDirtyResolution = 'stash' | 'discard' | 'cancel'

export type DoorayDirtyPromptArgs = {
  branch: string
  workspaceLabel: string
  dirtyTargets: readonly TaskBranchDirtyTarget[]
}

export type DoorayDirtyPrompt = (args: DoorayDirtyPromptArgs) => Promise<DoorayDirtyResolution>

export function summarizeDoorayDirtyTargets(
  targets: readonly TaskBranchDirtyTarget[],
  workspaceLabel: string
): string {
  return targets
    .map(
      (target) =>
        `${target.submodulePath === '' ? workspaceLabel : target.submodulePath} (${String(target.changeCount)})`
    )
    .join(', ')
}

// Discard is irreversible, so it always takes a second, explicit confirmation.
export function createDoorayDirtyWorkspacePrompt(
  confirm: ConfirmationDialogContextValue
): DoorayDirtyPrompt {
  return async (args) => {
    const summary = summarizeDoorayDirtyTargets(args.dirtyTargets, args.workspaceLabel)
    const choice = await confirm({
      title: translate(
        'auto.ext.dooray.components.useDoorayStartActions.dirtyTitle',
        'Uncommitted changes block switching to {{value0}}',
        { value0: args.branch }
      ),
      description: translate(
        'auto.ext.dooray.components.useDoorayStartActions.dirtyDescriptionKeepsUntracked',
        'Changed: {{value0}}. Stash keeps the work; discard throws away tracked changes. Untracked files are kept either way.',
        { value0: summary }
      ),
      confirmLabel: translate(
        'auto.ext.dooray.components.useDoorayStartActions.stash',
        'Stash and switch'
      ),
      alternateLabel: translate(
        'auto.ext.dooray.components.useDoorayStartActions.discard',
        'Discard and switch'
      ),
      alternateVariant: 'destructive',
      cancelLabel: translate(
        'auto.ext.dooray.components.useDoorayStartActions.keepBranch',
        "Don't switch"
      )
    })
    if (choice === true) {
      return 'stash'
    }
    if (choice !== 'alternate') {
      return 'cancel'
    }
    const confirmedDiscard = await confirm({
      title: translate(
        'auto.ext.dooray.components.useDoorayStartActions.discardConfirmTitle',
        'Discard all uncommitted changes?'
      ),
      description: translate(
        'auto.ext.dooray.components.useDoorayStartActions.discardConfirmDescriptionKeepsUntracked',
        'This permanently discards the tracked changes in {{value0}}. New (untracked) files are kept. It cannot be undone.',
        { value0: summary }
      ),
      confirmLabel: translate(
        'auto.ext.dooray.components.useDoorayStartActions.discardConfirm',
        'Discard permanently'
      ),
      confirmVariant: 'destructive'
    })
    return confirmedDiscard === true ? 'discard' : 'cancel'
  }
}
