// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FEATURE_WALL_WORKFLOWS } from '../../../../shared/feature-wall-workflows'
import { useFeatureWallTaskSourcePresentation } from './use-feature-wall-task-source-presentation'

const fixture = vi.hoisted(() => ({ ensureStatus: vi.fn() }))

vi.mock('@/extensions/installed-renderer-extensions', () => ({
  INSTALLED_RENDERER_EXTENSIONS: [
    {
      id: 'fixture',
      taskSource: {
        providerId: 'fixture',
        label: () => 'Fixture',
        Icon: () => null,
        useStatus: () => ({ ready: true, connected: true }),
        ensureStatus: fixture.ensureStatus,
        Panel: () => null,
        navShortcutLabel: () => ''
      }
    }
  ]
}))

describe('feature wall task source presentation with an extension source', () => {
  it('counts a connected extension and refreshes its status', () => {
    const [workflow] = FEATURE_WALL_WORKFLOWS
    const { result } = renderHook(() => useFeatureWallTaskSourcePresentation(false, workflow))
    expect(result.current.hasConnectedTaskSource).toBe(true)
    expect(result.current.isCheckingTaskSources).toBe(false)
    expect(fixture.ensureStatus).toHaveBeenCalled()
  })
})
