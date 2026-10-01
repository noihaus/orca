import type { BrowserWindow } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadUpdaterModule, warmUpdaterModule } from './updater-test-module-loader'

const { autoUpdaterMock, moduleFactories, resetUpdaterMocks } = await vi.hoisted(async () =>
  (await import('./updater-test-harness')).createUpdaterMocks()
)

vi.mock('electron', () => moduleFactories.electron())
vi.mock('electron-updater', () => moduleFactories.electronUpdater())
vi.mock('./electron-updater-loader', () => moduleFactories.electronUpdaterLoader())
vi.mock('@electron-toolkit/utils', () => moduleFactories.electronToolkitUtils())
vi.mock('./ipc/pty', () => moduleFactories.ipcPty())
vi.mock('./linux-update-package-type', () => moduleFactories.linuxUpdatePackageType())
vi.mock('./updater-lifecycle-diagnostics', () => moduleFactories.updaterLifecycleDiagnostics())
vi.mock('./updater-changelog', () => moduleFactories.updaterChangelog())
vi.mock('./updater-nudge', () => moduleFactories.updaterNudge())
vi.mock('./update-install-exit-watchdog', () => moduleFactories.updateInstallExitWatchdog())
vi.mock('./updater-prerelease-feed', () => moduleFactories.updaterPrereleaseFeed())
vi.mock('./local-builds/local-build-switch', () => moduleFactories.localBuildSwitch())
vi.mock('./local-builds/local-build-feed-server', () => moduleFactories.localBuildFeedServer())

warmUpdaterModule()

function fakeWindow(send: () => void): BrowserWindow {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the updater only touches webContents.send on the window
  return { webContents: { send } } as unknown as BrowserWindow
}

describe('updater in the fork build', () => {
  const originalFlag = process.env.ORCA_ENABLE_AUTO_UPDATE

  beforeEach(() => {
    resetUpdaterMocks()
  })

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.ORCA_ENABLE_AUTO_UPDATE
    } else {
      process.env.ORCA_ENABLE_AUTO_UPDATE = originalFlag
    }
  })

  it('does not set up the auto updater or schedule checks when disabled', async () => {
    delete process.env.ORCA_ENABLE_AUTO_UPDATE
    const updater = await loadUpdaterModule()
    updater.setupAutoUpdater(fakeWindow(vi.fn()))
    updater.checkForUpdates()
    updater.downloadUpdate()
    updater.quitAndInstall()
    expect(autoUpdaterMock.on).not.toHaveBeenCalled()
    expect(autoUpdaterMock.checkForUpdates).not.toHaveBeenCalled()
    expect(autoUpdaterMock.downloadUpdate).not.toHaveBeenCalled()
    expect(autoUpdaterMock.quitAndInstall).not.toHaveBeenCalled()
    expect(updater.getUpdateStatus()).toMatchObject({ state: 'idle' })
  })

  it('menu check answers not-available instead of hanging', async () => {
    delete process.env.ORCA_ENABLE_AUTO_UPDATE
    const send = vi.fn()
    const updater = await loadUpdaterModule()
    updater.setupAutoUpdater(fakeWindow(send))
    updater.checkForUpdatesFromMenu()
    expect(send).toHaveBeenLastCalledWith('updater:status', {
      state: 'not-available',
      userInitiated: true
    })
    expect(autoUpdaterMock.checkForUpdates).not.toHaveBeenCalled()
  })

  it('ORCA_ENABLE_AUTO_UPDATE=1 restores upstream behavior', async () => {
    process.env.ORCA_ENABLE_AUTO_UPDATE = '1'
    const updater = await loadUpdaterModule()
    updater.setupAutoUpdater(fakeWindow(vi.fn()))
    updater.downloadUpdate()
    expect(autoUpdaterMock.on).toHaveBeenCalled()
  })
})
