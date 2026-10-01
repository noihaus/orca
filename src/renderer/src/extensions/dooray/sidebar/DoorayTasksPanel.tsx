import { useCallback, useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import type { DoorayIssue } from '../../../../../shared/extensions/dooray/dooray-types'
import { DoorayConnectDialog } from '../DoorayConnectDialog'
import { DoorayIcon } from '../DoorayIcon'
import { doorayStartLabel } from '../issue/DoorayIssueAside'
import { DoorayIssueWorkspace } from '../issue/DoorayIssueWorkspace'
import {
  buildDoorayLinkedWorkItem,
  getDoorayIssueWorkspaceSeed
} from '../lib/dooray-linked-work-item'
import { useDoorayStartActions } from '../start/use-dooray-start-actions'
import { useDoorayIssueList } from '../tasks/use-dooray-issue-list'
import { useDoorayWorkspaceActions } from '../tasks/use-dooray-workspace-actions'
import { useDoorayConnectionStatus } from '../use-dooray-connection-status'
import { DoorayActiveTaskCard } from './DoorayActiveTaskCard'
import { DoorayAllTasksSection } from './DoorayAllTasksSection'
import { useDoorayBranchProjectSync } from './use-dooray-branch-project-sync'
import { useActiveWorktreeBranch } from './use-dooray-active-task'

function DoorayConnectPrompt(): React.JSX.Element {
  const [connectOpen, setConnectOpen] = useState(false)
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <DoorayIcon className="mb-3 size-8 text-muted-foreground/60" />
      <p className="text-sm font-medium text-foreground">
        {translate(
          'auto.ext.dooray.components.right.sidebar.DoorayTasksPanel.connect_title',
          'Connect Dooray'
        )}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {translate(
          'auto.ext.dooray.components.right.sidebar.DoorayTasksPanel.connect_description',
          'Connect Dooray to browse your tasks here.'
        )}
      </p>
      <Button size="sm" className="mt-4" onClick={() => setConnectOpen(true)}>
        {translate(
          'auto.ext.dooray.components.right.sidebar.DoorayTasksPanel.connect_button',
          'Connect Dooray'
        )}
      </Button>
      <DoorayConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  )
}

export function ConnectedDoorayTasksPanel({
  credentialError
}: {
  credentialError?: string
}): React.JSX.Element {
  const openModal = useAppStore((state) => state.openModal)
  const activeBranch = useActiveWorktreeBranch()
  const list = useDoorayIssueList({ withMilestones: true })
  const { attachedIssueIds, openWorkspace } = useDoorayWorkspaceActions(list.rawIssues)
  const selectProject = useDoorayBranchProjectSync({
    activeBranch,
    projects: list.projects,
    selectedProjectId: list.selectedProjectId,
    selectProject: list.selectProject
  })
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const selectedIssue = list.rawIssues.find((issue) => issue.id === selectedIssueId) ?? null
  const startRepoId = useAppStore(
    (state) =>
      (state.activeWorktreeId
        ? state.getKnownWorktreeById(state.activeWorktreeId)?.repoId
        : undefined) ??
      state.activeRepoId ??
      undefined
  )
  const startRepo = useAppStore(
    (state) => state.repos.find((repo) => repo.id === startRepoId) ?? null
  )
  const startNewWorkspace = useCallback(
    (issue: DoorayIssue): void =>
      openModal('new-workspace-composer', {
        initialRepoId: startRepoId,
        linkedWorkItem: buildDoorayLinkedWorkItem(issue),
        prefilledName: getDoorayIssueWorkspaceSeed(issue),
        telemetrySource: 'sidebar'
      }),
    [openModal, startRepoId]
  )
  const start = useDoorayStartActions(startRepo, startNewWorkspace)
  // A row cannot host the workspace picker, so it opens the sheet where the menu lives.
  const startFromRow =
    start.primaryStartKind === 'existing-workspace' && start.needsWorkspacePicker
      ? (issue: DoorayIssue) => setSelectedIssueId(issue.id)
      : start.onPrimaryStart
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto">
        <DoorayActiveTaskCard
          activeBranch={activeBranch}
          projects={list.projects}
          projectsLoading={list.projectsLoading}
        />
        <DoorayAllTasksSection
          list={list}
          credentialError={credentialError}
          selectedIssueId={selectedIssueId}
          attachedIssueIds={attachedIssueIds}
          onSelectProject={selectProject}
          onOpenIssue={(issue) => setSelectedIssueId(issue.id)}
          onStartIssue={startFromRow}
          startLabel={doorayStartLabel(start.primaryStartKind)}
          onOpenWorkspace={openWorkspace}
        />
      </div>
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
    </div>
  )
}

export function DoorayTasksPanel(): React.JSX.Element {
  const { status, checking, connected } = useDoorayConnectionStatus()
  const checkDoorayConnection = useAppStore((state) => state.checkDoorayConnection)
  useEffect(() => {
    if (checking) {
      void checkDoorayConnection()
    }
  }, [checking, checkDoorayConnection])
  if (checking) {
    return (
      <div className="flex h-full items-center justify-center" data-testid="dooray-status-loading">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!connected || !status.connected) {
    return <DoorayConnectPrompt />
  }
  return <ConnectedDoorayTasksPanel credentialError={status.credentialError} />
}
