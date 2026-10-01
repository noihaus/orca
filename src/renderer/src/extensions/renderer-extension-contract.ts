import type { ComponentType, LazyExoticComponent, ReactNode } from 'react'
import type { StateCreator } from 'zustand'
import type { LinkedWorkItemSummary } from '@/lib/new-workspace'
import type { AppState } from '@/store/types'
import type { Repo } from '../../../shared/repo-types'
import type { SupportedUiLocale } from '../../../shared/ui-locale'

type ExtensionIcon = ComponentType<{ className?: string; size?: number }>

export type TaskSourcePanelProps = {
  onStartNewWorkspace(item: LinkedWorkItemSummary, prefilledName: string): void
  startRepo: Repo | null
}

export type RepositorySettingsSectionProps = {
  repo: Repo
  updateRepo: (repoId: string, updates: Partial<Repo>) => void | Promise<boolean>
  forceVisible: boolean
}

export type ExtensionTaskSource = {
  providerId: string
  label: () => string
  Icon: ExtensionIcon
  useStatus(): { ready: boolean; connected: boolean }
  ensureStatus(): void
  Panel: ComponentType<TaskSourcePanelProps>
  navShortcutLabel: () => string
}

export type ExtensionRightSidebarTab = {
  id: string
  title: () => string
  Icon: ExtensionIcon
  Panel: LazyExoticComponent<ComponentType>
}

// Loaders resolve to the nested catalog shape core uses, rooted at `auto.ext.<id>`.
export type ExtensionLocaleLoaders = Partial<
  Record<SupportedUiLocale, () => Promise<Record<string, unknown>>>
>

// An interface, not AppState itself: AppState includes extension slices, and an interface breaks that type cycle.
// oxlint-disable-next-line typescript/consistent-type-definitions -- interface resolution is deferred; a type alias here is circular
export interface ExtensionStoreState extends AppState {}

export type RendererExtension = {
  id: string
  createSlice?: StateCreator<ExtensionStoreState, [], [], object>
  taskSource?: ExtensionTaskSource
  rightSidebarTabs?: readonly ExtensionRightSidebarTab[]
  integrationCards?: readonly ComponentType[]
  repositorySettingsSections?: readonly ComponentType<RepositorySettingsSectionProps>[]
  onboardingIntegrationRows?: readonly ComponentType[]
  appProviders?: readonly ComponentType<{ children: ReactNode }>[]
  resolveLinkedWorkItemBranch?: (item: LinkedWorkItemSummary) => string | null
  locales?: ExtensionLocaleLoaders
}
