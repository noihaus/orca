import { describe, expect, it } from 'vitest'
import { isExtensionTabKey, isInstalledExtensionTabKey } from './extension-tab-key'

describe('extension right sidebar tab keys', () => {
  it.each(['ext:fake/tasks', 'ext:a-b/p_1'])('accepts well-formed %s', (key) => {
    expect(isExtensionTabKey(key)).toBe(true)
  })

  it.each([
    'ext:fake',
    'ext:fake/',
    'ext:/tasks',
    'ext:a/b/c',
    'plugin:a.b/c',
    'explorer',
    'ext:a b/c'
  ])('rejects malformed %s', (key) => {
    expect(isExtensionTabKey(key)).toBe(false)
  })

  it('treats only listed keys as installed, and nothing in the shipped empty manifest', () => {
    expect(isInstalledExtensionTabKey('ext:fake/tasks', ['ext:fake/tasks'])).toBe(true)
    expect(isInstalledExtensionTabKey('ext:gone/tasks', ['ext:fake/tasks'])).toBe(false)
    expect(isInstalledExtensionTabKey('ext:fake/tasks')).toBe(false)
  })
})
