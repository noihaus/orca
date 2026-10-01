import { isExtensionTabKey } from '../../../shared/extensions/extension-tab-key'

// Extension tabs lead the activity bar but are never the automatic fallback for a hidden tab.
export function firstAutoSelectableRightSidebarTab<T extends string>(
  visibleItems: readonly { id: T }[]
): T {
  return (visibleItems.find((item) => !isExtensionTabKey(item.id)) ?? visibleItems[0]).id
}
