import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { IntegrationStatusPill } from '@/components/integration-status-pill'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { DoorayConnectDialog } from './DoorayConnectDialog'
import { DoorayIcon } from './DoorayIcon'
import {
  DOORAY_DEFAULT_API_URL,
  DOORAY_DEFAULT_WEB_URL,
  DOORAY_TOKEN_SETTINGS_URL
} from './lib/dooray-default-urls'
import { openDoorayUrl } from './lib/dooray-open-link'
import { useDoorayConnectionStatus } from './use-dooray-connection-status'

export function DoorayOnboardingRow(): React.JSX.Element {
  const checkDoorayConnection = useAppStore((s) => s.checkDoorayConnection)
  const { status, checking, connected } = useDoorayConnectionStatus()
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    void checkDoorayConnection()
  }, [checkDoorayConnection])

  return (
    <>
      <div className="rounded-xl border border-border bg-muted/20">
        <div className="flex items-start gap-4 p-5">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground">
              <DoorayIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] font-semibold leading-tight text-foreground">
                  {translate('auto.ext.dooray.components.onboarding.DoorayRow.name', 'Dooray')}
                </h3>
                {connected ? (
                  <IntegrationStatusPill tone="connected">
                    {translate(
                      'auto.ext.dooray.components.onboarding.DoorayRow.connected',
                      'Connected'
                    )}
                  </IntegrationStatusPill>
                ) : checking ? (
                  <IntegrationStatusPill tone="neutral">
                    {translate(
                      'auto.ext.dooray.components.onboarding.DoorayRow.checking',
                      'Checking…'
                    )}
                  </IntegrationStatusPill>
                ) : (
                  <IntegrationStatusPill tone="attention">
                    {translate(
                      'auto.ext.dooray.components.onboarding.DoorayRow.not_connected',
                      'Not connected'
                    )}
                  </IntegrationStatusPill>
                )}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {connected
                  ? translate(
                      'auto.ext.dooray.components.onboarding.DoorayRow.connected_description',
                      'Connected as {{value0}}. Dooray tasks are ready to start workspaces from.',
                      { value0: status.viewer?.name ?? status.viewer?.userCode ?? 'unknown' }
                    )
                  : translate(
                      'auto.ext.dooray.components.onboarding.DoorayRow.description',
                      'Start a workspace from a Dooray task, with its title and link attached.'
                    )}
              </p>
              {!connected ? (
                <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-muted-foreground">
                  <li>
                    {translate(
                      'auto.ext.dooray.components.onboarding.DoorayRow.hint_token',
                      'API token: create a personal token in Dooray under Settings → API.'
                    )}{' '}
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:text-foreground"
                      onClick={() => openDoorayUrl(DOORAY_TOKEN_SETTINGS_URL)}
                    >
                      {translate(
                        'auto.ext.dooray.components.onboarding.DoorayRow.hint_token_link',
                        'Open token page'
                      )}
                    </button>
                  </li>
                  <li>
                    {translate(
                      'auto.ext.dooray.components.onboarding.DoorayRow.hint_api_url',
                      'API URL: {{value0}} (leave empty to use this default).',
                      { value0: DOORAY_DEFAULT_API_URL }
                    )}
                  </li>
                  <li>
                    {translate(
                      'auto.ext.dooray.components.onboarding.DoorayRow.hint_web_url',
                      'Web URL: your tenant address, for example {{value0}}.',
                      { value0: DOORAY_DEFAULT_WEB_URL }
                    )}
                  </li>
                </ul>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={connected ? 'outline' : 'default'}
              size="sm"
              onClick={() => setDialogOpen(true)}
            >
              {connected
                ? translate(
                    'auto.ext.dooray.components.onboarding.DoorayRow.reconnect',
                    'Reconnect'
                  )
                : translate(
                    'auto.ext.dooray.components.onboarding.DoorayRow.connect',
                    'Connect Dooray'
                  )}
            </Button>
            {!connected ? (
              <Button variant="ghost" size="sm" onClick={() => void checkDoorayConnection()}>
                {translate('auto.ext.dooray.components.onboarding.DoorayRow.recheck', 'Re-check')}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <DoorayConnectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
