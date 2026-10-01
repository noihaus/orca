import { getProviderRuntimeContextKey } from '@/lib/provider-runtime-context'
import { useAppStore } from '@/store'

// `checking` covers both the first read and a runtime-scope switch that left stale status.
export function useDoorayConnectionStatus() {
  const status = useAppStore((state) => state.doorayStatus)
  const checked = useAppStore((state) => state.doorayStatusChecked)
  const contextKey = useAppStore((state) => state.doorayStatusContextKey)
  const settings = useAppStore((state) => state.settings)
  const contextMatches = contextKey === getProviderRuntimeContextKey(settings)
  return {
    status,
    checking: !contextMatches || !checked,
    connected: contextMatches && status.connected
  }
}
