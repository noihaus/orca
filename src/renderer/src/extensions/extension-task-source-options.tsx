import type { JSX } from 'react'
import { Puzzle } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import {
  EXTENSION_TASK_PROVIDER_IDS,
  isExtensionTaskProvider,
  type ExtensionTaskProvider
} from '../../../shared/extensions/extension-task-sources'
import { extensionTaskSourceLabel, findExtensionTaskSource } from './extension-slot-hooks'
import { INSTALLED_RENDERER_EXTENSIONS } from './installed-renderer-extensions'
import type { RendererExtension } from './renderer-extension-contract'

type TaskSourceIcon = (props: { className?: string }) => JSX.Element

export type ExtensionTaskSourceOption = {
  id: ExtensionTaskProvider
  label: string
  Icon: TaskSourceIcon
}

export type ExtensionTaskSourceShortcut = {
  id: ExtensionTaskProvider
  label: string
  Icon: TaskSourceIcon
}

function extensionTaskSourceIcon(
  providerId: string,
  extensions: readonly RendererExtension[]
): TaskSourceIcon {
  const Icon = findExtensionTaskSource(providerId, extensions)?.Icon ?? Puzzle
  return ({ className }) => <Icon className={className} />
}

// Tasks-page tabs for installed extension providers, in manifest order ahead of the built-ins.
export function extensionTaskSourceOptions(
  providers: readonly ExtensionTaskProvider[] = EXTENSION_TASK_PROVIDER_IDS,
  extensions: readonly RendererExtension[] = INSTALLED_RENDERER_EXTENSIONS
): ExtensionTaskSourceOption[] {
  return providers.map((id) => ({
    id,
    label: extensionTaskSourceLabel(id, extensions),
    Icon: extensionTaskSourceIcon(id, extensions)
  }))
}

// Settings card meta; getters keep the label and description following the UI language.
export function extensionTaskProviderSettingsMeta(
  provider: ExtensionTaskProvider,
  extensions: readonly RendererExtension[] = INSTALLED_RENDERER_EXTENSIONS
): { readonly label: string; readonly description: string; Icon: TaskSourceIcon } {
  return {
    get label() {
      return extensionTaskSourceLabel(provider, extensions)
    },
    get description() {
      return translate(
        'auto.components.settings.TaskSourceShowInTasksStep.description',
        'Include this provider in the Tasks source picker and sidebar shortcuts.'
      )
    },
    Icon: extensionTaskSourceIcon(provider, extensions)
  }
}

// Sidebar shortcuts for visible extension providers that registered a renderer task source.
export function visibleExtensionTaskSourceShortcuts(
  visibleProviders: readonly string[],
  extensions: readonly RendererExtension[] = INSTALLED_RENDERER_EXTENSIONS
): ExtensionTaskSourceShortcut[] {
  return visibleProviders.filter(isExtensionTaskProvider).flatMap((id) => {
    const source = findExtensionTaskSource(id, extensions)
    return source
      ? [{ id, label: source.navShortcutLabel(), Icon: extensionTaskSourceIcon(id, extensions) }]
      : []
  })
}
