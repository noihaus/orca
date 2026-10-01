import { useState } from 'react'
import { AlertCircle, CheckCircle2, LoaderCircle, Unlink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useMountedRef } from '@/hooks/useMountedRef'
import { hasRemoteProviderRuntime } from '@/lib/provider-runtime-context'
import { useAppStore } from '@/store'
import {
  IntegrationCardDetails,
  IntegrationCardShell
} from '@/components/settings/integration-card-shell'
import { useIntegrationSubordinateRowClass } from '@/components/settings/integration-card-presentation'
import { getProviderAccountScope } from '@/components/settings/provider-account-scope'
import { ProviderHostScopeControl } from '@/components/settings/ProviderHostScopeControl'
import { translate } from '@/i18n/i18n'
import { DoorayConnectDialog } from './DoorayConnectDialog'
import { DoorayIcon } from './DoorayIcon'
import { readDoorayErrorMessage, translateDoorayError } from './lib/dooray-error-messages'
import { useDoorayConnectionStatus } from './use-dooray-connection-status'

type VerificationResult = { state: 'ok' } | { state: 'error'; error: string }

export function DoorayIntegrationCard(): React.JSX.Element {
  const checkDoorayConnection = useAppStore((s) => s.checkDoorayConnection)
  const disconnectDooray = useAppStore((s) => s.disconnectDooray)
  const testDoorayConnection = useAppStore((s) => s.testDoorayConnection)
  const settings = useAppStore((s) => s.settings)
  const { status, checking, connected } = useDoorayConnectionStatus()
  const mountedRef = useMountedRef()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<VerificationResult | null>(null)

  const accountScope = getProviderAccountScope(settings)
  const subordinateRowClass = useIntegrationSubordinateRowClass('flex items-center gap-3')
  const accountScopeRowClass = useIntegrationSubordinateRowClass('text-xs')
  const credentialCopy = hasRemoteProviderRuntime(settings)
    ? translate(
        'auto.ext.dooray.components.settings.dooray.integration.card.credential_remote',
        'Connect Dooray with a personal API token. The token is sent to the selected remote runtime and stored there with runtime-supported encryption.'
      )
    : translate(
        'auto.ext.dooray.components.settings.dooray.integration.card.credential_local',
        'Connect Dooray with a personal API token. The token is stored locally and encrypted when local runtime storage supports it.'
      )
  const viewerName =
    status.viewer?.name ??
    status.viewer?.userCode ??
    translate('auto.ext.dooray.components.dooray.viewer_unknown', 'unknown')

  const handleDisconnect = async (): Promise<void> => {
    try {
      await disconnectDooray()
    } catch (error) {
      toast.error(
        readDoorayErrorMessage(
          error,
          translate(
            'auto.ext.dooray.components.settings.dooray.integration.card.disconnect_failed',
            'Failed to disconnect Dooray.'
          )
        )
      )
      return
    }
    if (mountedRef.current) {
      setTestResult(null)
    }
  }

  const handleTest = async (): Promise<void> => {
    setTesting(true)
    setTestResult(null)
    const result = await testDoorayConnection()
    if (!mountedRef.current) {
      return
    }
    setTestResult(
      result.ok ? { state: 'ok' } : { state: 'error', error: translateDoorayError(result.error) }
    )
    setTesting(false)
  }

  return (
    <IntegrationCardShell
      icon={<DoorayIcon className="size-5" />}
      name="Dooray"
      description={
        connected
          ? translate(
              'auto.ext.dooray.components.settings.dooray.integration.card.connected_description',
              'Connected as {{value0}}',
              {
                value0: viewerName
              }
            )
          : checking
            ? translate(
                'auto.ext.dooray.components.settings.dooray.integration.card.checking_description',
                'Checking Dooray access before showing setup actions.'
              )
            : translate(
                'auto.ext.dooray.components.settings.dooray.integration.card.description',
                'Connect Dooray to browse and start work from your tasks.'
              )
      }
      checking={checking}
      statusTone={connected ? 'connected' : 'attention'}
      statusLabel={
        connected
          ? translate('auto.components.settings.jira.integration.card.statusConnected', 'Connected')
          : translate(
              'auto.components.settings.jira.integration.card.statusNotConnected',
              'Not connected'
            )
      }
      actions={
        !checking ? (
          <Button
            variant={connected ? 'outline' : 'default'}
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            {connected
              ? translate(
                  'auto.ext.dooray.components.settings.dooray.integration.card.reconnect',
                  'Reconnect'
                )
              : translate(
                  'auto.ext.dooray.components.settings.dooray.integration.card.connect',
                  'Connect Dooray'
                )}
          </Button>
        ) : null
      }
    >
      <IntegrationCardDetails>
        <ProviderHostScopeControl
          labelPrefix={translate(
            'auto.components.settings.task.tracker.integration.cards.account_scope_prefix',
            'Account scope'
          )}
          scope={accountScope}
          className={accountScopeRowClass}
        />
        {connected && status.connected && status.credentialError ? (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="size-3.5 shrink-0" />
            {status.credentialError}
          </p>
        ) : null}
        {connected ? (
          <div className={subordinateRowClass}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{viewerName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {status.connected ? (status.webUrl ?? status.apiUrl) : ''}
                {status.viewer?.email ? ` · ${status.viewer.email}` : ''}
              </p>
            </div>
            {testResult?.state === 'ok' ? (
              <span className="flex shrink-0 items-center gap-1 text-xs text-status-success">
                <CheckCircle2 className="size-3.5" />
                {translate(
                  'auto.components.settings.task.tracker.integration.cards.a2c0015fb8',
                  'Verified'
                )}
              </span>
            ) : null}
            {testResult?.state === 'error' ? (
              <span className="flex min-w-0 max-w-[220px] shrink items-center gap-1 truncate text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                <span className="truncate">{testResult.error}</span>
              </span>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleTest()}
              disabled={testing}
            >
              {testing ? (
                <>
                  <LoaderCircle className="size-3.5 mr-1.5 animate-spin" />
                  {translate(
                    'auto.components.settings.task.tracker.integration.cards.3e7c10d286',
                    'Testing...'
                  )}
                </>
              ) : (
                translate(
                  'auto.components.settings.task.tracker.integration.cards.c24e56c532',
                  'Test'
                )
              )}
            </Button>
            <button
              type="button"
              onClick={() => void handleDisconnect()}
              aria-label={translate(
                'auto.ext.dooray.components.settings.dooray.integration.card.disconnect',
                'Disconnect Dooray'
              )}
              className="rounded-md p-1 text-muted-foreground/50 transition-colors hover:text-destructive"
            >
              <Unlink className="size-3.5" />
            </button>
          </div>
        ) : !checking ? (
          <>
            <p className="text-xs text-muted-foreground">{credentialCopy}</p>
            <Button variant="ghost" size="sm" onClick={() => void checkDoorayConnection()}>
              {translate(
                'auto.components.settings.task.tracker.integration.cards.c90f2ef419',
                'Re-check'
              )}
            </Button>
          </>
        ) : null}
      </IntegrationCardDetails>

      <DoorayConnectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConnected={() => setTestResult(null)}
      />
    </IntegrationCardShell>
  )
}
