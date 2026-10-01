import type { LinkedWorkItemSummary } from '@/lib/new-workspace'
import { getUsableLinearBranchName } from '../../../shared/new-workspace/workspace-source'
import { rendererExtensionSlot } from './extension-slot-hooks'
import type { RendererExtension } from './renderer-extension-contract'

// An item's own override wins; otherwise the first extension resolver that returns a name.
export function resolveExtensionLinkedWorkItemBranch(
  item: LinkedWorkItemSummary | null | undefined,
  extensions?: readonly RendererExtension[]
): string | undefined {
  if (!item) {
    return undefined
  }
  const explicit = getUsableLinearBranchName(item.branchNameOverride)
  if (explicit) {
    return explicit
  }
  for (const resolve of rendererExtensionSlot('resolveLinkedWorkItemBranch', extensions)) {
    const resolved = getUsableLinearBranchName(resolve(item))
    if (resolved) {
      return resolved
    }
  }
  return undefined
}
