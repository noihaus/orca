import { useId, useLayoutEffect, useState } from 'react'
import { LoaderCircle, Lock } from 'lucide-react'
import { useAppStore } from '@/store'
import { useMountedRef } from '@/hooks/useMountedRef'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { hasRemoteProviderRuntime } from '@/lib/provider-runtime-context'
import { translate } from '@/i18n/i18n'
import { translateDoorayError } from './lib/dooray-error-messages'

type DoorayConnectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnected?: () => void
}

type ConnectState = 'idle' | 'connecting' | 'error'

export function DoorayConnectDialog({
  open,
  onOpenChange,
  onConnected
}: DoorayConnectDialogProps): React.JSX.Element {
  const connectDooray = useAppStore((s) => s.connectDooray)
  const settings = useAppStore((s) => s.settings)
  const mountedRef = useMountedRef()
  const tokenId = useId()
  const apiUrlId = useId()
  const webUrlId = useId()
  const errorId = useId()

  const [apiToken, setApiToken] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const [webUrl, setWebUrl] = useState('')
  const [connectState, setConnectState] = useState<ConnectState>('idle')
  const [connectError, setConnectError] = useState<string | null>(null)

  // Layout effect so a previously typed token never paints on reopen.
  useLayoutEffect(() => {
    if (!open) {
      return
    }
    setApiToken('')
    setApiUrl('')
    setWebUrl('')
    setConnectState('idle')
    setConnectError(null)
  }, [open])

  const connecting = connectState === 'connecting'
  const canSubmit = Boolean(apiToken.trim()) && !connecting
  const credentialStorageCopy = hasRemoteProviderRuntime(settings)
    ? translate(
        'auto.ext.dooray.components.dooray.connect.dialog.credential_remote',
        'Your token is sent to the selected remote runtime and stored there with runtime-supported encryption.'
      )
    : translate(
        'auto.ext.dooray.components.dooray.connect.dialog.credential_local',
        'Your token is stored locally and encrypted when local runtime storage supports it.'
      )

  const clearErrorOnEdit = (): void => {
    if (connectState === 'error') {
      setConnectState('idle')
      setConnectError(null)
    }
  }

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!connecting) {
      onOpenChange(nextOpen)
    }
  }

  const handleConnect = async (): Promise<void> => {
    const trimmedToken = apiToken.trim()
    if (!trimmedToken || connecting) {
      return
    }
    setConnectState('connecting')
    setConnectError(null)
    try {
      const result = await connectDooray({
        apiToken: trimmedToken,
        apiUrl: apiUrl.trim() || undefined,
        webUrl: webUrl.trim() || undefined
      })
      if (!mountedRef.current) {
        return
      }
      if (result.ok) {
        setApiToken('')
        setApiUrl('')
        setWebUrl('')
        setConnectState('idle')
        onOpenChange(false)
        onConnected?.()
        return
      }
      setConnectState('error')
      setConnectError(translateDoorayError(result.error))
    } catch (error) {
      if (mountedRef.current) {
        setConnectState('error')
        setConnectError(
          error instanceof Error ? translateDoorayError(error.message) : 'Connection failed'
        )
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent overlayClassName="z-[110]" className="z-[120] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {translate('auto.ext.dooray.components.dooray.connect.dialog.title', 'Connect Dooray')}
          </DialogTitle>
          <DialogDescription>
            {translate(
              'auto.ext.dooray.components.dooray.connect.dialog.description',
              'Use a Dooray personal API token to browse tasks. Create one in Dooray under Settings → API.'
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void handleConnect()
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              <Label htmlFor={tokenId}>
                {translate(
                  'auto.ext.dooray.components.dooray.connect.dialog.token_label',
                  'API token'
                )}
              </Label>
              <Input
                id={tokenId}
                autoFocus
                type="password"
                placeholder={translate(
                  'auto.ext.dooray.components.dooray.connect.dialog.token_placeholder',
                  'Dooray personal API token'
                )}
                value={apiToken}
                onChange={(event) => {
                  setApiToken(event.target.value)
                  clearErrorOnEdit()
                }}
                disabled={connecting}
                aria-invalid={connectState === 'error'}
                aria-describedby={connectState === 'error' ? errorId : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={apiUrlId}>
                {translate(
                  'auto.ext.dooray.components.dooray.connect.dialog.api_url_label',
                  'API URL'
                )}
              </Label>
              <Input
                id={apiUrlId}
                placeholder={translate(
                  'auto.ext.dooray.components.dooray.connect.dialog.api_url_placeholder',
                  'https://api.dooray.com'
                )}
                value={apiUrl}
                onChange={(event) => {
                  setApiUrl(event.target.value)
                  clearErrorOnEdit()
                }}
                disabled={connecting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={webUrlId}>
                {translate(
                  'auto.ext.dooray.components.dooray.connect.dialog.web_url_label',
                  'Web URL (optional, for task links)'
                )}
              </Label>
              <Input
                id={webUrlId}
                placeholder={translate(
                  'auto.ext.dooray.components.dooray.connect.dialog.web_url_placeholder',
                  'https://yourtenant.dooray.com'
                )}
                value={webUrl}
                onChange={(event) => {
                  setWebUrl(event.target.value)
                  clearErrorOnEdit()
                }}
                disabled={connecting}
              />
            </div>
            {connectState === 'error' && connectError ? (
              <p id={errorId} className="text-xs text-destructive">
                {connectError}
              </p>
            ) : null}
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
              <Lock className="size-3 shrink-0" />
              {credentialStorageCopy}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={connecting}
            >
              {translate('auto.ext.dooray.components.dooray.connect.dialog.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {connecting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  {translate(
                    'auto.ext.dooray.components.dooray.connect.dialog.verifying',
                    'Verifying…'
                  )}
                </>
              ) : (
                translate('auto.ext.dooray.components.dooray.connect.dialog.connect', 'Connect')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
