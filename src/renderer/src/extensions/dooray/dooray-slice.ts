import type { StateCreator } from 'zustand'
import type {
  DoorayConnectArgs,
  DoorayConnectResult,
  DoorayStatus
} from '../../../../shared/extensions/dooray/dooray-types'
import { getProviderRuntimeContextKey } from '@/lib/provider-runtime-context'
import type { ExtensionStoreState } from '../renderer-extension-contract'
import { preloadDoorayTranslator, translateDoorayLabel } from './dooray-deferred-translate'
import { bindDoorayStore } from './dooray-store-handle'
import {
  doorayConnect,
  doorayDisconnect,
  doorayStatus,
  doorayTestConnection
} from './runtime-dooray-client'

export type DooraySlice = {
  doorayStatus: DoorayStatus
  doorayStatusChecked: boolean
  doorayStatusContextKey: string | null
  checkDoorayConnection: () => Promise<void>
  connectDooray: (args: DoorayConnectArgs) => Promise<DoorayConnectResult>
  testDoorayConnection: () => Promise<DoorayConnectResult>
  disconnectDooray: () => Promise<void>
}

const DISCONNECTED: DoorayStatus = { connected: false, viewer: null }

// Bumped by every read/mutation so a slower, older response never overwrites a newer one.
let statusReadGeneration = 0
let mutationGeneration = 0

function hasStatusChanged(previous: DoorayStatus, next: DoorayStatus): boolean {
  return (
    previous.connected !== next.connected ||
    previous.viewer?.id !== next.viewer?.id ||
    (previous.connected && next.connected
      ? previous.apiUrl !== next.apiUrl || previous.credentialError !== next.credentialError
      : false)
  )
}

export const createDooraySlice: StateCreator<ExtensionStoreState, [], [], DooraySlice> = (
  set,
  get,
  store
) => {
  bindDoorayStore(store)
  preloadDoorayTranslator()
  const applyStatus = (contextKey: string, status: DoorayStatus): void =>
    set({ doorayStatus: status, doorayStatusChecked: true, doorayStatusContextKey: contextKey })
  const isCurrentContext = (contextKey: string): boolean =>
    getProviderRuntimeContextKey(get().settings) === contextKey

  return {
    doorayStatus: DISCONNECTED,
    doorayStatusChecked: false,
    doorayStatusContextKey: null,

    checkDoorayConnection: async () => {
      const contextKey = getProviderRuntimeContextKey(get().settings)
      const readGeneration = ++statusReadGeneration
      const mutationAtStart = mutationGeneration
      if (get().doorayStatusContextKey !== contextKey) {
        set({ doorayStatusChecked: false })
      }
      const isStale = (): boolean =>
        readGeneration !== statusReadGeneration ||
        mutationAtStart !== mutationGeneration ||
        !isCurrentContext(contextKey)
      let next: DoorayStatus
      try {
        next = await doorayStatus(get().settings)
      } catch {
        // A failed read on a connected profile is treated as loss of the connection view only.
        next = DISCONNECTED
      }
      if (isStale()) {
        return
      }
      if (hasStatusChanged(get().doorayStatus, next) || !get().doorayStatusChecked) {
        applyStatus(contextKey, next)
      } else if (get().doorayStatusContextKey !== contextKey) {
        set({ doorayStatusContextKey: contextKey })
      }
    },

    connectDooray: async (args) => {
      const requestGeneration = ++mutationGeneration
      const contextKey = getProviderRuntimeContextKey(get().settings)
      try {
        const result = await doorayConnect(get().settings, args)
        if (!result.ok) {
          return result
        }
        if (requestGeneration !== mutationGeneration || !isCurrentContext(contextKey)) {
          // Lazy: i18n imports the installed-extension list this slice is registered from.
          const { translate } = await import('@/i18n/i18n')
          return {
            ok: false as const,
            error: translate(
              'auto.ext.dooray.store.connection.superseded',
              'Dooray connection was superseded by a newer request.'
            )
          }
        }
        const status = await doorayStatus(get().settings)
        if (requestGeneration === mutationGeneration && isCurrentContext(contextKey)) {
          applyStatus(contextKey, status)
        }
        return result
      } catch (error) {
        return {
          ok: false as const,
          error:
            error instanceof Error
              ? error.message
              : translateDoorayLabel(
                  'auto.ext.dooray.components.dooray.errors.connection_failed',
                  'Connection failed.'
                )
        }
      }
    },

    testDoorayConnection: async () => {
      const requestGeneration = ++mutationGeneration
      const contextKey = getProviderRuntimeContextKey(get().settings)
      try {
        const result = await doorayTestConnection(get().settings)
        if (requestGeneration !== mutationGeneration || !isCurrentContext(contextKey)) {
          return result
        }
        const status = await doorayStatus(get().settings)
        if (requestGeneration === mutationGeneration && isCurrentContext(contextKey)) {
          applyStatus(contextKey, status)
        }
        return result
      } catch (error) {
        return {
          ok: false as const,
          error:
            error instanceof Error
              ? error.message
              : translateDoorayLabel(
                  'auto.ext.dooray.components.dooray.errors.test_failed',
                  'Test failed.'
                )
        }
      }
    },

    disconnectDooray: async () => {
      const requestGeneration = ++mutationGeneration
      const contextKey = getProviderRuntimeContextKey(get().settings)
      await doorayDisconnect(get().settings)
      if (requestGeneration !== mutationGeneration || !isCurrentContext(contextKey)) {
        return
      }
      const status = await doorayStatus(get().settings)
      if (requestGeneration === mutationGeneration && isCurrentContext(contextKey)) {
        applyStatus(contextKey, status.connected ? status : DISCONNECTED)
      }
    }
  }
}
