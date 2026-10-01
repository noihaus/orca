import { Suspense, useEffect } from 'react'
import {
  registerDoorayBaseRefHost,
  settleDoorayBaseRefRequest,
  useActiveDoorayBaseRefRequest
} from './dooray-task-base-ref-context'
import { deferredLazyComponent } from '../../deferred-lazy-component'

// The dialog body pulls in the store and BaseRefPicker, so it loads only when first asked.
const LazyBaseRefDialog = deferredLazyComponent(() =>
  import('./DoorayTaskBaseRefDialog').then((m) => m.DoorayTaskBaseRefDialog)
)

// App surface: shows the oldest queued base-ref request, one at a time.
export function DoorayTaskBaseRefDialogHost(): React.JSX.Element | null {
  useEffect(() => registerDoorayBaseRefHost(), [])
  const active = useActiveDoorayBaseRefRequest()
  if (!active) {
    return null
  }
  return (
    <Suspense fallback={null}>
      <LazyBaseRefDialog
        key={active.id}
        request={active}
        onSettle={(choice) => settleDoorayBaseRefRequest(active.id, choice)}
      />
    </Suspense>
  )
}
