import fs from 'node:fs/promises'
import path from 'node:path'

// Renderer extensions own their strings: code under src/renderer/src/extensions/<id>/ keys
// them as auto.ext.<id>.*, declared in that folder's locales/*.json, never in core catalogs.
export const EXTENSIONS_RELATIVE_DIR = path.join('src', 'renderer', 'src', 'extensions')
const EXTENSION_KEY_ROOT = 'auto.ext.'
const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g

export function extensionKeyPrefix(id) {
  return `${EXTENSION_KEY_ROOT}${id}.`
}

// Files directly in extensions/ are the core registry, not an extension.
export function extensionIdForReference(reference) {
  const extensionsPrefix = `${EXTENSIONS_RELATIVE_DIR.split(path.sep).join('/')}/`
  if (!reference.filePath.startsWith(extensionsPrefix)) {
    return null
  }
  const parts = reference.filePath.slice(extensionsPrefix.length).split('/')
  return parts.length > 1 ? parts[0] : null
}

function isCatalog(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function flattenCatalogEntries(value, prefix = '', entries = new Map()) {
  if (!isCatalog(value)) {
    if (prefix) {
      entries.set(prefix, value)
    }
    return entries
  }
  for (const [key, child] of Object.entries(value)) {
    flattenCatalogEntries(child, prefix ? `${prefix}.${key}` : key, entries)
  }
  return entries
}

function setCatalogEntry(catalog, key, value) {
  const parts = key.split('.')
  let cursor = catalog
  for (const part of parts.slice(0, -1)) {
    if (!isCatalog(cursor[part])) {
      cursor[part] = {}
    }
    cursor = cursor[part]
  }
  cursor[parts.at(-1)] = value
}

async function readDirectoryIfExists(directory, options) {
  try {
    return await fs.readdir(directory, options)
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return []
    }
    throw error
  }
}

export async function loadExtensionCatalogs(root) {
  const extensionsDir = path.join(root, EXTENSIONS_RELATIVE_DIR)
  const entries = await readDirectoryIfExists(extensionsDir, { withFileTypes: true })
  const catalogs = []
  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    const localesDir = path.join(extensionsDir, entry.name, 'locales')
    const locales = new Map()
    const fileNames = (await readDirectoryIfExists(localesDir))
      .filter((fileName) => fileName.endsWith('.json') && !fileName.startsWith('.'))
      .sort()
    for (const fileName of fileNames) {
      const catalog = JSON.parse(await fs.readFile(path.join(localesDir, fileName), 'utf8'))
      locales.set(fileName.replace(/\.json$/, ''), catalog)
    }
    catalogs.push({ id: entry.name, localesDir, locales })
  }
  return catalogs.sort((left, right) => left.id.localeCompare(right.id))
}

// Extraction compares against one English catalog; extension English keys count as declared.
export async function readEnglishCatalogWithExtensions(root, coreCatalogPath) {
  const merged = JSON.parse(await fs.readFile(path.join(root, coreCatalogPath), 'utf8'))
  for (const { locales } of await loadExtensionCatalogs(root)) {
    for (const [key, value] of flattenCatalogEntries(locales.get('en') ?? {})) {
      setCatalogEntry(merged, key, value)
    }
  }
  return merged
}

function formatReference(reference) {
  return `${reference.filePath}:${reference.line}:${reference.column} ${reference.key}`
}

function placeholderSignature(value) {
  return [...(value.match(PLACEHOLDER_RE) ?? [])].sort().join('|')
}

function collectInconsistentPlaceholderKeys(references) {
  const signaturesByKey = new Map()
  for (const reference of references) {
    if (typeof reference.fallback !== 'string') {
      continue
    }
    const signatures = signaturesByKey.get(reference.key) ?? new Set()
    signatures.add(placeholderSignature(reference.fallback))
    signaturesByKey.set(reference.key, signatures)
  }
  return [...signaturesByKey].filter(([, signatures]) => signatures.size > 1).map(([key]) => key)
}

function partitionReferences(references, coreKeys) {
  const coreReferences = []
  const ownedById = new Map()
  const misplaced = []
  for (const reference of references) {
    const id = extensionIdForReference(reference)
    if (id !== null && reference.key.startsWith(extensionKeyPrefix(id))) {
      ownedById.set(id, [...(ownedById.get(id) ?? []), reference])
    } else if (
      reference.key.startsWith(EXTENSION_KEY_ROOT) ||
      (id !== null && !coreKeys.has(reference.key))
    ) {
      // Why: a new key from extension code must never be bootstrapped into core en.json.
      misplaced.push({ reference, id })
    } else {
      coreReferences.push(reference)
    }
  }
  return { coreReferences, ownedById, misplaced }
}

async function verifyExtensionCatalog(catalog, references, { fix, verifyLocaleCatalog }) {
  const prefix = extensionKeyPrefix(catalog.id)
  const english = catalog.locales.get('en') ?? {}
  const outsidePrefix = [...flattenCatalogEntries(english).keys()].filter(
    (key) => !key.startsWith(prefix)
  )
  if (outsidePrefix.length > 0) {
    console.error(`Extension "${catalog.id}" en.json declares keys outside ${prefix}*:`)
    console.error(outsidePrefix.slice(0, 20).join('\n'))
    return 1
  }

  const englishKeys = new Set(flattenCatalogEntries(english).keys())
  const missing = references.filter((reference) => !englishKeys.has(reference.key))
  if (missing.length > 0) {
    const withoutFallback = missing.filter((reference) => typeof reference.fallback !== 'string')
    if (!fix || withoutFallback.length > 0) {
      console.error(`Localization keys are missing from ${catalog.id}/locales/en.json.`)
      console.error('')
      console.error((fix ? withoutFallback : missing).map(formatReference).join('\n'))
      console.error('')
      console.error('Run `pnpm run sync:localization-catalog` to add keys with string fallbacks.')
      return 1
    }
    const added = new Set()
    for (const reference of missing) {
      if (!added.has(reference.key)) {
        setCatalogEntry(english, reference.key, reference.fallback)
        added.add(reference.key)
      }
    }
    await fs.mkdir(catalog.localesDir, { recursive: true })
    const englishPath = path.join(catalog.localesDir, 'en.json')
    await fs.writeFile(englishPath, `${JSON.stringify(english, null, 2)}\n`, 'utf8')
    console.log(`Added ${added.size} missing localization key(s) to ${catalog.id}/locales/en.json.`)
  }

  const inconsistent = collectInconsistentPlaceholderKeys(references)
  if (inconsistent.length > 0) {
    console.error(`Extension "${catalog.id}" keys are used with inconsistent placeholders:`)
    console.error(inconsistent.join('\n'))
    return 1
  }

  for (const [localeName, localeCatalog] of catalog.locales) {
    if (localeName === 'en') {
      continue
    }
    console.log(`Extension "${catalog.id}":`)
    const exitCode = verifyLocaleCatalog(english, localeName, localeCatalog)
    if (exitCode !== 0) {
      return exitCode
    }
  }
  return 0
}

/**
 * Checks extension-owned references against their extension catalogs and returns the
 * references the core catalog check still owns. `verifyLocaleCatalog` is the core
 * parity/policy check, injected so extension catalogs follow the same locale rules.
 */
export async function verifyExtensionCatalogs(root, coreCatalog, references, options) {
  const coreKeys = new Set(flattenCatalogEntries(coreCatalog).keys())
  const { coreReferences, ownedById, misplaced } = partitionReferences(references, coreKeys)
  if (misplaced.length > 0) {
    console.error('Extension localization keys must live in their own extension catalog.')
    console.error('')
    for (const { reference, id } of misplaced) {
      const expected = id === null ? 'core keys outside auto.ext.*' : `${extensionKeyPrefix(id)}*`
      console.error(`${formatReference(reference)} (expected ${expected})`)
    }
    return { exitCode: 1, coreReferences }
  }

  for (const catalog of await loadExtensionCatalogs(root)) {
    const exitCode = await verifyExtensionCatalog(catalog, ownedById.get(catalog.id) ?? [], options)
    if (exitCode !== 0) {
      return { exitCode, coreReferences }
    }
  }
  return { exitCode: 0, coreReferences }
}
