import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { getDoorayApi } from './runtime-dooray-client'

// Sole entry point for Dooray UI data access; swap this to re-route to a plugin worker.
export function useDoorayApi() {
  const settings = useAppStore((state) => state.settings)
  return useMemo(() => getDoorayApi(settings), [settings])
}
