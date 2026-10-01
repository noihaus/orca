import { useCallback, useState } from 'react'
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
import { doorayStartLabel } from '../issue/DoorayIssueAside'
import { DoorayIssueWorkspace } from '../issue/DoorayIssueWorkspace'
import { DoorayNewTaskDialog } from '../new-task/DoorayNewTaskDialog'
import { useDoorayStartActions } from '../start/use-dooray-start-actions'
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
  onStartNewWorkspace,
  startRepo
}: {
  credentialError?: string
  onStartNewWorkspace: TaskSourcePanelProps['onStartNewWorkspace']
  startRepo: TaskSourcePanelProps['startRepo']
}): React.JSX.Element {
  const list = useDoorayIssueList({ withMilestones: true })
  const { attachedIssueIds, openWorkspace } = useDoorayWorkspaceActions(list.rawIssues)
  const startNewWorkspace = useCallback(
    (issue: DoorayIssue): void =>
      onStartNewWorkspace(buildDoorayLinkedWorkItem(issue), getDoorayIssueWorkspaceSeed(issue)),
    [onStartNewWorkspace]
  )
  const start = useDoorayStartActions(startRepo, startNewWorkspace)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  // A row cannot host the workspace picker, so it opens the sheet where the menu lives.
  const startFromRow =
    start.primaryStartKind === 'existing-workspace' && start.needsWorkspacePicker
      ? (issue: DoorayIssue) => setSelectedIssueId(issue.id)
      : start.onPrimaryStart
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  // A just-created issue may fall outside the current filter, so the sheet keeps its own copy.
  const [createdIssue, setCreatedIssue] = useState<DoorayIssue | null>(null)
  // Derived from the list so workflow patches flow back into the open sheet.
  const selectedIssue =
    list.rawIssues.find((issue) => issue.id === selectedIssueId) ??
    (createdIssue?.id === selectedIssueId ? createdIssue : null)
  const handleTaskCreated = (issue: DoorayIssue | null): void => {
    list.refresh()
    if (issue) {
      setCreatedIssue(issue)
      setSelectedIssueId(issue.id)
    }
  }
  return (
    <>
      <DoorayIssueListPanel
        list={list}
        credentialError={credentialError}
        selectedIssueId={selectedIssueId}
        onSelectIssue={(issue) => setSelectedIssueId(issue.id)}
        onStartIssue={startFromRow}
        startLabel={doorayStartLabel(start.primaryStartKind)}
        attachedIssueIds={attachedIssueIds}
        onOpenWorkspace={openWorkspace}
        onNewTask={() => setNewTaskOpen(true)}
      />
      <DoorayNewTaskDialog
        open={newTaskOpen}
        onOpenChange={setNewTaskOpen}
        projects={list.projects}
        defaultProjectId={list.selectedProjectId}
        onCreated={handleTaskCreated}
      />
      <DoorayIssueWorkspace
        issue={selectedIssue}
        onUse={start.onPrimaryStart}
        primaryStartKind={start.primaryStartKind}
        primaryDisabledReason={start.primaryDisabledReason}
        secondaryStart={start.secondaryStart}
        workspaceStart={start.workspaceStart}
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
  onStartNewWorkspace,
  startRepo
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
      startRepo={startRepo}
    />
  )
}
