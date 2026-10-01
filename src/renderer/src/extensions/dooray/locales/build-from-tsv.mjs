// Regenerates locales/*.json from the port's i18n table; re-run after editing the TSV.
// Sources: the port table plus port-additions.tsv (strings the port added after the table). Usage: node build-from-tsv.mjs [path/to.tsv]
import fs from 'node:fs'
import path from 'node:path'

const here = import.meta.dirname
const repoRoot = path.resolve(here, '../../../../../..')
const tsvPath = process.argv[2] ?? path.join(repoRoot, 'fork/docs/specs/2026-09-30-dooray-i18n.tsv')
const KEY_PREFIX = 'auto.ext.dooray.'
// Locales without a translated column fall back to English text.
const ENGLISH_FALLBACK_LOCALES = ['ja', 'zh', 'es', 'fr']

function setEntry(catalog, dottedKey, value) {
  const parts = dottedKey.split('.')
  let cursor = catalog
  for (const part of parts.slice(0, -1)) {
    if (typeof cursor[part] !== 'object' || cursor[part] === null) {
      cursor[part] = {}
    }
    cursor = cursor[part]
  }
  cursor[parts.at(-1)] = value
}

function readRows(file) {
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.length > 0)
    .slice(1)
    .map((line) => line.split('\t'))
}

const rows = [...readRows(tsvPath), ...readRows(path.join(here, 'port-additions.tsv'))]

const catalogs = { en: {}, ko: {} }
for (const locale of ENGLISH_FALLBACK_LOCALES) {
  catalogs[locale] = {}
}
const seen = new Set()
for (const [key, en, ko] of rows) {
  if (!key.startsWith('auto.')) {
    throw new Error(`Unexpected key without "auto." prefix: ${key}`)
  }
  const extensionKey = `${KEY_PREFIX}${key.slice('auto.'.length)}`
  if (seen.has(extensionKey)) {
    throw new Error(`Duplicate key: ${extensionKey}`)
  }
  seen.add(extensionKey)
  for (const locale of Object.keys(catalogs)) {
    setEntry(catalogs[locale], extensionKey, locale === 'ko' ? ko : en)
  }
}

for (const [locale, catalog] of Object.entries(catalogs)) {
  fs.writeFileSync(path.join(here, `${locale}.json`), `${JSON.stringify(catalog, null, 2)}\n`)
}
console.log(`Wrote ${seen.size} keys x ${Object.keys(catalogs).length} locales.`)
