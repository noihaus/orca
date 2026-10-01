import { useCallback } from 'react'
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import {
  normalizeVisibleTaskProviders,
  resolveVisibleTaskProvider,
  type TaskProvider
} from '../../../../../shared/task-providers'

const DOORAY_PROVIDER: TaskProvider = 'dooray'

// Same settings update the Tasks page makes for its built-in "Hide <provider>" buttons.
export function useHideDoorayTaskSource(): () => void {
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  return useCallback(() => {
    const remaining = normalizeVisibleTaskProviders(settings?.visibleTaskProviders).filter(
      (provider) => provider !== DOORAY_PROVIDER
    )
    // An empty list normalizes to "all providers", so keep one other source visible.
    const visibleTaskProviders: TaskProvider[] = remaining.length > 0 ? remaining : ['github']
    const defaultTaskSource = resolveVisibleTaskProvider(
      settings?.defaultTaskSource ?? 'github',
      visibleTaskProviders
    )
    void updateSettings({ visibleTaskProviders, defaultTaskSource }).catch(() => {
      toast.error(
        translate('auto.components.TaskPage.e9139db03f', 'Failed to hide {{value0}}.', {
          value0: 'Dooray'
        })
      )
    })
  }, [settings?.defaultTaskSource, settings?.visibleTaskProviders, updateSettings])
}
