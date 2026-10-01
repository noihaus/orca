import type {
  DoorayCreateIssueArgs,
  DoorayListIssuesArgs,
  DoorayUploadIssueFileArgs
} from '../../../shared/extensions/dooray/dooray-types'
import { requireDoorayClient } from './client'
import * as mutations from './dooray-issue-mutations'
import * as issues from './dooray-issue-queries'
import * as projects from './dooray-project-queries'

type ProjectArgs = { projectId: string }
type PostArgs = { projectId: string; postId: string }

// Binds the injected-client modules to the connected account for IPC/RPC callers.
export const listDoorayProjects = () => projects.listDoorayProjects(requireDoorayClient())
export const listDoorayIssues = (args: DoorayListIssuesArgs) =>
  issues.listDoorayIssues(requireDoorayClient(), args)
export const getDoorayIssue = (args: PostArgs) => issues.getDoorayIssue(requireDoorayClient(), args)
export const getDoorayIssueByNumber = (args: { projectId: string; postNumber: number }) =>
  issues.getDoorayIssueByNumber(requireDoorayClient(), args)
export const getDoorayIssueComments = (args: PostArgs) =>
  issues.getDoorayIssueComments(requireDoorayClient(), args)
export const listDoorayTags = (args: ProjectArgs) =>
  projects.listDoorayTags(requireDoorayClient(), args)
export const listDoorayMilestones = (args: ProjectArgs) =>
  projects.listDoorayMilestones(requireDoorayClient(), args)
export const listDoorayTemplates = (args: ProjectArgs) =>
  projects.listDoorayTemplates(requireDoorayClient(), args)
export const getDoorayTemplate = (args: ProjectArgs & { templateId: string }) =>
  projects.getDoorayTemplate(requireDoorayClient(), args)
export const listDoorayWorkflows = (args: ProjectArgs) =>
  projects.listDoorayWorkflows(requireDoorayClient(), args)
export const searchDoorayMembers = (args: { name: string }) =>
  projects.searchDoorayMembers(requireDoorayClient(), args)
export const createDoorayIssue = (args: DoorayCreateIssueArgs) =>
  mutations.createDoorayIssue(requireDoorayClient(), args)
export const addDoorayIssueComment = (args: PostArgs & { body: string }) =>
  mutations.addDoorayIssueComment(requireDoorayClient(), args)
export const setDoorayWorkflow = (args: PostArgs & { workflowId: string }) =>
  mutations.setDoorayWorkflow(requireDoorayClient(), args)
export const uploadDoorayIssueFile = (args: DoorayUploadIssueFileArgs) =>
  mutations.uploadDoorayIssueFile(requireDoorayClient(), args)
