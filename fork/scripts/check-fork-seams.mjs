// Lists upstream files this branch changed that carry no `fork-seam:` marker (run after an upstream merge).
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')
const base = process.env.FORK_SEAM_BASE ?? 'upstream/main'
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
const existsUpstream = (file) => {
  try {
    execFileSync('git', ['cat-file', '-e', `${base}:${file}`], { cwd: root, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const changed = git('diff', `${base}...HEAD`, '--name-only').split('\n').filter(Boolean)
const upstreamFiles = changed.filter(
  (file) =>
    !file.startsWith('fork/') &&
    !file.startsWith('.superpowers/') &&
    !file.includes('/extensions/') &&
    fs.existsSync(path.join(root, file)) &&
    existsUpstream(file)
)
const unmarked = upstreamFiles.filter(
  (file) =>
    !/(?:\/\/|\/\*)\s*fork-seam:\s*[a-z0-9-]+/.test(fs.readFileSync(path.join(root, file), 'utf8'))
)

console.log(`changed upstream files: ${upstreamFiles.length}, unmarked: ${unmarked.length}`)
for (const file of unmarked) {
  console.log(`UNMARKED ${file}`)
}
process.exit(unmarked.length === 0 ? 0 : 1)
