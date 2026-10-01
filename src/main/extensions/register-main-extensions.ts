import type { RuntimeInstalledCommandSurfaces } from '../runtime/orca-runtime-core'
import type { RpcAnyMethodDeclaration } from '../runtime/rpc/core'
import { INSTALLED_MAIN_EXTENSIONS } from './installed-main-extensions'
import type { MainExtension } from './main-extension-contract'

export function registerMainExtensionIpc(
  extensions: readonly MainExtension[] = INSTALLED_MAIN_EXTENSIONS
): void {
  for (const extension of extensions) {
    extension.registerIpcHandlers()
  }
}

export function getMainExtensionRpcMethods(
  extensions: readonly MainExtension[] = INSTALLED_MAIN_EXTENSIONS
): readonly RpcAnyMethodDeclaration[] {
  return extensions.flatMap((extension) => extension.rpcMethods)
}

export function bindMainExtensionRuntimeCommands(
  runtime: RuntimeInstalledCommandSurfaces,
  extensions: readonly MainExtension[] = INSTALLED_MAIN_EXTENSIONS
): Record<string, (...args: never[]) => unknown> {
  const bound: Record<string, (...args: never[]) => unknown> = {}
  for (const extension of extensions) {
    const commands = extension.runtimeCommands
    if (!commands) {
      continue
    }
    for (const [name, command] of Object.entries(commands.create(runtime))) {
      if (!name.startsWith(commands.prefix)) {
        throw new Error(
          `Extension "${extension.id}" runtime command "${name}" must start with "${commands.prefix}"`
        )
      }
      bound[name] = command
    }
  }
  return bound
}
