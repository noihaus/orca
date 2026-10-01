import type { ReactNode } from 'react'
import { INSTALLED_RENDERER_EXTENSIONS } from './installed-renderer-extensions'
import { rendererExtensionSlot } from './extension-slot-hooks'
import type {
  RendererExtension,
  RepositorySettingsSectionProps
} from './renderer-extension-contract'

type SlotHost = { extensions?: readonly RendererExtension[] }

// Keyed by extension id + position within that extension's own list.
function slotEntries<
  K extends 'integrationCards' | 'onboardingIntegrationRows' | 'repositorySettingsSections'
>(
  slot: K,
  extensions: readonly RendererExtension[]
): { key: string; Component: NonNullable<RendererExtension[K]>[number] }[] {
  return extensions.flatMap((extension) =>
    (extension[slot] ?? []).map((Component, position) => ({
      key: `${extension.id}:${position}`,
      Component
    }))
  )
}

export function ExtensionIntegrationCards({
  extensions = INSTALLED_RENDERER_EXTENSIONS
}: SlotHost): React.JSX.Element {
  return (
    <>
      {slotEntries('integrationCards', extensions).map(({ key, Component }) => (
        <Component key={key} />
      ))}
    </>
  )
}

export function ExtensionOnboardingIntegrationRows({
  extensions = INSTALLED_RENDERER_EXTENSIONS
}: SlotHost): React.JSX.Element {
  return (
    <>
      {slotEntries('onboardingIntegrationRows', extensions).map(({ key, Component }) => (
        <Component key={key} />
      ))}
    </>
  )
}

export function ExtensionRepositorySettingsSections({
  extensions = INSTALLED_RENDERER_EXTENSIONS,
  ...props
}: SlotHost & RepositorySettingsSectionProps): React.JSX.Element {
  return (
    <>
      {slotEntries('repositorySettingsSections', extensions).map(({ key, Component }) => (
        <Component key={key} {...props} />
      ))}
    </>
  )
}

// First installed provider is outermost.
export function ExtensionAppProviders({
  children,
  extensions = INSTALLED_RENDERER_EXTENSIONS
}: SlotHost & { children: ReactNode }): React.JSX.Element {
  const providers = rendererExtensionSlot('appProviders', extensions).flat()
  return (
    <>
      {providers.reduceRight(
        (inner, Provider) => (
          <Provider>{inner}</Provider>
        ),
        children
      )}
    </>
  )
}
