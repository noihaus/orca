import { Suspense } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { deferredLazyComponent } from './deferred-lazy-component'

describe('deferredLazyComponent', () => {
  it('does not start loading until first render, then loads once', async () => {
    const load = vi.fn(async () => ({ name }: { name: string }) => <p>hi {name}</p>)
    const Deferred = deferredLazyComponent(load)
    expect(load).not.toHaveBeenCalled()
    const render = (): string =>
      renderToStaticMarkup(
        <Suspense fallback="loading">
          <Deferred name="kim" />
        </Suspense>
      )
    expect(render()).toBe('loading')
    await load.mock.results[0]?.value
    await Promise.resolve()
    expect(render()).toBe('<p>hi kim</p>')
    expect(load).toHaveBeenCalledOnce()
  })
})
