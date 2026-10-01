type Translate = (key: string, fallback: string) => string

let loadedTranslate: Translate | null = null
let loadStarted = false

// Called once the installed-extension list has finished evaluating (store creation); a static
// i18n import on the registration path re-enters that list mid-evaluation.
export function preloadDoorayTranslator(): void {
  if (loadStarted) {
    return
  }
  loadStarted = true
  import('@/i18n/i18n')
    .then((module) => {
      loadedTranslate = module.translate
    })
    .catch(() => {
      loadStarted = false
    })
}

// For registration-level labels only; components import translate from '@/i18n/i18n' directly.
export function translateDoorayLabel(key: string, fallback: string): string {
  return loadedTranslate ? loadedTranslate(key, fallback) : fallback
}
