import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

// Why: lazy() runs on first render, so importing the installed-extension list never calls React.
export function deferredLazyComponent<P extends object>(
  load: () => Promise<ComponentType<P>>
): ComponentType<P> {
  let Loaded: LazyExoticComponent<ComponentType<P>> | null = null
  function DeferredLazyComponent(props: P): React.JSX.Element {
    Loaded ??= lazy(() => load().then((component) => ({ default: component })))
    const Component = Loaded
    return <Component {...props} />
  }
  return DeferredLazyComponent
}
