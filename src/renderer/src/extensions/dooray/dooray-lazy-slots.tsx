import { Suspense } from 'react'
import { deferredLazyComponent } from '../deferred-lazy-component'
import type {
  RepositorySettingsSectionProps,
  TaskSourcePanelProps
} from '../renderer-extension-contract'

// Lazy so the installed-extension list stays free of eager store-importing components.
const LazyCard = deferredLazyComponent(() =>
  import('./DoorayIntegrationCard').then((m) => m.DoorayIntegrationCard)
)
const LazyRow = deferredLazyComponent(() =>
  import('./DoorayOnboardingRow').then((m) => m.DoorayOnboardingRow)
)

export function DoorayIntegrationCardSlot(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <LazyCard />
    </Suspense>
  )
}

export function DoorayOnboardingRowSlot(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <LazyRow />
    </Suspense>
  )
}

const LazyTaskSourcePanel = deferredLazyComponent(() =>
  import('./tasks/DoorayTaskSourcePanel').then((m) => m.DoorayTaskSourcePanel)
)

export function DoorayTaskSourcePanelSlot(props: TaskSourcePanelProps): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <LazyTaskSourcePanel {...props} />
    </Suspense>
  )
}

// Unwrapped: the right sidebar renders tab panels inside its own Suspense.
export const DoorayRightSidebarTasksPanel = deferredLazyComponent(() =>
  import('./sidebar/DoorayTasksPanel').then((m) => m.DoorayTasksPanel)
)

const LazyRepositoryStartSection = deferredLazyComponent(() =>
  import('./settings/DoorayRepositoryStartSection').then((m) => m.DoorayRepositoryStartSection)
)

export function DoorayRepositoryStartSectionSlot(
  props: RepositorySettingsSectionProps
): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <LazyRepositoryStartSection {...props} />
    </Suspense>
  )
}
