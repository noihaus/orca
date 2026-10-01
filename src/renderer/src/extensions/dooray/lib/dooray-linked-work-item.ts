import {
  getLinkedWorkItemSuggestedName,
  getLinkedWorkItemWorkspaceName
} from '../../../../../shared/workspace-name'
import type { LinkedWorkItemSummary } from '@/lib/new-workspace'
import type { DoorayIssue } from '../../../../../shared/extensions/dooray/dooray-types'
import { getDoorayTaskBranchName } from './dooray-branch-matching'

type LinkedIssueFields = Pick<DoorayIssue, 'taskNumber' | 'subject' | 'url'>

// jiraIdentifier is reused as the generic linked-item identifier slot (no Dooray provider union).
export function buildDoorayLinkedWorkItem(issue: LinkedIssueFields): LinkedWorkItemSummary {
  return {
    type: 'issue',
    number: 0,
    title: `${issue.taskNumber} ${issue.subject}`,
    url: issue.url,
    jiraIdentifier: issue.taskNumber,
    branchNameOverride: getDoorayTaskBranchName(issue)
  }
}

export function getDoorayIssueWorkspaceSeed(issue: LinkedIssueFields): string {
  return (
    getLinkedWorkItemWorkspaceName({
      type: 'issue',
      number: 0,
      title: `${issue.taskNumber} ${issue.subject}`,
      jiraIdentifier: issue.taskNumber
    })?.seedName ?? getLinkedWorkItemSuggestedName({ title: issue.subject })
  )
}
