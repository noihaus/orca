import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import type { TaskSourcePanelProps } from '../../renderer-extension-contract'
import type { DoorayIssue } from '../../../../../shared/extensions/dooray/dooray-types'
import { DoorayConnectDialog } from '../DoorayConnectDialog'
import { DoorayIcon } from '../DoorayIcon'
import {
  getDoorayIssueWorkspaceSeed,
  buildDoorayLinkedWorkItem
} from '../lib/dooray-linked-work-item'
import { DoorayIssueWorkspace } from '../issue/DoorayIssueWorkspace'
import { useDoorayConnectionStatus } from '../use-dooray-connection-status'
import { DoorayIssueListPanel } from './DoorayIssueListPanel'
import { useDoorayIssueList } from './use-dooray-issue-list'
import { useDoorayWorkspaceActions } from './use-dooray-workspace-actions'
import { useHideDoorayTaskSource } from './use-hide-dooray-task-source'

function DoorayConnectCta(): React.JSX.Element {
  const [connectOpen, setConnectOpen] = useState(false)
  const hideDooray = useHideDoorayTaskSource()
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-md border border-border/50 bg-muted/50 px-6 py-14 text-center shadow-sm">
      <DoorayIcon className="mb-4 size-8 text-muted-foreground/60" />
      <p className="text-base font-medium text-foreground">
        {translate('auto.ext.dooray.components.TaskPage.dooray_connect_title', 'Connect Dooray')}
      </p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {translate(
          'auto.ext.dooray.components.TaskPage.dooray_connect_description',
          'Browse, comment, and start work from Dooray tasks directly from here.'
        )}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={() => setConnectOpen(true)}>
          {translate('auto.ext.dooray.components.TaskPage.dooray_connect_button', 'Connect Dooray')}
        </Button>
        <Button variant="outline" onClick={hideDooray}>
          {translate('auto.ext.dooray.components.TaskPage.dooray_hide_button', 'Hide Dooray')}
        </Button>
      </div>
      <DoorayConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  )
}

// Owns the list model so the detail sheet and task creation (D11) can share it.
function ConnectedDoorayTaskPanel({
  credentialError,
  onStartNewWorkspace
}: {
  credentialError?: string
  onStartNewWorkspace: TaskSourcePanelProps['onStartNewWorkspace']
}): React.JSX.Element {
  const list = useDoorayIssueList({ withMilestones: true })
  const { attachedIssueIds, openWorkspace } = useDoorayWorkspaceActions(list.rawIssues)
  const startWorkspace = (issue: DoorayIssue): void =>
    onStartNewWorkspace(buildDoorayLinkedWorkItem(issue), getDoorayIssueWorkspaceSeed(issue))
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  // Derived from the list so workflow patches flow back into the open sheet.
  const selectedIssue = list.rawIssues.find((issue) => issue.id === selectedIssueId) ?? null
  return (
    <>
      <DoorayIssueListPanel
        list={list}
        credentialError={credentialError}
        selectedIssueId={selectedIssueId}
        onSelectIssue={(issue) => setSelectedIssueId(issue.id)}
        onStartIssue={startWorkspace}
        attachedIssueIds={attachedIssueIds}
        onOpenWorkspace={openWorkspace}
      />
      <DoorayIssueWorkspace
        issue={selectedIssue}
        onUse={startWorkspace}
        onOpenWorkspace={
          selectedIssue && attachedIssueIds.has(selectedIssue.id) ? openWorkspace : undefined
        }
        onClose={() => setSelectedIssueId(null)}
        onIssuePatched={list.patchIssue}
      />
    </>
  )
}

// The Tasks-page body for the Dooray source.
export function DoorayTaskSourcePanel({
  onStartNewWorkspace
}: TaskSourcePanelProps): React.JSX.Element {
  const { status, checking, connected } = useDoorayConnectionStatus()
  if (checking) {
    return (
      <div
        className="mt-4 flex items-center justify-center py-14"
        data-testid="dooray-status-loading"
      >
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!connected || !status.connected) {
    return <DoorayConnectCta />
  }
  return (
    <ConnectedDoorayTaskPanel
      credentialError={status.credentialError}
      onStartNewWorkspace={onStartNewWorkspace}
    />
  )
}
