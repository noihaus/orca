// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import type { RepositoryPaneRepoUpdate } from '@/components/settings/RepositoryPane'
import type { Repo } from '../../../../../shared/repo-types'
import { DoorayRepositoryStartSection } from './DoorayRepositoryStartSection'

const mocks = vi.hoisted(() => ({ toast: { error: vi.fn() } }))
vi.mock('sonner', () => ({ toast: mocks.toast }))
vi.mock('@/lib/web-client-location', () => ({ isWebClientLocation: () => false }))

const listSubmodules = vi.fn()

function makeRepo(overrides: Partial<Repo> = {}): Repo {
  return {
    id: 'repo-1',
    path: '/repo',
    displayName: 'App',
    badgeColor: '',
    addedAt: 0,
    extensionSettings: { other: { keep: true } },
    ...overrides
  }
}

function seed(repo: Repo): void {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: partial store seed; only the fields the section reads
  useAppStore.setState({
    repos: [repo],
    worktreesByRepo: {},
    settingsSearchQuery: '',
    settings: { ...useAppStore.getState().settings, activeRuntimeEnvironmentId: null }
  } as never)
}

// Simulates the host echoing the repo back; an old host strips extensionSettings.
function hostUpdate(strip: boolean) {
  return vi.fn(async (_repoId: string, updates: RepositoryPaneRepoUpdate) => {
    const saved = makeRepo({
      extensionSettings: strip ? undefined : (updates.extensionSettings ?? undefined)
    })
    seed(saved)
    return true
  })
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
  vi.clearAllMocks()
  Object.assign(window, { api: { dooray: { taskBranch: { listSubmodules } } } })
  listSubmodules.mockResolvedValue([])
})
afterEach(cleanup)

describe('DoorayRepositoryStartSection', () => {
  it('saves the mode under extensionSettings.dooray and keeps other extension keys', async () => {
    const repo = makeRepo()
    seed(repo)
    const updateRepo = hostUpdate(false)
    render(<DoorayRepositoryStartSection repo={repo} updateRepo={updateRepo} forceVisible />)
    fireEvent.click(screen.getByRole('radio', { name: 'Existing workspace' }))
    await waitFor(() => expect(updateRepo).toHaveBeenCalled())
    expect(updateRepo).toHaveBeenCalledWith('repo-1', {
      extensionSettings: {
        other: { keep: true },
        dooray: { mode: 'existing-workspace', targetWorktreeId: null, submodulePaths: [] }
      }
    })
    expect(mocks.toast.error).not.toHaveBeenCalled()
  })

  it('warns when the host silently drops the setting', async () => {
    const repo = makeRepo()
    seed(repo)
    const updateRepo = hostUpdate(true)
    render(<DoorayRepositoryStartSection repo={repo} updateRepo={updateRepo} forceVisible />)
    fireEvent.click(screen.getByRole('radio', { name: 'Existing workspace' }))
    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(expect.stringContaining("can't save"))
    )
  })

  it('shows branch scope only when the repo has submodules', async () => {
    const repo = makeRepo()
    seed(repo)
    const { unmount } = render(
      <DoorayRepositoryStartSection repo={repo} updateRepo={vi.fn()} forceVisible />
    )
    await waitFor(() => expect(listSubmodules).toHaveBeenCalledWith({ worktreePath: '/repo' }))
    expect(screen.getByRole('radio', { name: 'New worktree' })).toBeTruthy()
    expect(screen.queryByRole('radiogroup', { name: 'Branch scope' })).toBeNull()
    unmount()
    listSubmodules.mockResolvedValue(['libs/a', 'libs/b'])
    const updateRepo = hostUpdate(false)
    render(<DoorayRepositoryStartSection repo={repo} updateRepo={updateRepo} forceVisible />)
    fireEvent.click(await screen.findByRole('radio', { name: 'With submodules' }))
    await waitFor(() =>
      expect(updateRepo).toHaveBeenCalledWith('repo-1', {
        extensionSettings: {
          other: { keep: true },
          dooray: {
            mode: 'new-worktree',
            targetWorktreeId: null,
            submodulePaths: ['libs/a', 'libs/b']
          }
        }
      })
    )
  })

  it('renders nothing for folder repos and skips listing for SSH repos', async () => {
    const folder = makeRepo({ kind: 'folder' })
    seed(folder)
    const { container } = render(
      <DoorayRepositoryStartSection repo={folder} updateRepo={vi.fn()} forceVisible />
    )
    expect(container.textContent).toBe('')
    cleanup()
    const ssh = makeRepo({ connectionId: 'ssh-1' })
    seed(ssh)
    render(<DoorayRepositoryStartSection repo={ssh} updateRepo={vi.fn()} forceVisible />)
    expect(screen.getByRole('radio', { name: 'New worktree' })).toBeTruthy()
    expect(listSubmodules).not.toHaveBeenCalled()
  })
})
