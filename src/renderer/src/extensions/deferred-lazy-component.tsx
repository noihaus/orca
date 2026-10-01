import { createElement, type ComponentType, type LazyExoticComponent } from 'react'
import { lazyWithRetry } from '@/lib/lazy-with-retry'

// Why: lazy() runs on first render, so importing the installed-extension list never calls React.
export function deferredLazyComponent<P extends object>(
  load: () => Promise<ComponentType<P>>,
  reloadKey = 'extension'
): ComponentType<P> {
  let loaded: LazyExoticComponent<ComponentType<P>> | null = null
  const resolveLoaded = (): LazyExoticComponent<ComponentType<P>> => {
    loaded ??= lazyWithRetry(() => load().then((component) => ({ default: component })), {
      reloadKey
    })
    return loaded
  }
  // createElement: the lazy type is memoized above, so its identity is stable across renders.
  return function DeferredLazyComponent(props: P): React.JSX.Element {
    return createElement(resolveLoaded(), props)
  }
}
