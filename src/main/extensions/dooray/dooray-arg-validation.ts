import type {
  DoorayConnectArgs,
  DoorayCreateIssueArgs,
  DoorayIssueFilter,
  DoorayIssueOrder,
  DoorayListIssuesArgs,
  DoorayPriority,
  DoorayUploadIssueFileArgs
} from '../../../shared/extensions/dooray/dooray-types'
import { asRecord, asString } from './dooray-json-guards'

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string }

export const DOORAY_ISSUE_FILTERS = [
  'assigned',
  'all',
  'done'
] as const satisfies readonly DoorayIssueFilter[]
export const DOORAY_ISSUE_ORDERS = [
  'createdAt',
  '-createdAt',
  'updatedAt',
  '-updatedAt'
] as const satisfies readonly DoorayIssueOrder[]
export const DOORAY_PRIORITIES = [
  'highest',
  'high',
  'normal',
  'low',
  'lowest',
  'none'
] as const satisfies readonly DoorayPriority[]

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })
const pass = <T>(value: T): { ok: true; value: T } => ({ ok: true, value })

function trimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : []
}

export function clampDoorayPageSize(value: unknown, fallback = 30): number {
  const size = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(Math.max(1, size), 100)
}

export function normalizeDoorayPage(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

export function pickDoorayFilter(value: unknown): DoorayIssueFilter | undefined {
  return DOORAY_ISSUE_FILTERS.find((filter) => filter === value)
}

export function pickDoorayOrder(value: unknown): DoorayIssueOrder | undefined {
  return DOORAY_ISSUE_ORDERS.find((order) => order === value)
}

export function pickDoorayPriority(value: unknown): DoorayPriority | undefined {
  return DOORAY_PRIORITIES.find((priority) => priority === value)
}

export function checkConnectArgs(input: unknown): Checked<DoorayConnectArgs> {
  const raw = asRecord(input)
  const apiToken = trimmed(raw.apiToken)
  if (!apiToken) {
    return fail('API token is required.')
  }
  return pass({
    apiToken,
    ...(typeof raw.apiUrl === 'string' ? { apiUrl: raw.apiUrl } : {}),
    ...(typeof raw.webUrl === 'string' ? { webUrl: raw.webUrl } : {})
  })
}

export function checkProjectId(input: unknown): Checked<{ projectId: string }> {
  const projectId = trimmed(asRecord(input).projectId)
  return projectId ? pass({ projectId }) : fail('Project is required.')
}

export function checkListIssuesArgs(input: unknown): Checked<DoorayListIssuesArgs> {
  const raw = asRecord(input)
  const project = checkProjectId(raw)
  if (!project.ok) {
    return project
  }
  const filter = pickDoorayFilter(raw.filter)
  const order = pickDoorayOrder(raw.order)
  return pass({
    projectId: project.value.projectId,
    ...(filter ? { filter } : {}),
    ...(order ? { order } : {}),
    page: normalizeDoorayPage(raw.page),
    size: clampDoorayPageSize(raw.size)
  })
}

export function checkIssueRef(input: unknown): Checked<{ projectId: string; postId: string }> {
  const raw = asRecord(input)
  const projectId = trimmed(raw.projectId)
  const postId = trimmed(raw.postId)
  return projectId && postId ? pass({ projectId, postId }) : fail('Task is required.')
}

export function checkIssueNumberRef(
  input: unknown
): Checked<{ projectId: string; postNumber: number }> {
  const raw = asRecord(input)
  const project = checkProjectId(raw)
  const number = raw.postNumber
  if (!project.ok || typeof number !== 'number' || !Number.isFinite(number) || number <= 0) {
    return fail('Task is required.')
  }
  return pass({ projectId: project.value.projectId, postNumber: Math.floor(number) })
}

export function checkTemplateRef(
  input: unknown
): Checked<{ projectId: string; templateId: string }> {
  const raw = asRecord(input)
  const projectId = trimmed(raw.projectId)
  const templateId = trimmed(raw.templateId)
  return projectId && templateId ? pass({ projectId, templateId }) : fail('Template is required.')
}

export function checkMemberSearch(input: unknown): Checked<{ name: string }> {
  const name = trimmed(asRecord(input).name)
  return name ? pass({ name }) : fail('Name is required.')
}

export function checkCreateIssueArgs(input: unknown): Checked<DoorayCreateIssueArgs> {
  const raw = asRecord(input)
  const project = checkProjectId(raw)
  if (!project.ok) {
    return project
  }
  const subject = trimmed(raw.subject)
  if (!subject) {
    return fail('Subject is required.')
  }
  const priority = pickDoorayPriority(raw.priority)
  const milestoneId = trimmed(raw.milestoneId)
  return pass({
    projectId: project.value.projectId,
    subject,
    body: asString(raw.body),
    tagIds: stringList(raw.tagIds),
    toMemberIds: stringList(raw.toMemberIds),
    ccMemberIds: stringList(raw.ccMemberIds),
    ...(priority ? { priority } : {}),
    ...(milestoneId ? { milestoneId } : {})
  })
}

export function checkUploadArgs(input: unknown): Checked<DoorayUploadIssueFileArgs> {
  const raw = asRecord(input)
  const file = asRecord(raw.file)
  const projectId = trimmed(raw.projectId)
  const postId = trimmed(raw.postId)
  if (!projectId || !postId || typeof file.dataBase64 !== 'string' || !trimmed(file.name)) {
    return fail('Task and file are required.')
  }
  return pass({
    projectId,
    postId,
    file: {
      name: asString(file.name),
      mimeType: asString(file.mimeType),
      dataBase64: file.dataBase64
    }
  })
}

export function checkCommentArgs(
  input: unknown
): Checked<{ projectId: string; postId: string; body: string }> {
  const raw = asRecord(input)
  const ref = checkIssueRef(raw)
  if (!ref.ok) {
    return ref
  }
  const body = trimmed(raw.body)
  return body ? pass({ ...ref.value, body }) : fail('Comment body is required.')
}

export function checkSetWorkflowArgs(
  input: unknown
): Checked<{ projectId: string; postId: string; workflowId: string }> {
  const raw = asRecord(input)
  const ref = checkIssueRef(raw)
  const workflowId = trimmed(raw.workflowId)
  return ref.ok && workflowId
    ? pass({ ...ref.value, workflowId })
    : fail('Task and workflow are required.')
}
