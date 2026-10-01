import { describe, expect, it, vi } from 'vitest'
import {
  EXTENSION_TASK_PROVIDER_IDS,
  defaultSeededExtensionTaskProviders,
  extensionTaskProviderAvailability,
  extensionTaskProviderDefaults,
  isExtensionTaskProvider,
  seedExtensionTaskProviders,
  stampSeededExtensionTaskProviders
} from './extension-task-sources'
import {
  TASK_PROVIDERS,
  filterAvailableTaskProviders,
  isTaskProvider,
  normalizeVisibleTaskProviders
} from '../task-providers'
import { isIntegrationCredentialDecryptionError } from '../integration-credential-errors'

// The shipped manifest is empty until an extension lands; exercise the registry with a fixture.
vi.mock('./installed-extension-manifest', () => ({
  INSTALLED_TASK_PROVIDER_EXTENSIONS: [
    { id: 'fake', defaultVisible: true, alwaysAvailable: true },
    { id: 'quiet', defaultVisible: false, alwaysAvailable: false }
  ],
  INSTALLED_CREDENTIAL_SERVICES: ['Fake']
}))

const FIXTURE = [
  { id: 'fake', defaultVisible: true, alwaysAvailable: true },
  { id: 'quiet', defaultVisible: false, alwaysAvailable: false }
]

describe('extension task provider registry', () => {
  it('exposes installed extension ids ahead of the built-in providers', () => {
    expect(EXTENSION_TASK_PROVIDER_IDS).toEqual(['fake', 'quiet'])
    expect(TASK_PROVIDERS).toEqual(['fake', 'quiet', 'github', 'gitlab', 'linear', 'jira'])
    expect(isExtensionTaskProvider('fake')).toBe(true)
    expect(isExtensionTaskProvider('github')).toBe(false)
    expect(isTaskProvider('fake')).toBe(true)
    expect(normalizeVisibleTaskProviders(['fake', 'unknown', 'github'])).toEqual(['fake', 'github'])
  })

  it('reports extension availability and leaves built-ins to their own checks', () => {
    expect(extensionTaskProviderAvailability('fake')).toBe(true)
    expect(extensionTaskProviderAvailability('quiet')).toBe(false)
    expect(extensionTaskProviderAvailability('github')).toBeNull()
  })

  it('alwaysAvailable extension is available while disconnected', () => {
    const providers = ['fake', 'quiet', 'linear'].filter(isTaskProvider)
    expect(
      filterAvailableTaskProviders(providers, {
        gitlabInstalled: false,
        linearConnected: false
      })
    ).toEqual(['fake'])
  })

  it('fills a per-provider record for every installed extension', () => {
    expect(extensionTaskProviderDefaults((id) => [id])).toEqual({
      fake: ['fake'],
      quiet: ['quiet']
    })
  })

  it('detects decryption errors for installed credential services', () => {
    expect(
      isIntegrationCredentialDecryptionError(
        new Error(
          'Could not decrypt saved Fake credential. Approve Keychain access or reconnect Fake.'
        )
      )
    ).toBe(true)
  })
})

describe('seedExtensionTaskProviders', () => {
  it('prepends a defaultVisible extension provider once and records the seed', () => {
    expect(
      seedExtensionTaskProviders(['github'], { seededExtensionTaskProviders: [] }, FIXTURE)
    ).toEqual({
      visibleTaskProviders: ['fake', 'github'],
      seededExtensionTaskProviders: ['fake'],
      changed: true
    })
  })

  it('does not re-add an extension the user hid after seeding', () => {
    expect(
      seedExtensionTaskProviders(['github'], { seededExtensionTaskProviders: ['fake'] }, FIXTURE)
    ).toEqual({
      visibleTaskProviders: ['github'],
      seededExtensionTaskProviders: ['fake'],
      changed: false
    })
  })

  it('records the seed without duplicating an already visible extension', () => {
    expect(seedExtensionTaskProviders(['github', 'fake'], undefined, FIXTURE)).toEqual({
      visibleTaskProviders: ['github', 'fake'],
      seededExtensionTaskProviders: ['fake'],
      changed: true
    })
  })

  it('keeps seeds of uninstalled extensions and drops malformed entries', () => {
    expect(
      seedExtensionTaskProviders(
        ['github'],
        { seededExtensionTaskProviders: ['gone', 7, 'gone', 'fake'] },
        FIXTURE
      )
    ).toEqual({
      visibleTaskProviders: ['github'],
      seededExtensionTaskProviders: ['gone', 'fake'],
      changed: false
    })
  })

  it('defaults a fresh profile to every defaultVisible extension as already seeded', () => {
    expect(defaultSeededExtensionTaskProviders(FIXTURE)).toEqual(['fake'])
    expect(
      stampSeededExtensionTaskProviders({ seededExtensionTaskProviders: ['gone', 'fake'] }, FIXTURE)
    ).toEqual(['gone', 'fake'])
    expect(stampSeededExtensionTaskProviders(undefined, FIXTURE)).toEqual(['fake'])
  })
})
