import type {
  DoorayComment,
  DoorayIssue,
  DoorayMember,
  DoorayMilestone,
  DoorayPriority,
  DoorayProject,
  DoorayTag,
  DoorayTagGroup,
  DoorayTemplate,
  DoorayTemplateSummary,
  DoorayWorkflow,
  DoorayWorkflowClass
} from '../../../shared/extensions/dooray/dooray-types'
import { asRecord, asRecordArray, asString, isRecord, type JsonRecord } from './dooray-json-guards'
import type { DoorayClient } from './dooray-request'

const PRIORITIES = ['highest', 'high', 'normal', 'low', 'lowest', 'none'] as const

export function toPriority(value: unknown): DoorayPriority | null {
  return PRIORITIES.find((priority) => priority === value) ?? null
}

export function toWorkflowClass(value: unknown): DoorayWorkflowClass {
  return value === 'backlog' || value === 'registered' || value === 'working' || value === 'closed'
    ? value
    : 'registered'
}

export function doorayTaskUrl(client: DoorayClient, postId: string): string {
  return client.webUrl ? `${client.webUrl}/project/tasks/${encodeURIComponent(postId)}` : ''
}

export function mapDoorayIssue(client: DoorayClient, raw: JsonRecord): DoorayIssue {
  const project = asRecord(raw.project)
  const workflow = asRecord(raw.workflow)
  const body = asRecord(raw.body)
  const id = asString(raw.id)
  const projectCode = asString(project.code)
  const number = typeof raw.number === 'number' ? raw.number : 0
  const priority = toPriority(raw.priority)
  return {
    id,
    projectId: asString(project.id),
    projectCode,
    number,
    taskNumber: asString(raw.taskNumber, projectCode ? `${projectCode}/${number}` : `${number}`),
    subject: asString(raw.subject),
    ...(typeof body.content === 'string' ? { body: body.content } : {}),
    workflowId: asString(workflow.id),
    workflowName: asString(workflow.name),
    workflowClass: toWorkflowClass(raw.workflowClass),
    assignees: asRecordArray(asRecord(raw.users).to)
      .map((entry) => asString(asRecord(entry.member).name))
      .filter(Boolean),
    ...(priority && priority !== 'none' ? { priority } : {}),
    milestoneName: asString(asRecord(raw.milestone).name) || null,
    createdAt: asString(raw.createdAt),
    updatedAt: asString(raw.updatedAt),
    url: doorayTaskUrl(client, id)
  }
}

export function mapDoorayProject(raw: JsonRecord): DoorayProject {
  return { id: asString(raw.id), code: asString(raw.code) }
}

export function mapDoorayComment(raw: JsonRecord): DoorayComment {
  const creator = asRecord(raw.creator)
  return {
    id: asString(raw.id),
    body: asString(asRecord(raw.body).content),
    createdAt: asString(raw.createdAt),
    authorName: asString(asRecord(creator.member).name, asString(creator.name))
  }
}

export function mapDoorayWorkflow(raw: JsonRecord): DoorayWorkflow {
  return {
    id: asString(raw.id),
    name: asString(raw.name),
    workflowClass: toWorkflowClass(raw.class)
  }
}

function mapTagGroup(value: unknown): DoorayTagGroup | undefined {
  if (!isRecord(value) || !asString(value.id)) {
    return undefined
  }
  return {
    id: asString(value.id),
    name: asString(value.name),
    mandatory: value.mandatory === true,
    selectOne: value.selectOne === true
  }
}

export function mapDoorayTag(raw: JsonRecord): DoorayTag {
  const tagGroup = mapTagGroup(raw.tagGroup)
  return { id: asString(raw.id), name: asString(raw.name), ...(tagGroup ? { tagGroup } : {}) }
}

export function mapDoorayMilestone(raw: JsonRecord): DoorayMilestone {
  return {
    id: asString(raw.id),
    name: asString(raw.name),
    startedAt: asString(raw.startedAt),
    endedAt: asString(raw.endedAt),
    status: raw.status === 'closed' ? 'closed' : 'open'
  }
}

export function mapDoorayTemplateSummary(raw: JsonRecord): DoorayTemplateSummary {
  return {
    id: asString(raw.id),
    templateName: asString(raw.templateName),
    isDefault: raw.isDefault === true
  }
}

export function mapDoorayMember(raw: JsonRecord): DoorayMember {
  return { id: asString(raw.id), name: asString(raw.name), userCode: asString(raw.userCode) }
}

function mapTemplateMembers(value: unknown): DoorayMember[] {
  return asRecordArray(value)
    .map((entry) => {
      const member = asRecord(entry.member)
      return {
        id: asString(member.organizationMemberId),
        name: asString(member.name),
        userCode: ''
      }
    })
    .filter((member) => member.id)
}

export function mapDoorayTemplate(fallbackId: string, raw: JsonRecord): DoorayTemplate {
  const users = asRecord(raw.users)
  return {
    id: asString(raw.id, fallbackId),
    templateName: asString(raw.templateName),
    subject: asString(raw.subject),
    body: asString(asRecord(raw.body).content),
    guide: asString(raw.guide),
    // Detail carries tag ids only; callers join them against the project tag list.
    tagIds: asRecordArray(raw.tags)
      .map((tag) => asString(tag.id))
      .filter(Boolean),
    priority: toPriority(raw.priority) ?? 'none',
    toMembers: mapTemplateMembers(users.to),
    ccMembers: mapTemplateMembers(users.cc)
  }
}
