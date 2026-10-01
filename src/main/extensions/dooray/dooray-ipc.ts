import { ipcMain } from 'electron'
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
  channel: string,
  check: (input: unknown) => Checked<T>,
  run: (args: T) => Promise<R>,
  fallback: R
): void {
  ipcMain.handle(channel, async (_event, input: unknown) => {
    const checked = check(input)
    return checked.ok ? run(checked.value) : fallback
  })
}

function handleMutation<T, R>(
  channel: string,
  check: (input: unknown) => Checked<T>,
  run: (args: T) => Promise<R>
): void {
  ipcMain.handle(channel, async (_event, input: unknown) => {
    const checked = check(input)
    return checked.ok ? run(checked.value) : { ok: false, error: checked.error }
  })
}

export function registerDoorayIpcHandlers(context: MainExtensionIpcContext): void {
  handleMutation('dooray:connect', checkConnectArgs, connectDoorayAccount)
  ipcMain.handle('dooray:disconnect', async () => {
    disconnectDoorayAccount()
  })
  ipcMain.handle('dooray:status', async () => getDoorayStatus())
  ipcMain.handle('dooray:testConnection', async () => testDoorayConnection())
  ipcMain.handle('dooray:listProjects', async () => api.listDoorayProjects())
  handleRead('dooray:listIssues', checkListIssuesArgs, api.listDoorayIssues, {
    totalCount: 0,
    issues: []
  })
  handleRead('dooray:getIssue', checkIssueRef, api.getDoorayIssue, null)
  handleRead('dooray:getIssueByNumber', checkIssueNumberRef, api.getDoorayIssueByNumber, null)
  handleMutation('dooray:createIssue', checkCreateIssueArgs, api.createDoorayIssue)
  handleMutation('dooray:uploadIssueFile', checkUploadArgs, api.uploadDoorayIssueFile)
  handleRead('dooray:listTags', checkProjectId, api.listDoorayTags, [])
  handleRead('dooray:listMilestones', checkProjectId, api.listDoorayMilestones, [])
  handleRead('dooray:listTemplates', checkProjectId, api.listDoorayTemplates, [])
  handleRead('dooray:getTemplate', checkTemplateRef, api.getDoorayTemplate, null)
  handleRead('dooray:searchMembers', checkMemberSearch, api.searchDoorayMembers, [])
  handleRead('dooray:issueComments', checkIssueRef, api.getDoorayIssueComments, [])
  handleMutation('dooray:addIssueComment', checkCommentArgs, api.addDoorayIssueComment)
  handleRead('dooray:listWorkflows', checkProjectId, api.listDoorayWorkflows, [])
  handleMutation('dooray:setWorkflow', checkSetWorkflowArgs, api.setDoorayWorkflow)
  registerTaskBranchIpcHandlers(context.store)
}
