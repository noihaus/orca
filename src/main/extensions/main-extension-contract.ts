import type { RpcAnyMethodDeclaration } from '../runtime/rpc/core'
import type { RuntimeInstalledCommandSurfaces } from '../runtime/orca-runtime-core'

export type MainExtensionRuntimeCommands = {
  // Every returned command name must start with this prefix.
  prefix: string
  create(runtime: RuntimeInstalledCommandSurfaces): Record<string, (...args: never[]) => unknown>
}

export type MainExtension = {
  id: string
  registerIpcHandlers(): void
  rpcMethods: readonly RpcAnyMethodDeclaration[]
  runtimeCommands?: MainExtensionRuntimeCommands
}
