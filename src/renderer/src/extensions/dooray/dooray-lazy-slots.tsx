import { lazy, Suspense } from 'react'

// Lazy so the installed-extension list stays free of eager store-importing components.
const LazyCard = lazy(() =>
  import('./DoorayIntegrationCard').then((m) => ({ default: m.DoorayIntegrationCard }))
)
const LazyRow = lazy(() =>
  import('./DoorayOnboardingRow').then((m) => ({ default: m.DoorayOnboardingRow }))
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

const LazyTaskSourcePanel = lazy(() =>
  import('./tasks/DoorayTaskSourcePanel').then((m) => ({ default: m.DoorayTaskSourcePanel }))
)

export function DoorayTaskSourcePanelSlot(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <LazyTaskSourcePanel />
    </Suspense>
  )
}
