import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INSTALLED_RUNTIME_NAMESPACE_API_KEYS } from '../shared/extensions/installed-extension-manifest'
import { INSTALLED_PRELOAD_EXTENSIONS } from './extensions/installed-preload-extensions'
import type { PreloadExtension } from './extensions/preload-extension-contract'

const { exposeInMainWorld } = vi.hoisted(() => ({ exposeInMainWorld: vi.fn() }))

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    send: vi.fn(),
    sendSync: vi.fn()
  },
  webFrame: {
    getZoomFactor: vi.fn(() => 1),
    setZoomFactor: vi.fn(),
    setVisualZoomLevelLimits: vi.fn()
  },
  webUtils: { getPathForFile: vi.fn(() => '') }
}))

const installedKeys = INSTALLED_PRELOAD_EXTENSIONS.map(
  (extension: PreloadExtension) => extension.key
)

describe('installed preload extension keys', () => {
  beforeEach(() => {
    vi.resetModules()
    exposeInMainWorld.mockReset()
    Object.defineProperty(process, 'contextIsolated', { configurable: true, value: true })
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      removeEventListener: vi.fn()
    })
    vi.stubGlobal('document', { addEventListener: vi.fn() })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(process, 'contextIsolated')
  })

  it('never reuses a core window.api key', async () => {
    vi.doMock('./extensions/installed-preload-extensions', () => ({
      INSTALLED_PRELOAD_EXTENSIONS: []
    }))
    await import('./index')
    const coreKeys = Object.keys(exposeInMainWorld.mock.calls[0][1])
    expect(coreKeys).toContain('jira')
    expect(installedKeys.filter((key) => coreKeys.includes(key))).toEqual([])
  })

  it('only opts keys into web runtime routing that are installed preload extensions', () => {
    const missing = INSTALLED_RUNTIME_NAMESPACE_API_KEYS.filter(
      (key) => !installedKeys.includes(key)
    )
    expect(missing).toEqual([])
  })
})
