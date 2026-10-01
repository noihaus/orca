import { z } from 'zod'
import {
  OptionalFiniteNumber,
  OptionalPlainString
} from '../../../shared/rpc-contract/rpc-param-primitives'
import {
  DOORAY_ISSUE_FILTERS,
  DOORAY_ISSUE_ORDERS,
  DOORAY_PRIORITIES
} from './dooray-arg-validation'

// Trims before the non-empty check so whitespace-only ids are rejected.
const trimmedRequired = (message: string) =>
  z
    .unknown()
    .transform((value) => (typeof value === 'string' ? value.trim() : ''))
    .pipe(z.string().min(1, message))

const projectId = trimmedRequired('Project is required')
const postId = trimmedRequired('Task is required')

export const Connect = z.object({
  apiUrl: OptionalPlainString,
  webUrl: OptionalPlainString,
  apiToken: trimmedRequired('API token is required')
})
export const ProjectRef = z.object({ projectId })
export const ListIssues = z.object({
  projectId,
  filter: z.enum(DOORAY_ISSUE_FILTERS).optional(),
  page: OptionalFiniteNumber,
  size: OptionalFiniteNumber,
  order: z.enum(DOORAY_ISSUE_ORDERS).optional()
})
export const IssueRef = z.object({ projectId, postId })
export const IssueNumberRef = z.object({ projectId, postNumber: z.number().int().positive() })
export const CreateIssue = z.object({
  projectId,
  subject: trimmedRequired('Subject is required'),
  body: OptionalPlainString,
  tagIds: z.array(z.string()).optional(),
  priority: z.enum(DOORAY_PRIORITIES).optional(),
  toMemberIds: z.array(z.string()).optional(),
  ccMemberIds: z.array(z.string()).optional(),
  milestoneId: OptionalPlainString
})
export const UploadIssueFile = z.object({
  projectId,
  postId,
  file: z.object({
    name: trimmedRequired('File name is required'),
    mimeType: OptionalPlainString,
    dataBase64: z.string()
  })
})
export const TemplateRef = z.object({
  projectId,
  templateId: trimmedRequired('Template is required')
})
export const MemberSearch = z.object({ name: trimmedRequired('Name is required') })
export const IssueComment = z.object({
  projectId,
  postId,
  body: trimmedRequired('Comment body is required')
})
export const SetWorkflow = z.object({
  projectId,
  postId,
  workflowId: trimmedRequired('Workflow is required')
})
