import { Suspense, useEffect } from 'react'
import { TaskSourceShowInTasksStep } from '@/components/settings/TaskSourceShowInTasksStep'
import { findExtensionTaskSource } from './extension-slot-hooks'
import { INSTALLED_RENDERER_EXTENSIONS } from './installed-renderer-extensions'
import type {
  ExtensionTaskSource,
  RendererExtension,
  TaskSourcePanelProps
} from './renderer-extension-contract'

type ExtensionTaskSourcePanelProps = TaskSourcePanelProps & {
  providerId: string
  extensions?: readonly RendererExtension[]
}

function MountedTaskSourcePanel({
  source,
  ...panelProps
}: TaskSourcePanelProps & { source: ExtensionTaskSource }): React.JSX.Element {
  useEffect(() => {
    source.ensureStatus()
  }, [source])
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Suspense fallback={null}>
        <source.Panel {...panelProps} />
      </Suspense>
    </div>
  )
}

// The extension panel owns the whole Tasks body, including its own connect CTA.
export function ExtensionTaskSourcePanel({
  providerId,
  extensions = INSTALLED_RENDERER_EXTENSIONS,
  ...panelProps
}: ExtensionTaskSourcePanelProps): React.JSX.Element | null {
  const source = findExtensionTaskSource(providerId, extensions)
  return source ? <MountedTaskSourcePanel key={providerId} source={source} {...panelProps} /> : null
}

// Extensions own their connection UI, so settings only offers the visibility step.
export function ExtensionTaskSourceSetupSteps(props: {
  providerLabel: string
  visible: boolean
  canHide: boolean
  onToggleVisible: () => void
}): React.JSX.Element {
  return (
    <ol className="divide-y divide-border/50">
      <TaskSourceShowInTasksStep index={1} {...props} />
    </ol>
  )
}
