import { lazy, Suspense } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type * as InstalledManifest from '../../../shared/extensions/installed-extension-manifest'
import { useAppStore } from '@/store'
import type { AppState } from '@/store/types'
import { normalizeRightSidebarRoute } from '@/store/right-sidebar-route'
import { createWorktreePurgeOmitters } from '@/store/slices/worktrees/teardown/worktree-purge-omitters'
import { getVisibleRightSidebarActivityItems } from '@/components/right-sidebar/right-sidebar-activity-visibility'
import { INSTALLED_RIGHT_SIDEBAR_TAB_KEYS } from '../../../shared/extensions/installed-extension-manifest'
import {
  ExtensionRightSidebarPanel,
  extensionRightSidebarActivityItems,
  extensionRightSidebarTabs
} from './extension-right-sidebar-tabs'
import { INSTALLED_RENDERER_EXTENSIONS } from './installed-renderer-extensions'
import type { RendererExtension } from './renderer-extension-contract'

vi.mock('../../../shared/extensions/installed-extension-manifest', async (importOriginal) => ({
  ...(await importOriginal<typeof InstalledManifest>()),
  INSTALLED_RIGHT_SIDEBAR_TAB_KEYS: ['ext:fake/tasks']
}))

const Icon = (): null => null
const fakeExtension = {
  id: 'fake',
  rightSidebarTabs: [
    {
      id: 'ext:fake/tasks',
      title: () => 'Fake tasks',
      Icon,
      Panel: lazy(async () => ({ default: () => <p>fake panel body</p> }))
    }
  ]
} as const satisfies RendererExtension

describe('extension right sidebar tabs', () => {
  it('maps tabs to activity items with no gitOnly flag, so folder workspaces keep them', () => {
    const items = extensionRightSidebarActivityItems([{ id: 'other' }, fakeExtension])
    expect(items).toEqual([{ id: 'ext:fake/tasks', icon: Icon, title: 'Fake tasks', shortcut: '' }])
    const folder = { isFolder: true, isFolderWorkspace: true, isSshRepo: false }
    expect(getVisibleRightSidebarActivityItems(items, folder)).toEqual(items)
  })

  it('yields nothing for an empty installed list', () => {
    expect(extensionRightSidebarActivityItems([])).toEqual([])
  })

  it('suspends on the lazy panel of the matching tab and renders nothing for an unknown key', () => {
    const render = (key: string): string =>
      renderToStaticMarkup(
        <Suspense fallback="loading">
          <ExtensionRightSidebarPanel tabKey={key} extensions={[fakeExtension]} />
        </Suspense>
      )
    expect(render('ext:fake/tasks')).toBe('loading')
    expect(render('ext:gone/tasks')).toBe('')
  })

  it('keeps installed ext routes and drops uninstalled ones', () => {
    expect(normalizeRightSidebarRoute('ext:fake/tasks').rightSidebarTab).toBe('ext:fake/tasks')
    expect(normalizeRightSidebarRoute('ext:gone/tasks').rightSidebarTab).toBe('explorer')
  })

  it('does not prune an installed extension tab from any workspace kind on purge', () => {
    const state = {
      ...useAppStore.getState(),
      rightSidebarTabByWorktree: {
        'folder:1': 'ext:fake/tasks',
        'git-1': 'ext:fake/tasks',
        old: 'ext:gone/tasks'
      } satisfies AppState['rightSidebarTabByWorktree']
    }
    const doomed = {
      doomedTabIds: new Set<string>(),
      doomedPtyIds: new Set<string>(),
      doomedBrowserWorkspaceIds: new Set<string>(),
      doomedPageIds: new Set<string>(),
      removedFileIds: new Set<string>()
    }
    const { pruneRightSidebarTabByWorktree } = createWorktreePurgeOmitters(state, new Set(), doomed)
    expect(pruneRightSidebarTabByWorktree()).toEqual({
      'folder:1': 'ext:fake/tasks',
      'git-1': 'ext:fake/tasks'
    })
  })
})

describe('shipped extension manifest', () => {
  it('lists exactly the renderer right sidebar tab ids', async () => {
    const actual = await vi.importActual<typeof InstalledManifest>(
      '../../../shared/extensions/installed-extension-manifest'
    )
    const rendererIds = extensionRightSidebarTabs(INSTALLED_RENDERER_EXTENSIONS).map(
      (tab) => tab.id
    )
    expect(rendererIds).toEqual([...actual.INSTALLED_RIGHT_SIDEBAR_TAB_KEYS])
    expect(INSTALLED_RIGHT_SIDEBAR_TAB_KEYS).toEqual(['ext:fake/tasks'])
  })
})
