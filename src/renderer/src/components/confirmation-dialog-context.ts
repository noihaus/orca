import { createContext, useContext } from 'react'
import type { LucideIcon } from 'lucide-react'

// Keep the context component-free so Fast Refresh preserves its identity.

export type ConfirmationDialogOptions = {
  title: string
  description?: string
  descriptionClassName?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'default' | 'destructive'
  icon?: LucideIcon
  cancelVariant?: 'outline' | 'ghost'
  initialFocus?: 'confirm'
  /** Renders a "Don't ask again" checkbox. `onConfirmed` runs only when the user confirms with it checked. */
  dontAskAgain?: { label?: string; onConfirmed: () => void }
}

// Passing alternateLabel opts a call into the three-way result; plain calls keep Promise<boolean>.
export type ConfirmationDialogAlternateOptions = ConfirmationDialogOptions & {
  // fork-seam: confirmation-alternate-action
  alternateLabel: string
  alternateVariant?: 'outline' | 'secondary' | 'ghost' | 'destructive'
}

export type ConfirmationDialogRequestOptions = ConfirmationDialogOptions &
  Partial<Pick<ConfirmationDialogAlternateOptions, 'alternateLabel' | 'alternateVariant'>>

export type ConfirmationDialogContextValue = {
  (options: ConfirmationDialogAlternateOptions): Promise<boolean | 'alternate'>
  (options: ConfirmationDialogOptions): Promise<boolean>
}

export function createConfirmationDialogRequester(
  enqueue: (options: ConfirmationDialogRequestOptions) => Promise<boolean | 'alternate'>
): ConfirmationDialogContextValue {
  function confirm(options: ConfirmationDialogAlternateOptions): Promise<boolean | 'alternate'>
  function confirm(options: ConfirmationDialogOptions): Promise<boolean>
  function confirm(options: ConfirmationDialogRequestOptions): Promise<boolean | 'alternate'> {
    return enqueue(options)
  }
  return confirm
}

export const ConfirmationDialogContext = createContext<ConfirmationDialogContextValue | null>(null)

export function useConfirmationDialog(): ConfirmationDialogContextValue {
  const confirm = useContext(ConfirmationDialogContext)
  if (!confirm) {
    throw new Error('useConfirmationDialog must be used inside ConfirmationDialogProvider')
  }
  return confirm
}
