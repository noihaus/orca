import { describe, expect, it } from 'vitest'
import { resolveRightSidebarEffectiveTab } from '@/components/right-sidebar/right-sidebar-effective-tab'
import { firstAutoSelectableRightSidebarTab } from './extension-right-sidebar-fallback'

describe('firstAutoSelectableRightSidebarTab', () => {
  it('skips leading extension tabs', () => {
    expect(firstAutoSelectableRightSidebarTab([{ id: 'ext:fake/tasks' }, { id: 'explorer' }])).toBe(
      'explorer'
    )
  })

  it('falls back to an extension tab only when nothing else is visible', () => {
    expect(firstAutoSelectableRightSidebarTab([{ id: 'ext:fake/tasks' }])).toBe('ext:fake/tasks')
  })

  it('keeps a hidden saved tab falling back to Explorer, not the leading extension tab', () => {
    expect(
      resolveRightSidebarEffectiveTab({
        normalizedActiveTab: 'pr-checks',
        visibleItems: [{ id: 'ext:fake/tasks' }, { id: 'explorer' }, { id: 'vault' }],
        activeFolderWorkspaceKey: null,
        rememberedFolderTab: null
      })
    ).toBe('explorer')
  })

  it('still honours an explicitly selected extension tab', () => {
    expect(
      resolveRightSidebarEffectiveTab({
        normalizedActiveTab: 'ext:fake/tasks',
        visibleItems: [{ id: 'ext:fake/tasks' }, { id: 'explorer' }],
        activeFolderWorkspaceKey: null,
        rememberedFolderTab: null
      })
    ).toBe('ext:fake/tasks')
  })
})
