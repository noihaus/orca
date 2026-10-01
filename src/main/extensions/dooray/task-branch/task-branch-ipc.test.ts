import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Store } from '../../../persistence'
import type { Repo } from '../../../../shared/repo-types'

const { handlers } = vi.hoisted(() => ({
  handlers: new Map<string, (event: unknown, input?: unknown) => unknown>()
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (e: unknown, i?: unknown) => unknown) => handlers.set(channel, fn)
  }
}))
vi.mock('../../../ipc/registered-worktree-roots-cache', () => ({
  resolveRegisteredWorktreePath: async (path: string) => {
    if (path.includes('unregistered')) {
      throw new Error('Access denied: unknown repository or worktree path')
    }
    return path
  }
}))

import {
  registerTaskBranchIpcHandlers,
  TASK_BRANCH_FOLDER_ERROR,
  TASK_BRANCH_LOCAL_ONLY_ERROR
} from './task-branch-ipc'

function repo(path: string, overrides: Partial<Repo> = {}): Repo {
  return { id: path, path, displayName: 'r', badgeColor: '', addedAt: 0, ...overrides }
}

function fakeStore(repos: Repo[]): Store {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the handlers only read repos and worktree meta
  return { getRepos: () => repos, getAllWorktreeMeta: () => ({}) } as unknown as Store
}

const invoke = (channel: string, input?: unknown) =>
  Promise.resolve().then(() => handlers.get(channel)?.({}, input))

describe('task-branch IPC', () => {
  let root: string

  beforeEach(() => {
    handlers.clear()
    root = mkdtempSync(join(tmpdir(), 'orca-task-branch-ipc-'))
    const git = (...args: string[]) =>
      execFileSync(
        'git',
        [
          '-c',
          'user.name=T',
          '-c',
          'user.email=t@example.test',
          '-c',
          'commit.gpgSign=false',
          ...args
        ],
        { cwd: root }
      )
    git('init', '--quiet')
    writeFileSync(join(root, 'a.txt'), 'a\n')
    git('add', 'a.txt')
    git('commit', '--quiet', '-m', 'a')
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('registers the five dooray:taskBranch channels', () => {
    registerTaskBranchIpcHandlers(fakeStore([]))
    expect([...handlers.keys()].sort()).toEqual([
      'dooray:taskBranch:discard',
      'dooray:taskBranch:inspect',
      'dooray:taskBranch:listSubmodules',
      'dooray:taskBranch:stash',
      'dooray:taskBranch:switch'
    ])
  })

  it('switches a registered local worktree', async () => {
    registerTaskBranchIpcHandlers(fakeStore([repo(root)]))
    await expect(
      invoke('dooray:taskBranch:switch', { worktreePath: root, branch: 'task/1' })
    ).resolves.toEqual([{ submodulePath: '', status: 'created' }])
  })

  it('rejects SSH worktrees', async () => {
    registerTaskBranchIpcHandlers(fakeStore([repo(root, { connectionId: 'ssh-1' })]))
    await expect(
      invoke('dooray:taskBranch:inspect', { worktreePath: root, connectionId: 'ssh-1' })
    ).rejects.toThrow(TASK_BRANCH_LOCAL_ONLY_ERROR)
    await expect(
      invoke('dooray:taskBranch:switch', { worktreePath: root, branch: 'task/1' })
    ).rejects.toThrow(TASK_BRANCH_LOCAL_ONLY_ERROR)
  })

  it('rejects folder workspaces and unregistered paths', async () => {
    registerTaskBranchIpcHandlers(fakeStore([repo(root, { kind: 'folder' })]))
    await expect(invoke('dooray:taskBranch:discard', { worktreePath: root })).rejects.toThrow(
      TASK_BRANCH_FOLDER_ERROR
    )
    await expect(
      invoke('dooray:taskBranch:discard', { worktreePath: join(root, 'unregistered') })
    ).rejects.toThrow(/Access denied/)
  })

  it('rejects malformed arguments', async () => {
    registerTaskBranchIpcHandlers(fakeStore([repo(root)]))
    await expect(invoke('dooray:taskBranch:stash', { worktreePath: root })).rejects.toThrow(
      /message/
    )
    await expect(
      invoke('dooray:taskBranch:inspect', { worktreePath: root, submodulePaths: [1] })
    ).rejects.toThrow(/submodulePaths/)
    await expect(
      invoke('dooray:taskBranch:inspect', { worktreePath: root, submodulePaths: ['../x'] })
    ).rejects.toThrow(/submodule path/)
    await expect(invoke('dooray:taskBranch:switch', { worktreePath: root })).rejects.toThrow(
      /branch/
    )
  })
})
