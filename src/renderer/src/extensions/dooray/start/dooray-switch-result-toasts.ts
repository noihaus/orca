import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import type { TaskBranchSwitchResult } from '../../../../../shared/extensions/dooray/task-branch-types'

function targetLabel(submodulePath: string): string {
  return submodulePath === ''
    ? translate(
        'auto.ext.dooray.lib.dooray.start.in.current.workspace.parent_target',
        'workspace root'
      )
    : submodulePath
}

// Created branches that did not start from the chosen base must not read as a plain success.
function reportBaseFallbacks(
  branch: string,
  baseRef: string | null,
  results: readonly TaskBranchSwitchResult[]
): boolean {
  if (!baseRef) {
    return false
  }
  const created = results.flatMap((result) => (result.status === 'created' ? [result] : []))
  const fromHead = created.filter((result) => result.baseFallback === 'head')
  const fromLocal = created.filter((result) => result.fetchFailed && !result.baseFallback)
  if (fromHead.length > 0) {
    toast.warning(
      translate(
        'auto.ext.dooray.lib.dooray.start.in.current.workspace.base_fallback_head',
        'Created {{value0}} from current HEAD because {{value1}} was not found: {{value2}}',
        {
          value0: branch,
          value1: baseRef,
          value2: fromHead.map((result) => targetLabel(result.submodulePath)).join(', ')
        }
      )
    )
  }
  if (fromLocal.length > 0) {
    toast.warning(
      translate(
        'auto.ext.dooray.lib.dooray.start.in.current.workspace.base_fetch_failed',
        'Fetch failed; created {{value0}} from local {{value1}}: {{value2}}',
        {
          value0: branch,
          value1: baseRef,
          value2: fromLocal.map((result) => targetLabel(result.submodulePath)).join(', ')
        }
      )
    )
  }
  return fromHead.length > 0 || fromLocal.length > 0
}

export function reportSwitchResults(
  branch: string,
  baseRef: string | null,
  results: readonly TaskBranchSwitchResult[],
  withSubmodules: boolean
): void {
  const failed = results.flatMap((result) =>
    result.status === 'failed' ? [`${result.submodulePath}: ${result.error}`] : []
  )
  const skipped = results.flatMap((result) =>
    result.status === 'skipped-missing' ? [result.submodulePath] : []
  )
  const fellBack = reportBaseFallbacks(branch, baseRef, results)
  if (failed.length > 0) {
    toast.warning(
      translate(
        'auto.ext.dooray.lib.dooray.start.in.current.workspace.submodules_failed',
        'Switched to {{value0}}, but these submodules did not switch: {{value1}}',
        { value0: branch, value1: failed.join('; ') }
      )
    )
  }
  if (skipped.length > 0) {
    toast.warning(
      translate(
        'auto.ext.dooray.lib.dooray.start.in.current.workspace.skipped',
        'Switched to {{value0}}. Not checked out here: {{value1}}',
        { value0: branch, value1: skipped.join(', ') }
      )
    )
  }
  if (failed.length > 0 || skipped.length > 0 || fellBack) {
    return
  }
  toast.success(
    withSubmodules
      ? translate(
          'auto.ext.dooray.lib.dooray.start.in.current.workspace.switched_with_submodules',
          'Switched to {{value0}} ({{count}} checkouts).',
          { value0: branch, count: results.length }
        )
      : translate(
          'auto.ext.dooray.lib.dooray.start.in.current.workspace.switched',
          'Switched to {{value0}}.',
          { value0: branch }
        )
  )
}
