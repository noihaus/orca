import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { main as auditLocalizationCoverage } from './audit-localization-coverage.mjs'
import { readEnglishCatalogWithExtensions } from './localization-extension-catalogs.mjs'
import { main as verifyLocalizationCatalog } from './verify-localization-catalog.mjs'

const CORE_EN = { auto: { core: { title: 'Title' } } }
const HELLO_SOURCE =
  "import { translate } from '@/i18n/i18n'\nexport const hello = (): string => translate('auto.ext.fake.hello', 'Hello')\n"

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function writeSource(filePath, text) {
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, text, 'utf8')
}

function makeProject({ extensionSource = HELLO_SOURCE, extensionLocales = {}, coreSource } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'orca-localization-extension-'))
  const renderer = path.join(root, 'src', 'renderer', 'src')
  const coreLocales = path.join(renderer, 'i18n', 'locales')
  const extensionDir = path.join(renderer, 'extensions', 'fake')
  writeSource(path.join(root, 'src', 'main', 'empty.ts'), 'export {}\n')
  writeSource(
    path.join(renderer, 'components', 'Core.ts'),
    coreSource ??
      "import { translate } from '@/i18n/i18n'\nexport const title = (): string => translate('auto.core.title', 'Title')\n"
  )
  // Registry files beside extension folders are core code.
  writeSource(path.join(renderer, 'extensions', 'installed.ts'), 'export const list = []\n')
  writeSource(path.join(extensionDir, 'fake.ts'), extensionSource)
  writeJson(path.join(coreLocales, 'en.json'), CORE_EN)
  writeJson(path.join(coreLocales, 'ko.json'), {})
  for (const [locale, catalog] of Object.entries(extensionLocales)) {
    writeJson(path.join(extensionDir, 'locales', `${locale}.json`), catalog)
  }
  return {
    root,
    coreEnPath: path.join(coreLocales, 'en.json'),
    extensionEnPath: path.join(extensionDir, 'locales', 'en.json')
  }
}

describe('localization scripts with renderer extension catalogs', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('accepts extension keys declared in the extension catalog', async () => {
    const { root, coreEnPath } = makeProject({
      extensionLocales: {
        en: { auto: { ext: { fake: { hello: 'Hello' } } } },
        ko: { auto: { ext: { fake: { hello: '안녕하세요' } } } }
      }
    })
    await expect(verifyLocalizationCatalog(root, { fix: false })).resolves.toBe(0)
    expect(readJson(coreEnPath)).toEqual(CORE_EN)
  })

  it('bootstraps missing extension keys into the extension catalog, never core en.json', async () => {
    const { root, coreEnPath, extensionEnPath } = makeProject()
    await expect(verifyLocalizationCatalog(root, { fix: false })).resolves.toBe(1)
    await expect(verifyLocalizationCatalog(root, { fix: true })).resolves.toBe(0)
    expect(readJson(extensionEnPath)).toEqual({ auto: { ext: { fake: { hello: 'Hello' } } } })
    expect(readJson(coreEnPath)).toEqual(CORE_EN)
  })

  it('lets extension code reuse existing core keys', async () => {
    const { root } = makeProject({
      extensionSource:
        "import { translate } from '@/i18n/i18n'\nexport const title = (): string => translate('auto.core.title', 'Title')\n"
    })
    await expect(verifyLocalizationCatalog(root, { fix: false })).resolves.toBe(0)
  })

  it('rejects new extension keys outside the extension namespace, even with --fix', async () => {
    const { root, coreEnPath } = makeProject({
      extensionSource:
        "import { translate } from '@/i18n/i18n'\nexport const x = (): string => translate('auto.fake.hello', 'Hello')\n"
    })
    await expect(verifyLocalizationCatalog(root, { fix: true })).resolves.toBe(1)
    expect(readJson(coreEnPath)).toEqual(CORE_EN)
  })

  it('rejects auto.ext keys referenced from core code', async () => {
    const { root } = makeProject({
      coreSource:
        "import { translate } from '@/i18n/i18n'\nexport const x = (): string => translate('auto.ext.fake.hello', 'Hello')\n",
      extensionLocales: { en: { auto: { ext: { fake: { hello: 'Hello' } } } } }
    })
    await expect(verifyLocalizationCatalog(root, { fix: false })).resolves.toBe(1)
  })

  it('rejects extension catalog entries outside the extension namespace', async () => {
    const { root } = makeProject({
      extensionLocales: { en: { auto: { ext: { fake: { hello: 'Hello' } } }, menu: { x: 'X' } } }
    })
    await expect(verifyLocalizationCatalog(root, { fix: false })).resolves.toBe(1)
  })

  it('applies locale parity checks to extension translations', async () => {
    const { root } = makeProject({
      extensionLocales: {
        en: { auto: { ext: { fake: { hello: 'Hello' } } } },
        ko: { auto: { ext: { fake: { hello: '안녕하세요', stale: '낡음' } } } }
      }
    })
    await expect(verifyLocalizationCatalog(root, { fix: false })).resolves.toBe(1)
  })

  it('counts extension English keys as declared for extraction', async () => {
    const { root } = makeProject({
      extensionLocales: { en: { auto: { ext: { fake: { hello: 'Hello' } } } } }
    })
    await expect(
      readEnglishCatalogWithExtensions(
        root,
        path.join('src', 'renderer', 'src', 'i18n', 'locales', 'en.json')
      )
    ).resolves.toEqual({ auto: { core: { title: 'Title' }, ext: { fake: { hello: 'Hello' } } } })
  })

  it('keeps the coverage audit clean for translated extension code', async () => {
    const { root } = makeProject()
    writeJson(path.join(root, 'allowlist.json'), [])
    await expect(
      auditLocalizationCoverage(root, ['--check', '--allowlist', 'allowlist.json'])
    ).resolves.toBe(0)
  })
})
