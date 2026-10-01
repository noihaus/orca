import { Suspense, useCallback, useRef, useState, type ReactNode } from 'react'
import {
  getDoorayTaskBaseRefContext,
  type DoorayBaseRefChoice,
  type DoorayBaseRefPrompt,
  type DoorayBaseRefRequest
} from './dooray-task-base-ref-context'
import { deferredLazyComponent } from '../../deferred-lazy-component'

// The dialog body pulls in the store and BaseRefPicker, so it loads only when first asked.
const LazyBaseRefDialog = deferredLazyComponent(() =>
  import('./DoorayTaskBaseRefDialog').then((m) => m.DoorayTaskBaseRefDialog)
)

type QueuedRequest = DoorayBaseRefRequest & {
  id: number
  resolve: (choice: DoorayBaseRefChoice | 'cancel') => void
}

// Requests queue so a second start never steals the open dialog's promise.
export function DoorayTaskBaseRefDialogProvider({
  children
}: {
  children: ReactNode
}): React.JSX.Element {
  const nextIdRef = useRef(0)
  const [queue, setQueue] = useState<QueuedRequest[]>([])
  const prompt = useCallback<DoorayBaseRefPrompt>(
    (request) =>
      new Promise((resolve) => {
        const id = nextIdRef.current
        nextIdRef.current += 1
        setQueue((current) => [...current, { ...request, id, resolve }])
      }),
    []
  )
  const active = queue[0] ?? null
  const settle = useCallback(
    (choice: DoorayBaseRefChoice | 'cancel') => {
      if (!active) {
        return
      }
      active.resolve(choice)
      setQueue((current) => current.filter((entry) => entry.id !== active.id))
    },
    [active]
  )
  const BaseRefContext = getDoorayTaskBaseRefContext()
  return (
    <BaseRefContext.Provider value={prompt}>
      {children}
      {active ? (
        <Suspense fallback={null}>
          <LazyBaseRefDialog key={active.id} request={active} onSettle={settle} />
        </Suspense>
      ) : null}
    </BaseRefContext.Provider>
  )
}
