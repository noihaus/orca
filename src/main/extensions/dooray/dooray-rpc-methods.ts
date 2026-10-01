import { defineMethod } from '../../runtime/rpc/core'
import { getDoorayStatus, testDoorayConnection } from './client'
import * as api from './dooray-api'
import { clampDoorayPageSize, normalizeDoorayPage } from './dooray-arg-validation'
import { connectDoorayAccount, disconnectDoorayAccount } from './dooray-connection-commands'
import {
  Connect,
  CreateIssue,
  IssueComment,
  IssueNumberRef,
  IssueRef,
  ListIssues,
  MemberSearch,
  ProjectRef,
  SetWorkflow,
  TemplateRef,
  UploadIssueFile
} from './dooray-rpc-schemas'

// Host-local: handlers call the main-process API directly, not the runtime.
export const DOORAY_RPC_METHODS = [
  defineMethod({
    name: 'dooray.connect',
    params: Connect,
    handler: async (params) => connectDoorayAccount(params)
  }),
  defineMethod({
    name: 'dooray.disconnect',
    params: null,
    handler: async () => {
      disconnectDoorayAccount()
      return { ok: true }
    }
  }),
  defineMethod({ name: 'dooray.status', params: null, handler: async () => getDoorayStatus() }),
  defineMethod({
    name: 'dooray.testConnection',
    params: null,
    handler: async () => testDoorayConnection()
  }),
  defineMethod({
    name: 'dooray.listProjects',
    params: null,
    handler: async () => api.listDoorayProjects()
  }),
  defineMethod({
    name: 'dooray.listIssues',
    params: ListIssues,
    handler: async (params) =>
      api.listDoorayIssues({
        ...params,
        page: normalizeDoorayPage(params.page),
        size: clampDoorayPageSize(params.size)
      })
  }),
  defineMethod({
    name: 'dooray.getIssue',
    params: IssueRef,
    handler: async (params) => api.getDoorayIssue(params)
  }),
  defineMethod({
    name: 'dooray.createIssue',
    params: CreateIssue,
    handler: async (params) =>
      api.createDoorayIssue({
        ...params,
        body: params.body ?? '',
        tagIds: params.tagIds ?? [],
        toMemberIds: params.toMemberIds ?? [],
        ccMemberIds: params.ccMemberIds ?? [],
        milestoneId: params.milestoneId?.trim() || undefined
      })
  }),
  defineMethod({
    name: 'dooray.listMilestones',
    params: ProjectRef,
    handler: async (params) => api.listDoorayMilestones(params)
  }),
  defineMethod({
    name: 'dooray.uploadIssueFile',
    params: UploadIssueFile,
    handler: async (params) =>
      api.uploadDoorayIssueFile({
        ...params,
        file: { ...params.file, mimeType: params.file.mimeType ?? '' }
      })
  }),
  defineMethod({
    name: 'dooray.listTags',
    params: ProjectRef,
    handler: async (params) => api.listDoorayTags(params)
  }),
  defineMethod({
    name: 'dooray.listTemplates',
    params: ProjectRef,
    handler: async (params) => api.listDoorayTemplates(params)
  }),
  defineMethod({
    name: 'dooray.getTemplate',
    params: TemplateRef,
    handler: async (params) => api.getDoorayTemplate(params)
  }),
  defineMethod({
    name: 'dooray.searchMembers',
    params: MemberSearch,
    handler: async (params) => api.searchDoorayMembers(params)
  }),
  defineMethod({
    name: 'dooray.getIssueByNumber',
    params: IssueNumberRef,
    handler: async (params) => api.getDoorayIssueByNumber(params)
  }),
  defineMethod({
    name: 'dooray.issueComments',
    params: IssueRef,
    handler: async (params) => api.getDoorayIssueComments(params)
  }),
  defineMethod({
    name: 'dooray.addIssueComment',
    params: IssueComment,
    handler: async (params) => api.addDoorayIssueComment(params)
  }),
  defineMethod({
    name: 'dooray.listWorkflows',
    params: ProjectRef,
    handler: async (params) => api.listDoorayWorkflows(params)
  }),
  defineMethod({
    name: 'dooray.setWorkflow',
    params: SetWorkflow,
    handler: async (params) => api.setDoorayWorkflow(params)
  })
] as const
