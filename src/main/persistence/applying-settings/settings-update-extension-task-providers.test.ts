import { describe, expect, it, vi } from 'vitest'
import { homedir } from 'node:os'
import { getDefaultPersistedState } from '../../../shared/constants'
import { updateSettings, type SettingsMutationOperations } from './settings-update'

vi.mock('../../../shared/extensions/installed-extension-manifest', () => ({
  INSTALLED_TASK_PROVIDER_EXTENSIONS: [{ id: 'fake', defaultVisible: true, alwaysAvailable: true }],
  INSTALLED_CREDENTIAL_SERVICES: []
}))

function makeOperations(seeded: string[] | undefined): SettingsMutationOperations {
  const defaults = getDefaultPersistedState(homedir())
  return {
    state: {
      ...defaults,
      settings: {
        ...defaults.settings,
        visibleTaskProviders: ['github'],
        defaultTaskSource: 'github',
        seededExtensionTaskProviders: seeded
      }
    },
    bumpLocalWorktreeScanGeneration: vi.fn(),
    removeRetainedBlob: vi.fn(),
    scheduleSave: vi.fn(),
    notifySettingsChanged: vi.fn()
  }
}

describe('updateSettings visibleTaskProviders', () => {
  it('stamps installed defaultVisible extensions as seeded so load never re-adds them', () => {
    const next = updateSettings(makeOperations(undefined), {
      visibleTaskProviders: ['github']
    })
    expect(next.visibleTaskProviders).toEqual(['github'])
    expect(next.seededExtensionTaskProviders).toEqual(['fake'])
  })

  it('keeps previously recorded seeds', () => {
    const next = updateSettings(makeOperations(['gone']), {
      visibleTaskProviders: ['github']
    })
    expect(next.seededExtensionTaskProviders).toEqual(['gone', 'fake'])
  })

  it('leaves the seed list alone when only the default source changes', () => {
    const next = updateSettings(makeOperations(['gone']), { defaultTaskSource: 'github' })
    expect(next.seededExtensionTaskProviders).toEqual(['gone'])
  })
})
