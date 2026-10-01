// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import { DoorayTaskBaseRefDialog } from './DoorayTaskBaseRefDialog'

vi.mock('@/components/settings/BaseRefPicker', () => ({
  BaseRefPicker: ({ onSelect }: { onSelect: (ref: string) => void }) => (
    <button type="button" onClick={() => onSelect('origin/develop')}>
      pick-develop
    </button>
  )
}))
const getDefault = vi.hoisted(() => vi.fn())
vi.mock('@/runtime/runtime-repo-client', () => ({ getRuntimeRepoBaseRefDefault: getDefault }))

const listSubmodules = vi.fn()
const onSettle = vi.fn()
const request = {
  branch: 'feature/A/1',
  repoId: 'repo-1',
  worktreePath: '/repo',
  workspaceLabel: 'task-7 · App',
  defaultSubmodulePaths: ['libs/a']
}

function open(): void {
  render(<DoorayTaskBaseRefDialog request={request} onSettle={onSettle} />)
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
  vi.clearAllMocks()
  Object.assign(window, { api: { dooray: { taskBranch: { listSubmodules } } } })
  listSubmodules.mockResolvedValue(['libs/a', 'libs/b'])
  getDefault.mockResolvedValue({ defaultBaseRef: 'origin/main', remoteCount: 1 })
})
afterEach(cleanup)

describe('DoorayTaskBaseRefDialog', () => {
  it('creates from the default base with fetch and the checked submodules', async () => {
    open()
    expect(screen.getByText('Where should feature/A/1 start?')).toBeTruthy()
    // A non-active target must be identifiable before anything switches.
    expect(screen.getByText('Workspace: task-7 · App')).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: 'Create from origin/main' }))
    expect(onSettle).toHaveBeenCalledWith({
      baseRef: 'origin/main',
      fetchBase: true,
      submodulePaths: ['libs/a']
    })
    expect(listSubmodules).toHaveBeenCalledWith({ worktreePath: '/repo' })
  })

  it('"From current branch" sends no base and the newly checked submodules', async () => {
    open()
    fireEvent.click(await screen.findByText('libs/b'))
    fireEvent.click(screen.getByRole('button', { name: 'From current branch' }))
    expect(onSettle).toHaveBeenCalledWith({ baseRef: null, submodulePaths: ['libs/a', 'libs/b'] })
  })

  it('a picked base wins over the default and the fetch toggle is honored', async () => {
    open()
    await screen.findByRole('button', { name: 'Create from origin/main' })
    fireEvent.click(screen.getByRole('button', { name: 'pick-develop' }))
    fireEvent.click(screen.getByText('Fetch the base branch first (start from the latest tip)'))
    fireEvent.click(screen.getByRole('button', { name: 'Create from origin/develop' }))
    expect(onSettle).toHaveBeenCalledWith(
      expect.objectContaining({ baseRef: 'origin/develop', fetchBase: false })
    )
  })

  it('cannot create without a base, and cancel resolves "cancel"', () => {
    getDefault.mockResolvedValue({ defaultBaseRef: null, remoteCount: 0 })
    open()
    expect(screen.getByRole('button', { name: 'Pick a base' }).hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onSettle).toHaveBeenCalledWith('cancel')
  })
})
