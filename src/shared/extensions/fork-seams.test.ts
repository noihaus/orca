import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { FORK_SEAMS } from './fork-seams'

const REPO_ROOT = path.resolve(__dirname, '../../..')
const SKIPPED_DIRS = new Set(['node_modules', 'out', 'dist'])
const SOURCE_FILE = /\.(ts|tsx|cjs|mjs|js|json)$/
const MARKER = /(?:\/\/|\/\*)\s*fork-seam:\s*([a-z0-9-]+)/g
const SELF_FILE = /fork-seams(\.[a-z-]+)?\.(test\.)?ts$/

function walkSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED_DIRS.has(entry.name)) {
      return []
    }
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return walkSourceFiles(full)
    }
    return SOURCE_FILE.test(entry.name) ? [full] : []
  })
}

function repoRelative(file: string): string {
  return path.relative(REPO_ROOT, file).split(path.sep).join('/')
}

function scanFiles(roots: readonly string[]): { file: string; text: string }[] {
  return roots
    .flatMap((root) => walkSourceFiles(path.join(REPO_ROOT, root)))
    .map((file) => ({ file: repoRelative(file), text: fs.readFileSync(file, 'utf8') }))
    .filter(({ file }) => !SELF_FILE.test(file))
}

const SCANNED = scanFiles(['src', 'config'])

function foundSeams(): string[] {
  return SCANNED.flatMap(({ file, text }) =>
    [...text.matchAll(MARKER)].map((match) => `${match[1]} @ ${file}`)
  )
}

describe('fork seam contract', () => {
  it.each(FORK_SEAMS.map((seam) => [seam.name, seam.file] as const))(
    'seam "%s" keeps its marker in %s',
    (name, file) => {
      const source = SCANNED.find((candidate) => candidate.file === file)
      expect(source, `seam "${name}": file ${file} is missing`).toBeDefined()
      const names = [...(source?.text.matchAll(MARKER) ?? [])].map((match) => match[1])
      expect(
        names,
        `seam "${name}" was dropped from ${file}; re-apply it (see fork/SEAMS.md)`
      ).toContain(name)
    }
  )

  it('FORK_SEAMS lists exactly the markers present in src/ and config/', () => {
    const listed = new Set(FORK_SEAMS.map((seam) => `${seam.name} @ ${seam.file}`))
    const found = new Set(foundSeams())
    expect(
      [...found].filter((entry) => !listed.has(entry)),
      'markers missing from FORK_SEAMS (add them to src/shared/extensions/fork-seams.ts)'
    ).toEqual([])
    expect(
      [...listed].filter((entry) => !found.has(entry)),
      'FORK_SEAMS entries with no marker in the source'
    ).toEqual([])
  })

  it('keeps extension names out of upstream files', () => {
    const offenders = SCANNED.filter(
      ({ file, text }) =>
        file.startsWith('src/') &&
        !file.includes('/extensions/') &&
        !/(^|\/)installed-[^/]*$/.test(file) &&
        /dooray/i.test(text)
    ).map(({ file }) => file)
    expect(offenders, 'extension-specific names leaked outside extensions/ folders').toEqual([])
  })
})
