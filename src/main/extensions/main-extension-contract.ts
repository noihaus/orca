import type { RpcAnyMethodDeclaration } from '../runtime/rpc/core'
import type { RuntimeInstalledCommandSurfaces } from '../runtime/orca-runtime-core'
import type { Store } from '../persistence'

export type MainExtensionRuntimeCommands = {
  // Every returned command name must start with this prefix.
  prefix: string
  create(runtime: RuntimeInstalledCommandSurfaces): Record<string, (...args: never[]) => unknown>
}

export type MainExtensionIpcContext = { store: Store }

export type MainExtension = {
  id: string
  registerIpcHandlers(context: MainExtensionIpcContext): void
  rpcMethods: readonly RpcAnyMethodDeclaration[]
  runtimeCommands?: MainExtensionRuntimeCommands
}
