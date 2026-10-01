import { INSTALLED_RENDERER_EXTENSIONS } from './installed-renderer-extensions'
import type {
  RendererExtension,
  RepositorySettingsSectionProps
} from './renderer-extension-contract'

type SlotHost = { extensions?: readonly RendererExtension[] }

// Keyed by extension id + position within that extension's own list.
function slotEntries<
  K extends
    | 'integrationCards'
    | 'onboardingIntegrationRows'
    | 'repositorySettingsSections'
    | 'appSurfaces'
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

export function ExtensionAppSurfaces({
  extensions = INSTALLED_RENDERER_EXTENSIONS
}: SlotHost): React.JSX.Element {
  return (
    <>
      {slotEntries('appSurfaces', extensions).map(({ key, Component }) => (
        <Component key={key} />
      ))}
    </>
  )
}
