import type {
  DoorayMember,
  DoorayMilestone,
  DoorayProject,
  DoorayTag,
  DoorayTemplate,
  DoorayTemplateSummary,
  DoorayWorkflow
} from '../../../shared/extensions/dooray/dooray-types'
import { asRecordArray, isRecord } from './dooray-json-guards'
import { doorayProjectPath } from './dooray-issue-queries'
import {
  mapDoorayMember,
  mapDoorayMilestone,
  mapDoorayProject,
  mapDoorayTag,
  mapDoorayTemplate,
  mapDoorayTemplateSummary,
  mapDoorayWorkflow
} from './dooray-issue-mapping'
import { doorayRequest, type DoorayClient } from './dooray-request'

const MILESTONE_PAGE_SIZE = 50
const MILESTONE_MAX_PAGES = 20

export async function listDoorayProjects(client: DoorayClient): Promise<DoorayProject[]> {
  const response = await doorayRequest(client, '/project/v1/projects?member=me&size=100&page=0')
  return asRecordArray(response.result)
    .map(mapDoorayProject)
    .filter((project) => project.id && project.code)
}

export async function listDoorayTags(
  client: DoorayClient,
  args: { projectId: string }
): Promise<DoorayTag[]> {
  const response = await doorayRequest(
    client,
    `${doorayProjectPath(args.projectId)}/tags?size=100&page=0`
  )
  return asRecordArray(response.result)
    .map(mapDoorayTag)
    .filter((tag) => tag.id && tag.name)
}

export async function listDoorayMilestones(
  client: DoorayClient,
  args: { projectId: string }
): Promise<DoorayMilestone[]> {
  const collected: DoorayMilestone[] = []
  for (let page = 0; page < MILESTONE_MAX_PAGES; page += 1) {
    const response = await doorayRequest(
      client,
      `${doorayProjectPath(args.projectId)}/milestones?size=${MILESTONE_PAGE_SIZE}&page=${page}`
    )
    const raws = asRecordArray(response.result)
    collected.push(...raws.map(mapDoorayMilestone).filter((m) => m.id && m.name))
    if (raws.length < MILESTONE_PAGE_SIZE) {
      break
    }
  }
  return collected
}

export async function listDoorayTemplates(
  client: DoorayClient,
  args: { projectId: string }
): Promise<DoorayTemplateSummary[]> {
  const response = await doorayRequest(
    client,
    `${doorayProjectPath(args.projectId)}/templates?size=100&page=0`
  )
  return asRecordArray(response.result)
    .map(mapDoorayTemplateSummary)
    .filter((template) => template.id && template.templateName)
}

export async function getDoorayTemplate(
  client: DoorayClient,
  args: { projectId: string; templateId: string }
): Promise<DoorayTemplate | null> {
  const response = await doorayRequest(
    client,
    `${doorayProjectPath(args.projectId)}/templates/${encodeURIComponent(args.templateId)}`
  )
  return isRecord(response.result) ? mapDoorayTemplate(args.templateId, response.result) : null
}

export async function listDoorayWorkflows(
  client: DoorayClient,
  args: { projectId: string }
): Promise<DoorayWorkflow[]> {
  const response = await doorayRequest(client, `${doorayProjectPath(args.projectId)}/workflows`)
  return asRecordArray(response.result)
    .map(mapDoorayWorkflow)
    .filter((workflow) => workflow.id && workflow.name)
}

export async function searchDoorayMembers(
  client: DoorayClient,
  args: { name: string }
): Promise<DoorayMember[]> {
  const params = new URLSearchParams({ name: args.name, size: '20', page: '0' })
  const response = await doorayRequest(client, `/common/v1/members?${params}`)
  return asRecordArray(response.result)
    .map(mapDoorayMember)
    .filter((member) => member.id && member.name)
}
