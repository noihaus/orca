import { homedir } from 'node:os'
import { describe, expect, it, vi } from 'vitest'
import { getDefaultPersistedState } from '../../../shared/constants'
import { normalizeLoadedGlobalSettings } from './normalize-loaded-global-settings'
import { prepareLoadedTerminalSettings } from './prepare-loaded-terminal-settings'
import { prepareLoadedProfileSettings } from './prepare-loaded-profile-settings'
import type { GlobalSettings } from '../../../shared/global-settings-types'
import type { PersistedState } from '../../../shared/persisted-state-types'

// The shipped manifest is empty until an extension lands; exercise seeding with a fixture.
vi.mock('../../../shared/extensions/installed-extension-manifest', () => ({
  INSTALLED_TASK_PROVIDER_EXTENSIONS: [{ id: 'fake', defaultVisible: true, alwaysAvailable: true }],
  INSTALLED_CREDENTIAL_SERVICES: []
}))

function loadProfile(overrides: Partial<GlobalSettings>): {
  settings: GlobalSettings
  markNeedsSave: ReturnType<typeof vi.fn>
} {
  const defaults = getDefaultPersistedState(homedir())
  const parsed: PersistedState = {
    ...defaults,
    settings: {
      ...defaults.settings,
      visibleTaskProvidersDefaultedForJira: true,
      seededExtensionTaskProviders: undefined,
      ...overrides
    }
  }
  const markNeedsSave = vi.fn()
  const terminal = prepareLoadedTerminalSettings(parsed, () => {})
  const profile = prepareLoadedProfileSettings(parsed, defaults, markNeedsSave)
  return { settings: normalizeLoadedGlobalSettings(parsed, terminal, profile), markNeedsSave }
}

describe('extension task provider seeding on load', () => {
  it('prepends a defaultVisible extension provider once and records the seed', () => {
    const { settings, markNeedsSave } = loadProfile({
      visibleTaskProviders: ['github'],
      seededExtensionTaskProviders: []
    })
    expect(settings.visibleTaskProviders).toEqual(['fake', 'github'])
    expect(settings.seededExtensionTaskProviders).toEqual(['fake'])
    expect(markNeedsSave).toHaveBeenCalled()
  })

  it('seeds a legacy profile that predates the seed list', () => {
    const { settings } = loadProfile({
      visibleTaskProviders: ['github', 'jira']
    })
    expect(settings.visibleTaskProviders).toEqual(['fake', 'github', 'jira'])
    expect(settings.seededExtensionTaskProviders).toEqual(['fake'])
  })

  it('does not re-add an extension the user hid after seeding', () => {
    const { settings } = loadProfile({
      visibleTaskProviders: ['github'],
      seededExtensionTaskProviders: ['fake']
    })
    expect(settings.visibleTaskProviders).toEqual(['github'])
    expect(settings.seededExtensionTaskProviders).toEqual(['fake'])
  })

  it('ships fresh profiles with the extension visible and already seeded', () => {
    const defaults = getDefaultPersistedState(homedir())
    expect(defaults.settings.visibleTaskProviders[0]).toBe('fake')
    expect(defaults.settings.seededExtensionTaskProviders).toEqual(['fake'])
  })
})
