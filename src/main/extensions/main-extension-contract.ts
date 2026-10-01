import type { RpcAnyMethodDeclaration } from '../runtime/rpc/core'
import type { RuntimeInstalledCommandSurfaces } from '../runtime/orca-runtime-core'
import type { Store } from '../persistence'

export type MainExtensionRuntimeCommands = {
  // Every returned command name must start with this prefix.
  prefix: string
  create(runtime: RuntimeInstalledCommandSurfaces): Record<string, (...args: never[]) => unknown>
}

// Listener args are untrusted renderer input; extensions validate them.
export type MainExtensionIpcListener = (event: unknown, ...args: unknown[]) => unknown

export type MainExtensionIpcContext = {
  store: Store
  // Injected so extension IPC modules never import electron (keeps them off the runtime ratchet).
  handle(channel: string, listener: MainExtensionIpcListener): void
}

export type MainExtension = {
  id: string
  registerIpcHandlers(context: MainExtensionIpcContext): void
  rpcMethods: readonly RpcAnyMethodDeclaration[]
  runtimeCommands?: MainExtensionRuntimeCommands
}
