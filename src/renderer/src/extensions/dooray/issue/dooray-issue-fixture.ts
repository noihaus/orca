import type { DoorayIssue } from '../../../../../shared/extensions/dooray/dooray-types'

export function makeDoorayIssue(overrides: Partial<DoorayIssue> = {}): DoorayIssue {
  return {
    id: 'post-1',
    projectId: 'proj-a',
    projectCode: 'A',
    number: 1,
    taskNumber: 'A/1',
    subject: 'Task 1',
    workflowId: 'wf-open',
    workflowName: 'Open',
    workflowClass: 'registered',
    assignees: [],
    milestoneName: null,
    createdAt: '2026-09-10T00:00:00Z',
    updatedAt: '2026-09-10T00:00:00Z',
    url: 'https://dooray.example/task/1',
    ...overrides
  }
}
