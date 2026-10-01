import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  discardTaskBranchTargets,
  inspectTaskBranchTargets,
  listTaskBranchSubmodules,
  stashTaskBranchTargets,
  switchTaskBranchTargets
} from './task-branch-git'

const GIT_TEST_CONFIG = [
  '-c',
  'user.name=Orca Test',
  '-c',
  'user.email=orca@example.test',
  '-c',
  'commit.gpgSign=false',
  '-c',
  'core.hooksPath=.git/no-hooks',
  '-c',
  'protocol.file.allow=always',
  '-c',
  'init.defaultBranch=main'
]

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', [...GIT_TEST_CONFIG, ...args], { cwd, encoding: 'utf8' }).trim()
}

function initRepo(path: string): void {
  mkdirSync(path, { recursive: true })
  git(path, 'init', '--quiet')
  git(path, 'symbolic-ref', 'HEAD', 'refs/heads/main')
  writeFileSync(join(path, 'tracked.txt'), 'base\n')
  git(path, 'add', 'tracked.txt')
  git(path, 'commit', '--quiet', '-m', 'base')
}

type Fixture = { root: string; parent: string; sub: string; subSource: string }

function createFixture(root: string): Fixture {
  const subSource = join(root, 'sub-source')
  const missingSource = join(root, 'missing-source')
  const parent = join(root, 'parent')
  initRepo(subSource)
  initRepo(missingSource)
  initRepo(parent)
  git(parent, 'submodule', 'add', '--quiet', subSource, 'libs/sub')
  git(parent, 'submodule', 'add', '--quiet', missingSource, 'libs/missing')
  git(parent, 'commit', '--quiet', '-m', 'add submodules')
  // Declared in .gitmodules but not checked out — the "uninitialized" shape.
  git(parent, 'submodule', 'deinit', '--quiet', '-f', 'libs/missing')
  // A parent-only base branch one commit ahead of main.
  git(parent, 'checkout', '--quiet', '-b', 'base')
  writeFileSync(join(parent, 'base.txt'), 'base branch\n')
  git(parent, 'add', 'base.txt')
  git(parent, 'commit', '--quiet', '-m', 'base branch')
  git(parent, 'checkout', '--quiet', 'main')
  return { root, parent, sub: join(parent, 'libs/sub'), subSource }
}

let taskBranchCounter = 0
const currentBranch = (cwd: string): string => git(cwd, 'symbolic-ref', '--short', 'HEAD')

describe('task-branch git operations (real git)', () => {
  let fixture: Fixture

  beforeEach(() => {
    fixture = createFixture(mkdtempSync(join(tmpdir(), 'orca-task-branch-')))
  })

  afterEach(() => {
    rmSync(fixture.root, { recursive: true, force: true })
  })

  it('lists submodules declared in .gitmodules', async () => {
    await expect(listTaskBranchSubmodules(fixture.parent)).resolves.toEqual([
      'libs/sub',
      'libs/missing'
    ])
  })

  it('creates the branch from baseRef in the parent and from HEAD where baseRef is absent', async () => {
    const results = await switchTaskBranchTargets({
      worktreePath: fixture.parent,
      submodulePaths: ['libs/sub', 'libs/missing'],
      branch: 'task/123',
      baseRef: 'base'
    })
    expect(results).toEqual([
      { submodulePath: '', status: 'created' },
      { submodulePath: 'libs/sub', status: 'created' },
      { submodulePath: 'libs/missing', status: 'skipped-missing' }
    ])
    expect(currentBranch(fixture.parent)).toBe('task/123')
    expect(git(fixture.parent, 'rev-parse', 'HEAD')).toBe(git(fixture.parent, 'rev-parse', 'base'))
    expect(currentBranch(fixture.sub)).toBe('task/123')
    expect(existsSync(join(fixture.parent, 'libs/missing/.git'))).toBe(false)
  })

  it('reports already-on and switched for existing branches', async () => {
    git(fixture.sub, 'branch', 'task/9')
    git(fixture.parent, 'checkout', '--quiet', '-b', 'task/9')
    const results = await switchTaskBranchTargets({
      worktreePath: fixture.parent,
      submodulePaths: ['libs/sub'],
      branch: 'task/9'
    })
    expect(results).toEqual([
      { submodulePath: '', status: 'already-on' },
      { submodulePath: 'libs/sub', status: 'switched' }
    ])
    expect(currentBranch(fixture.sub)).toBe('task/9')
  })

  it('fetches the base ref when asked and ignores fetch failures', async () => {
    const remote = join(fixture.root, 'remote.git')
    git(fixture.root, 'clone', '--quiet', '--bare', fixture.parent, remote)
    const scratch = join(fixture.root, 'scratch')
    git(fixture.root, 'clone', '--quiet', remote, scratch)
    git(scratch, 'checkout', '--quiet', '-b', 'release')
    writeFileSync(join(scratch, 'release.txt'), 'release\n')
    git(scratch, 'add', 'release.txt')
    git(scratch, 'commit', '--quiet', '-m', 'release')
    git(scratch, 'push', '--quiet', 'origin', 'release')
    git(fixture.parent, 'remote', 'add', 'origin', remote)

    const results = await switchTaskBranchTargets({
      worktreePath: fixture.parent,
      submodulePaths: ['libs/sub'],
      branch: 'task/fetch',
      baseRef: 'origin/release',
      fetchBase: true
    })
    // The submodule has no "origin/release": its fetch fails silently and it starts from HEAD.
    expect(results.map((result) => result.status)).toEqual(['created', 'created'])
    expect(git(fixture.parent, 'rev-parse', 'HEAD')).toBe(git(scratch, 'rev-parse', 'HEAD'))
  })

  it('never fetches a refspec-like base branch or an unconfigured remote', async () => {
    const remote = join(fixture.root, 'remote.git')
    git(fixture.root, 'clone', '--quiet', '--bare', fixture.parent, remote)
    git(remote, 'branch', 'feature', 'base')
    git(fixture.parent, 'remote', 'add', 'origin', remote)
    // A path-shaped "remote" git would happily fetch from if it were passed through.
    git(fixture.parent, 'clone', '--quiet', '--bare', remote, 'rogue')
    const mainBefore = git(fixture.parent, 'rev-parse', 'refs/heads/main')

    for (const baseRef of ['origin/+feature:refs/heads/main', 'rogue/feature', 'origin/feat ure']) {
      const results = await switchTaskBranchTargets({
        worktreePath: fixture.parent,
        branch: `task/${taskBranchCounter++}`,
        baseRef,
        fetchBase: true
      })
      expect(results).toEqual([{ submodulePath: '', status: 'created' }])
      git(fixture.parent, 'checkout', '--quiet', 'main')
    }
    expect(git(fixture.parent, 'rev-parse', 'refs/heads/main')).toBe(mainBefore)
    expect(git(fixture.parent, 'for-each-ref', 'refs/remotes')).toBe('')
    expect(existsSync(join(fixture.parent, '.git/FETCH_HEAD'))).toBe(false)
  })

  it('does not recurse into unselected submodules when submodule.recurse=true', async () => {
    git(fixture.parent, 'config', 'submodule.recurse', 'true')
    writeFileSync(join(fixture.sub, 'tracked.txt'), 'sub change\n')
    writeFileSync(join(fixture.parent, 'tracked.txt'), 'parent change\n')
    await discardTaskBranchTargets({ worktreePath: fixture.parent })
    expect(readFileSync(join(fixture.parent, 'tracked.txt'), 'utf8')).toBe('base\n')
    expect(readFileSync(join(fixture.sub, 'tracked.txt'), 'utf8')).toBe('sub change\n')

    // Moving the parent to a commit with a different gitlink would otherwise update the submodule.
    git(fixture.sub, 'stash', '--quiet')
    writeFileSync(join(fixture.sub, 'next.txt'), 'next\n')
    git(fixture.sub, 'add', 'next.txt')
    git(fixture.sub, 'commit', '--quiet', '-m', 'next')
    git(fixture.parent, 'checkout', '--quiet', '-b', 'moved')
    git(fixture.parent, 'add', 'libs/sub')
    git(fixture.parent, 'commit', '--quiet', '-m', 'bump sub')
    git(fixture.parent, 'checkout', '--quiet', 'main')
    git(fixture.sub, 'checkout', '--quiet', 'main')
    git(fixture.sub, 'stash', 'pop', '--quiet')
    const results = await switchTaskBranchTargets({ worktreePath: fixture.parent, branch: 'moved' })
    expect(results).toEqual([{ submodulePath: '', status: 'switched' }])
    expect(currentBranch(fixture.sub)).toBe('main')
    expect(readFileSync(join(fixture.sub, 'tracked.txt'), 'utf8')).toBe('sub change\n')
  })

  it('stops before touching submodules when the parent cannot switch', async () => {
    git(fixture.parent, 'branch', 'task/conflict', 'base')
    git(fixture.sub, 'branch', 'task/conflict')
    // An untracked file the target branch tracks makes the parent checkout fail.
    writeFileSync(join(fixture.parent, 'base.txt'), 'local\n')
    await expect(
      switchTaskBranchTargets({
        worktreePath: fixture.parent,
        submodulePaths: ['libs/sub'],
        branch: 'task/conflict'
      })
    ).rejects.toThrow(/workspace/)
    expect(currentBranch(fixture.parent)).toBe('main')
    expect(currentBranch(fixture.sub)).toBe('main')
  })

  it('reports a failed submodule and keeps switching the others', async () => {
    git(fixture.sub, 'branch', 'task/sub-conflict')
    git(fixture.sub, 'checkout', '--quiet', 'task/sub-conflict')
    writeFileSync(join(fixture.sub, 'other.txt'), 'other\n')
    git(fixture.sub, 'add', 'other.txt')
    git(fixture.sub, 'commit', '--quiet', '-m', 'other')
    git(fixture.sub, 'checkout', '--quiet', 'main')
    writeFileSync(join(fixture.sub, 'other.txt'), 'untracked\n')
    const partial = await switchTaskBranchTargets({
      worktreePath: fixture.parent,
      submodulePaths: ['libs/sub'],
      branch: 'task/sub-conflict'
    })
    expect(partial[0]).toEqual({ submodulePath: '', status: 'created' })
    expect(partial[1]).toMatchObject({ submodulePath: 'libs/sub', status: 'failed' })
    expect(currentBranch(fixture.sub)).toBe('main')
  })

  it('inspects tracked changes only, ignoring parent submodule rows when submodules are included', async () => {
    writeFileSync(join(fixture.parent, 'tracked.txt'), 'changed\n')
    writeFileSync(join(fixture.parent, 'untracked.txt'), 'new\n')
    writeFileSync(join(fixture.sub, 'tracked.txt'), 'changed\n')
    await expect(
      inspectTaskBranchTargets({ worktreePath: fixture.parent, submodulePaths: ['libs/sub'] })
    ).resolves.toEqual([
      { submodulePath: '', changeCount: 1 },
      { submodulePath: 'libs/sub', changeCount: 1 }
    ])
    // Without submodules the parent also counts the modified submodule row.
    await expect(inspectTaskBranchTargets({ worktreePath: fixture.parent })).resolves.toEqual([
      { submodulePath: '', changeCount: 2 }
    ])
  })

  it('stashes only dirty targets with the given message', async () => {
    writeFileSync(join(fixture.sub, 'tracked.txt'), 'changed\n')
    await stashTaskBranchTargets({
      worktreePath: fixture.parent,
      submodulePaths: ['libs/sub', 'libs/missing'],
      message: 'orca task stash'
    })
    expect(git(fixture.sub, 'stash', 'list')).toContain('orca task stash')
    expect(git(fixture.parent, 'stash', 'list')).toBe('')
    expect(readFileSync(join(fixture.sub, 'tracked.txt'), 'utf8')).toBe('base\n')
  })

  it('discards tracked changes but keeps untracked files', async () => {
    writeFileSync(join(fixture.parent, 'tracked.txt'), 'changed\n')
    writeFileSync(join(fixture.parent, 'untracked.txt'), 'keep\n')
    writeFileSync(join(fixture.sub, 'tracked.txt'), 'changed\n')
    writeFileSync(join(fixture.sub, 'untracked.txt'), 'keep\n')
    await discardTaskBranchTargets({ worktreePath: fixture.parent, submodulePaths: ['libs/sub'] })
    expect(readFileSync(join(fixture.parent, 'tracked.txt'), 'utf8')).toBe('base\n')
    expect(readFileSync(join(fixture.sub, 'tracked.txt'), 'utf8')).toBe('base\n')
    expect(readFileSync(join(fixture.parent, 'untracked.txt'), 'utf8')).toBe('keep\n')
    expect(readFileSync(join(fixture.sub, 'untracked.txt'), 'utf8')).toBe('keep\n')
  })

  it.each([
    ['../escape'],
    ['libs/../libs/sub'],
    ['/abs/path'],
    ['C:\\abs'],
    ['libs\\sub'],
    ['-x'],
    ['libs/undeclared']
  ])('rejects submodule path %s', async (submodulePath) => {
    await expect(
      inspectTaskBranchTargets({ worktreePath: fixture.parent, submodulePaths: [submodulePath] })
    ).rejects.toThrow(/submodule path/)
  })

  it('rejects option-like or unresolvable inputs before running checkout', async () => {
    await expect(
      switchTaskBranchTargets({ worktreePath: fixture.parent, branch: '-b' })
    ).rejects.toThrow('invalid_branch_name')
    await expect(
      switchTaskBranchTargets({ worktreePath: fixture.parent, branch: 'task/x', baseRef: '-x' })
    ).rejects.toThrow(/base ref/)
    expect(currentBranch(fixture.parent)).toBe('main')
  })
})
