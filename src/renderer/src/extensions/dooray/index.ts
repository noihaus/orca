import type { ExtensionTaskSource, RendererExtension } from '../renderer-extension-contract'
import { translateDoorayLabel } from './dooray-deferred-translate'
import { createDooraySlice } from './dooray-slice'
import {
  DoorayIntegrationCardSlot,
  DoorayOnboardingRowSlot,
  DoorayTaskSourcePanelSlot
} from './dooray-lazy-slots'
import { ensureBoundDoorayStatus, useBoundDoorayTaskSourceStatus } from './dooray-store-handle'
import { DoorayIcon } from './DoorayIcon'

// Must equal the manifest provider id (installed-extension-manifest.ts).
const doorayTaskSource = {
  providerId: 'dooray',
  label: () => translateDoorayLabel('auto.ext.dooray.components.TaskPage.source_dooray', 'Dooray'),
  Icon: DoorayIcon,
  useStatus: useBoundDoorayTaskSourceStatus,
  ensureStatus: ensureBoundDoorayStatus,
  Panel: DoorayTaskSourcePanelSlot,
  navShortcutLabel: () =>
    translateDoorayLabel(
      'auto.ext.dooray.components.sidebar.SidebarNav.open_dooray_tasks',
      'Open Dooray tasks'
    )
} satisfies ExtensionTaskSource

export const doorayRendererExtension = {
  id: 'dooray',
  createSlice: createDooraySlice,
  taskSource: doorayTaskSource,
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
