import { getDoorayStatus, testDoorayConnection } from './client'
import * as api from './dooray-api'
import {
  checkCommentArgs,
  checkConnectArgs,
  checkCreateIssueArgs,
  checkIssueNumberRef,
  checkIssueRef,
  checkListIssuesArgs,
  checkMemberSearch,
  checkProjectId,
  checkSetWorkflowArgs,
  checkTemplateRef,
  checkUploadArgs,
  type Checked
} from './dooray-arg-validation'
import { connectDoorayAccount, disconnectDoorayAccount } from './dooray-connection-commands'
import type { MainExtensionIpcContext } from '../main-extension-contract'
import { registerTaskBranchIpcHandlers } from './task-branch/task-branch-ipc'

// Invalid args never throw: reads get a benign default, mutations an {ok:false} result.
function handleRead<T, R>(
  handle: MainExtensionIpcContext['handle'],
  channel: string,
  check: (input: unknown) => Checked<T>,
  run: (args: T) => Promise<R>,
  fallback: R
): void {
  handle(channel, async (_event, input: unknown) => {
    const checked = check(input)
    return checked.ok ? run(checked.value) : fallback
  })
}

function handleMutation<T, R>(
  handle: MainExtensionIpcContext['handle'],
  channel: string,
  check: (input: unknown) => Checked<T>,
  run: (args: T) => Promise<R>
): void {
  handle(channel, async (_event, input: unknown) => {
    const checked = check(input)
    return checked.ok ? run(checked.value) : { ok: false, error: checked.error }
  })
}

export function registerDoorayIpcHandlers(context: MainExtensionIpcContext): void {
  const { handle } = context
  handleMutation(handle, 'dooray:connect', checkConnectArgs, connectDoorayAccount)
  handle('dooray:disconnect', async () => {
    disconnectDoorayAccount()
  })
  handle('dooray:status', async () => getDoorayStatus())
  handle('dooray:testConnection', async () => testDoorayConnection())
  handle('dooray:listProjects', async () => api.listDoorayProjects())
  handleRead(handle, 'dooray:listIssues', checkListIssuesArgs, api.listDoorayIssues, {
    totalCount: 0,
    issues: []
  })
  handleRead(handle, 'dooray:getIssue', checkIssueRef, api.getDoorayIssue, null)
  handleRead(
    handle,
    'dooray:getIssueByNumber',
    checkIssueNumberRef,
    api.getDoorayIssueByNumber,
    null
  )
  handleMutation(handle, 'dooray:createIssue', checkCreateIssueArgs, api.createDoorayIssue)
  handleMutation(handle, 'dooray:uploadIssueFile', checkUploadArgs, api.uploadDoorayIssueFile)
  handleRead(handle, 'dooray:listTags', checkProjectId, api.listDoorayTags, [])
  handleRead(handle, 'dooray:listMilestones', checkProjectId, api.listDoorayMilestones, [])
  handleRead(handle, 'dooray:listTemplates', checkProjectId, api.listDoorayTemplates, [])
  handleRead(handle, 'dooray:getTemplate', checkTemplateRef, api.getDoorayTemplate, null)
  handleRead(handle, 'dooray:searchMembers', checkMemberSearch, api.searchDoorayMembers, [])
  handleRead(handle, 'dooray:issueComments', checkIssueRef, api.getDoorayIssueComments, [])
  handleMutation(handle, 'dooray:addIssueComment', checkCommentArgs, api.addDoorayIssueComment)
  handleRead(handle, 'dooray:listWorkflows', checkProjectId, api.listDoorayWorkflows, [])
  handleMutation(handle, 'dooray:setWorkflow', checkSetWorkflowArgs, api.setDoorayWorkflow)
  registerTaskBranchIpcHandlers(context)
}
