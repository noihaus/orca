import type { MainExtension } from '../main-extension-contract'
import { registerDoorayIpcHandlers } from './dooray-ipc'
import { DOORAY_RPC_METHODS } from './dooray-rpc-methods'

export const doorayMainExtension: MainExtension = {
  id: 'dooray',
  registerIpcHandlers: registerDoorayIpcHandlers,
  rpcMethods: DOORAY_RPC_METHODS
}
