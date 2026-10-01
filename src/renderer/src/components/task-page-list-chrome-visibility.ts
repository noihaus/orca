import { isExtensionTaskProvider, type TaskProvider } from '../../../shared/task-providers' // fork-seam: task-page-source

export type TaskPageListChromeVisibilityState = {
  taskSource: TaskProvider
  hasGitHubDetail: boolean
  hasGitLabDetail: boolean
  hasJiraDetail: boolean
  hasLinearIssueDetail: boolean
  hasLinearProjectContext: boolean
  hasLinearViewContext: boolean
}

export function shouldHideTaskPageListChrome({
  taskSource,
  hasGitHubDetail,
  hasGitLabDetail,
  hasJiraDetail,
  hasLinearIssueDetail,
  hasLinearProjectContext,
  hasLinearViewContext
}: TaskPageListChromeVisibilityState): boolean {
  // Why: provider-specific selection can intentionally survive source switches;
  // stale detail state from another provider must not hide the active list chrome.
  if (isExtensionTaskProvider(taskSource)) {
    // fork-seam: task-page-source
    return false
  }
  switch (taskSource) {
    case 'github':
      return hasGitHubDetail
    case 'gitlab':
      return hasGitLabDetail
    case 'jira':
      return hasJiraDetail
    case 'linear':
      return hasLinearIssueDetail || hasLinearProjectContext || hasLinearViewContext
  }
}
