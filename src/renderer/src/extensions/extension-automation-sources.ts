import { isExtensionTaskProvider } from '../../../shared/extensions/extension-task-sources'
import type { TaskSourceContext } from '../../../shared/task-source-context'
import type { TaskSourceHostAvailability } from '@/components/task-source-context-summary'

export { isExtensionTaskProvider }
export { extensionTaskSourceLabel } from './extension-slot-hooks'

// Automation hosts run only built-in task sources, so a saved extension source always reads as unsupported.
export function extensionSourceHostAvailability(
  sourceContext: TaskSourceContext
): TaskSourceHostAvailability | null {
  return isExtensionTaskProvider(sourceContext.provider)
    ? { hostId: sourceContext.hostId, reason: 'unsupported-provider' }
    : null
}
