import { useSyncExternalStore } from 'react'
import type { StoreApi } from 'zustand'
import type { DoorayStatus } from '../../../../shared/extensions/dooray/dooray-types'
import { getProviderRuntimeContextKey } from '@/lib/provider-runtime-context'
import type { ExtensionStoreState } from '../renderer-extension-contract'

type DoorayStoreView = Pick<
  ExtensionStoreState,
  'settings' | 'doorayStatus' | 'doorayStatusChecked' | 'doorayStatusContextKey'
>

// Bound by the slice so the task-source registration can read status without importing '@/store' (cycle).
let boundStore: Pick<StoreApi<ExtensionStoreState>, 'getState' | 'subscribe'> | null = null

export function bindDoorayStore(
  store: Pick<StoreApi<ExtensionStoreState>, 'getState' | 'subscribe'>
): void {
  boundStore = store
}

// `checking` covers both the first read and a runtime-scope switch that left stale status.
export function readDoorayConnection(state: DoorayStoreView): {
  status: DoorayStatus
  checking: boolean
  connected: boolean
} {
  const contextMatches =
    state.doorayStatusContextKey === getProviderRuntimeContextKey(state.settings)
  return {
    status: state.doorayStatus,
    checking: !contextMatches || !state.doorayStatusChecked,
    connected: contextMatches && state.doorayStatus.connected
  }
}

const noopUnsubscribe = (): void => {}

function subscribeBound(listener: () => void): () => void {
  return boundStore?.subscribe(listener) ?? noopUnsubscribe
}

function readReady(): boolean {
  return boundStore ? !readDoorayConnection(boundStore.getState()).checking : false
}

function readConnected(): boolean {
  return boundStore ? readDoorayConnection(boundStore.getState()).connected : false
}

export function useBoundDoorayTaskSourceStatus(): { ready: boolean; connected: boolean } {
  const ready = useSyncExternalStore(subscribeBound, readReady, readReady)
  const connected = useSyncExternalStore(subscribeBound, readConnected, readConnected)
  return { ready, connected }
}

export function ensureBoundDoorayStatus(): void {
  void boundStore?.getState().checkDoorayConnection()
}
