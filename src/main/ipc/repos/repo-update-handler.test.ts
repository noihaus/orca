import { beforeEach, describe, expect, it, vi } from 'vitest'

const { handlers } = vi.hoisted(() => ({
  handlers: new Map<string, (event: unknown, args: unknown) => unknown>()
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (event: unknown, args: unknown) => unknown) => {
      handlers.set(channel, handler)
    }
  }
}))
vi.mock('../../worktree-root-preparation', () => ({ prepareLocalWorktreeRootForRepo: vi.fn() }))
vi.mock('./repos-changed-notification', () => ({ notifyReposChanged: vi.fn() }))

import { registerRepoUpdateHandler } from './repo-update-handler'

describe('repos:update extensionSettings', () => {
  const updateRepo = vi.fn()

  beforeEach(() => {
    handlers.clear()
    updateRepo.mockReset().mockReturnValue({ id: 'r1' })
    // The handler only touches store.updateRepo and the window handle it forwards.
    registerRepoUpdateHandler(
      // @ts-expect-error -- test double for BrowserWindow
      {},
      { updateRepo }
    )
  })

  const call = (updates: Record<string, unknown>) =>
    handlers.get('repos:update')!({}, { repoId: 'r1', updates })

  it('forwards valid settings and null', () => {
    call({ extensionSettings: { fake: { a: 1 } } })
    expect(updateRepo).toHaveBeenLastCalledWith('r1', { extensionSettings: { fake: { a: 1 } } })
    call({ extensionSettings: null })
    expect(updateRepo).toHaveBeenLastCalledWith('r1', { extensionSettings: null })
  })

  it('rejects invalid or oversized settings before touching the store', () => {
    updateRepo.mockClear()
    expect(() => call({ extensionSettings: [] })).toThrow(/plain object/)
    expect(() => call({ extensionSettings: { k: 'x'.repeat(16 * 1024) } })).toThrow(/limit/)
    expect(updateRepo).not.toHaveBeenCalled()
  })
})
