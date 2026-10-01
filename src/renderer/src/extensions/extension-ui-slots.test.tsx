// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Repo } from '../../../shared/repo-types'
import {
  ExtensionAppSurfaces,
  ExtensionIntegrationCards,
  ExtensionOnboardingIntegrationRows,
  ExtensionRepositorySettingsSections
} from './extension-ui-slots'
import {
  connectedExtensionTaskSourceNames,
  useExtensionTaskSourceFacts,
  useExtensionTaskSourceStatusRefresh
} from './extension-task-source-status'
import type { RendererExtension } from './renderer-extension-contract'
import { deriveIntegrationConnectionStatus } from '@/components/feature-wall/use-integration-connection-status'

const ensureA = vi.fn()
const ensureB = vi.fn()
const taskSource = (
  id: string,
  connected: boolean,
  ready: boolean,
  ensureStatus: () => void
): NonNullable<RendererExtension['taskSource']> => ({
  providerId: id,
  label: () => id,
  Icon: () => null,
  useStatus: () => ({ ready, connected }),
  ensureStatus,
  Panel: () => null,
  navShortcutLabel: () => ''
})
const extA = {
  id: 'a',
  taskSource: taskSource('a', true, true, ensureA),
  integrationCards: [() => <p>card-a</p>],
  onboardingIntegrationRows: [() => <p>row-a</p>],
  repositorySettingsSections: [
    ({ repo, forceVisible }) => (
      <p>
        section-a {repo.id} {String(forceVisible)}
      </p>
    )
  ],
  appSurfaces: [() => <p>surface-a</p>]
} as const satisfies RendererExtension
const extB = {
  id: 'b',
  taskSource: taskSource('b', false, true, ensureB),
  integrationCards: [() => <p>card-b</p>],
  appSurfaces: [() => <p>surface-b</p>]
} as const satisfies RendererExtension
const installed = [extA, extB]
const repo: Repo = { id: 'r1', path: '/r', displayName: 'r', badgeColor: '#000', addedAt: 0 }

function html(node: React.JSX.Element): string {
  const host = document.createElement('div')
  const root = createRoot(host)
  act(() => root.render(node))
  const out = host.innerHTML
  act(() => root.unmount())
  return out
}

describe('extension ui slots', () => {
  it('renders integration cards and onboarding rows in installed order', () => {
    expect(html(<ExtensionIntegrationCards extensions={installed} />)).toBe(
      '<p>card-a</p><p>card-b</p>'
    )
    expect(html(<ExtensionOnboardingIntegrationRows extensions={installed} />)).toBe('<p>row-a</p>')
    expect(html(<ExtensionIntegrationCards extensions={[]} />)).toBe('')
  })

  it('passes repo and forceVisible to repository sections', () => {
    const out = html(
      <ExtensionRepositorySettingsSections
        extensions={installed}
        repo={repo}
        updateRepo={vi.fn()}
        forceVisible
      />
    )
    expect(out).toContain('section-a')
    expect(out).toContain('r1')
    expect(out).toContain('true')
  })

  it('renders app surfaces as siblings in installed order', () => {
    expect(html(<ExtensionAppSurfaces extensions={installed} />)).toBe(
      '<p>surface-a</p><p>surface-b</p>'
    )
    expect(html(<ExtensionAppSurfaces extensions={[]} />)).toBe('')
  })
})

describe('extension task source status', () => {
  it('calls ensureStatus on every installed task source', () => {
    renderHook(() => useExtensionTaskSourceStatusRefresh(installed))
    expect(ensureA).toHaveBeenCalledTimes(1)
    expect(ensureB).toHaveBeenCalledTimes(1)
  })

  it('reports facts and keeps only ready, connected sources', () => {
    const { result } = renderHook(() => useExtensionTaskSourceFacts(installed))
    expect(result.current).toEqual([
      { label: 'a', ready: true, connected: true },
      { label: 'b', ready: true, connected: false }
    ])
    expect(connectedExtensionTaskSourceNames(result.current)).toEqual(['a'])
    expect(connectedExtensionTaskSourceNames(undefined)).toEqual([])
  })
})

describe('extension facts in integration connection status', () => {
  const base: Parameters<typeof deriveIntegrationConnectionStatus>[0] = {
    preflightStatus: null,
    preflightStatusChecked: true,
    preflightStatusContextKey: 'k',
    preflightStatusError: null,
    preflightStatusLoading: false,
    expectedPreflightContextKey: 'k',
    linearStatus: { connected: false },
    linearStatusChecked: true,
    linearStatusContextKey: 'rk',
    jiraStatus: { connected: false },
    jiraStatusChecked: true,
    jiraStatusContextKey: 'rk',
    providerRuntimeContextKey: 'rk'
  }

  it('counts a connected extension as a task source', () => {
    const status = deriveIntegrationConnectionStatus({
      ...base,
      extensionTaskSources: [{ label: 'Ext', ready: true, connected: true }]
    })
    expect(status).toMatchObject({
      trackerConnected: true,
      trackerProviderName: 'Ext',
      taskSourceNames: ['Ext']
    })
  })

  it('ignores unconnected or unready extensions', () => {
    const plain = deriveIntegrationConnectionStatus(base)
    const withExt = deriveIntegrationConnectionStatus({
      ...base,
      extensionTaskSources: [
        { label: 'A', ready: true, connected: false },
        { label: 'B', ready: false, connected: true }
      ]
    })
    expect(withExt).toEqual(plain)
  })
})
