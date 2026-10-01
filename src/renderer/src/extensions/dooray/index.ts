import type { RendererExtension } from '../renderer-extension-contract'
import { createDooraySlice } from './dooray-slice'
import { DoorayIntegrationCardSlot, DoorayOnboardingRowSlot } from './dooray-lazy-slots'

export const doorayRendererExtension = {
  id: 'dooray',
  createSlice: createDooraySlice,
  integrationCards: [DoorayIntegrationCardSlot],
  onboardingIntegrationRows: [DoorayOnboardingRowSlot],
  locales: {
    en: () => import('./locales/en.json').then((module) => module.default),
    ko: () => import('./locales/ko.json').then((module) => module.default),
    ja: () => import('./locales/ja.json').then((module) => module.default),
    zh: () => import('./locales/zh.json').then((module) => module.default),
    es: () => import('./locales/es.json').then((module) => module.default),
    fr: () => import('./locales/fr.json').then((module) => module.default)
  }
} as const satisfies RendererExtension
