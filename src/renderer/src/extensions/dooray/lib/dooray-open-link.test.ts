import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => {
  const value: {
    activeWorktreeId: string | null
    getKnownWorktreeById: ReturnType<typeof vi.fn>
    createBrowserTab: ReturnType<typeof vi.fn>
  } = { activeWorktreeId: 'wt-1', getKnownWorktreeById: vi.fn(), createBrowserTab: vi.fn() }
  return value
})
vi.mock('@/store', () => ({ useAppStore: { getState: () => state } }))

import { handleDoorayMarkdownLinkClick, openDoorayUrl } from './dooray-open-link'

const openUrl = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  state.activeWorktreeId = 'wt-1'
  state.getKnownWorktreeById.mockReturnValue({ id: 'wt-1' })
  vi.stubGlobal('window', { api: { shell: { openUrl } } })
})

describe('dooray-open-link', () => {
  it('opens an in-app browser tab when a worktree is active', () => {
    openDoorayUrl('https://x.test')
    expect(state.createBrowserTab).toHaveBeenCalledWith('wt-1', 'https://x.test', {
      activate: true
    })
    expect(openUrl).not.toHaveBeenCalled()
  })

  it('falls back to the system browser without a known worktree', () => {
    state.getKnownWorktreeById.mockReturnValue(undefined)
    openDoorayUrl('https://x.test')
    expect(openUrl).toHaveBeenCalledWith('https://x.test')
  })

  it('intercepts http(s) markdown links only', () => {
    const preventDefault = vi.fn()
    handleDoorayMarkdownLinkClick({ preventDefault }, ' https://x.test/a ')
    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(state.createBrowserTab).toHaveBeenCalledWith('wt-1', 'https://x.test/a', {
      activate: true
    })
    handleDoorayMarkdownLinkClick({ preventDefault }, 'mailto:a@b.c')
    handleDoorayMarkdownLinkClick({ preventDefault }, undefined)
    expect(preventDefault).toHaveBeenCalledTimes(1)
  })
})
