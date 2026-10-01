import type { RuntimeInstalledCommandSurfaces } from '../runtime/orca-runtime-core'
import type { RpcAnyMethodDeclaration } from '../runtime/rpc/core'
import { INSTALLED_MAIN_EXTENSIONS } from './installed-main-extensions'
import type { MainExtension, MainExtensionIpcContext } from './main-extension-contract'

export function registerMainExtensionIpc(
  context: MainExtensionIpcContext,
  extensions: readonly MainExtension[] = INSTALLED_MAIN_EXTENSIONS
): void {
  for (const extension of extensions) {
    // Why: a broken extension must not abort the core IPC registration that follows the seam.
    try {
      extension.registerIpcHandlers(context)
    } catch (error) {
      console.error(`[extensions] "${extension.id}" IPC registration failed`, error)
    }
  }
}

export function getMainExtensionRpcMethods(
  extensions: readonly MainExtension[] = INSTALLED_MAIN_EXTENSIONS
): readonly RpcAnyMethodDeclaration[] {
  return extensions.flatMap((extension) => extension.rpcMethods)
}

export function bindMainExtensionRuntimeCommands(
  runtime: RuntimeInstalledCommandSurfaces,
  reserved: object,
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
      if (name in bound) {
        throw new Error(`Extension "${extension.id}" runtime command "${name}" is already bound`)
      }
      if (name in reserved || name in runtime) {
        throw new Error(
          `Extension "${extension.id}" runtime command "${name}" collides with an existing runtime command`
        )
      }
      bound[name] = command
    }
  }
  return bound
}
