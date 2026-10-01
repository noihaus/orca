import { useAppStore } from '@/store'
import { readDoorayConnection } from './dooray-store-handle'

export function useDoorayConnectionStatus() {
  const status = useAppStore((state) => state.doorayStatus)
  const checked = useAppStore((state) => state.doorayStatusChecked)
  const contextKey = useAppStore((state) => state.doorayStatusContextKey)
  const settings = useAppStore((state) => state.settings)
  return readDoorayConnection({
    settings,
    doorayStatus: status,
    doorayStatusChecked: checked,
    doorayStatusContextKey: contextKey
  })
}
