// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { useComposerState } from './useComposerState'
import type { LinkedWorkItemSummary } from '@/lib/new-workspace' // fork-seam: linked-work-item-branch

const { branchFixtureExtension } = vi.hoisted(() => ({
  branchFixtureExtension: {
    id: 'fixture',
    resolveLinkedWorkItemBranch: (item: { jiraIdentifier?: string }) =>
      item.jiraIdentifier ? `resolved/${item.jiraIdentifier}` : null
  } as const
}))

vi.mock('@/extensions/installed-renderer-extensions', () => ({
  INSTALLED_RENDERER_EXTENSIONS: [branchFixtureExtension]
}))

let originalApiDescriptor: PropertyDescriptor | undefined

beforeEach(() => {
  originalApiDescriptor = Object.getOwnPropertyDescriptor(window, 'api')
  const ui = {
    onFileDrop: vi.fn<Window['api']['ui']['onFileDrop']>()
  } satisfies Pick<Window['api']['ui'], 'onFileDrop'>
  const preflight = {
    detectAgents: vi.fn<Window['api']['preflight']['detectAgents']>().mockResolvedValue([])
  } satisfies Pick<Window['api']['preflight'], 'detectAgents'>
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { preflight, ui }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  if (originalApiDescriptor) {
    Object.defineProperty(window, 'api', originalApiDescriptor)
  } else {
    Reflect.deleteProperty(window, 'api')
  }
})

describe('useComposerState integrated lifecycle', () => {
  it('composes two live composers and exposes the parent-worktree control state', () => {
    useAppStore.setState({
      repos: [],
      projects: [],
      projectGroups: [],
      projectHostSetups: [],
      newWorkspaceDraft: null,
      worktreesByRepo: {},
      sparsePresetsByRepo: {}
    })
    const unsubscribes: ReturnType<typeof vi.fn>[] = []
    vi.spyOn(window.api.ui, 'onFileDrop').mockImplementation(() => {
      const unsubscribe = vi.fn()
      unsubscribes.push(unsubscribe)
      return unsubscribe
    })

    const first = renderHook(() =>
      useComposerState({ initialName: 'first', persistDraft: false, createGateMode: 'quick' })
    )
    const second = renderHook(() =>
      useComposerState({ initialName: 'second', persistDraft: false, createGateMode: 'quick' })
    )

    expect(first.result.current.cardProps.name).toBe('first')
    expect(second.result.current.cardProps.name).toBe('second')
    expect(first.result.current.cardProps.parentWorktreeId).toBeNull()
    expect(first.result.current.cardProps.onParentWorktreeIdChange).toBeTypeOf('function')
    act(() => first.result.current.cardProps.onParentWorktreeIdChange('repo-1::/parent'))
    expect(first.result.current.cardProps.parentWorktreeId).toBe('repo-1::/parent')
    expect(window.api.ui.onFileDrop).toHaveBeenCalledTimes(2)

    second.unmount()
    first.unmount()
    expect(unsubscribes).toHaveLength(2)
    expect(unsubscribes[0]).toHaveBeenCalledTimes(1)
    expect(unsubscribes[1]).toHaveBeenCalledTimes(1)
  })

  describe('linked work item branch override', () => {
    const baseItem: LinkedWorkItemSummary = {
      provider: 'gitlab',
      type: 'issue',
      number: 7,
      title: 'Task',
      url: 'https://example.test/7'
    }
    const mount = (item: LinkedWorkItemSummary) =>
      renderHook(() =>
        useComposerState({
          initialLinkedWorkItem: item,
          persistDraft: false,
          createGateMode: 'quick'
        })
      )

    it('uses branchNameOverride verbatim, without slugifying', () => {
      const { result } = mount({ ...baseItem, branchNameOverride: 'feature/X/1' })
      expect(result.current.cardProps.branchNameOverride).toBe('feature/X/1')
    })

    it('falls back to the extension resolver when no explicit override is set', () => {
      const { result } = mount({ ...baseItem, jiraIdentifier: 'ABC-1' })
      expect(result.current.cardProps.branchNameOverride).toBe('resolved/ABC-1')
    })

    it('prefers the explicit override over the extension resolver', () => {
      const { result } = mount({
        ...baseItem,
        jiraIdentifier: 'ABC-1',
        branchNameOverride: 'feature/X/1'
      })
      expect(result.current.cardProps.branchNameOverride).toBe('feature/X/1')
    })

    it('clears the override when the linked item is removed', () => {
      const { result } = mount({ ...baseItem, branchNameOverride: 'feature/X/1' })
      act(() => result.current.cardProps.onRemoveLinkedWorkItem())
      expect(result.current.cardProps.branchNameOverride).toBeUndefined()
    })
  })
})
