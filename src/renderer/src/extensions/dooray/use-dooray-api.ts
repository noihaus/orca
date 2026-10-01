import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { getDoorayApi } from './runtime-dooray-client'

// Sole entry point for Dooray UI data access; swap this to re-route to a plugin worker.
// Keyed on the runtime target only (all routing reads), so unrelated settings writes never refetch.
export function useDoorayApi() {
  const environmentId = useAppStore((state) => state.settings?.activeRuntimeEnvironmentId ?? null)
  return useMemo(() => getDoorayApi({ activeRuntimeEnvironmentId: environmentId }), [environmentId])
}
