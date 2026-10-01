import type {
  DoorayComment,
  DoorayIssue,
  DoorayIssueFilter,
  DoorayIssueList,
  DoorayIssueOrder,
  DoorayListIssuesArgs
} from '../../../shared/extensions/dooray/dooray-types'
import { asRecordArray, asString, isRecord } from './dooray-json-guards'
import { mapDoorayComment, mapDoorayIssue } from './dooray-issue-mapping'
import { doorayRequest, type DoorayClient } from './dooray-request'

const ORDERS: readonly DoorayIssueOrder[] = ['createdAt', '-createdAt', 'updatedAt', '-updatedAt']
const FILTERS: readonly DoorayIssueFilter[] = ['assigned', 'all', 'done']

export function doorayProjectPath(projectId: string): string {
  return `/project/v1/projects/${encodeURIComponent(projectId)}`
}

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return Math.min(max, Math.max(min, Math.floor(value)))
}

export async function listDoorayIssues(
  client: DoorayClient,
  args: DoorayListIssuesArgs
): Promise<DoorayIssueList> {
  const filter = FILTERS.find((candidate) => candidate === args.filter) ?? 'assigned'
  const params = new URLSearchParams({
    page: String(clampInt(args.page, 0, 0, Number.MAX_SAFE_INTEGER)),
    size: String(clampInt(args.size, 30, 1, 100)),
    order: ORDERS.find((candidate) => candidate === args.order) ?? '-createdAt',
    postWorkflowClasses: filter === 'done' ? 'closed' : 'backlog,registered,working'
  })
  if (filter === 'assigned') {
    params.set('toMemberIds', client.viewer.id)
  }
  const response = await doorayRequest(
    client,
    `${doorayProjectPath(args.projectId)}/posts?${params}`
  )
  const raws = asRecordArray(response.result)
  return {
    totalCount: response.totalCount ?? raws.length,
    issues: raws.map((raw) => mapDoorayIssue(client, raw))
  }
}

export async function getDoorayIssue(
  client: DoorayClient,
  args: { projectId: string; postId: string }
): Promise<DoorayIssue | null> {
  const response = await doorayRequest(
    client,
    `${doorayProjectPath(args.projectId)}/posts/${encodeURIComponent(args.postId)}`
  )
  return isRecord(response.result) ? mapDoorayIssue(client, response.result) : null
}

export async function getDoorayIssueByNumber(
  client: DoorayClient,
  args: { projectId: string; postNumber: number }
): Promise<DoorayIssue | null> {
  const params = new URLSearchParams({ postNumber: String(args.postNumber), size: '2' })
  const response = await doorayRequest(
    client,
    `${doorayProjectPath(args.projectId)}/posts?${params}`
  )
  const postId = asString(asRecordArray(response.result)[0]?.id)
  return postId ? getDoorayIssue(client, { projectId: args.projectId, postId }) : null
}

export async function getDoorayIssueComments(
  client: DoorayClient,
  args: { projectId: string; postId: string }
): Promise<DoorayComment[]> {
  const response = await doorayRequest(
    client,
    `${doorayProjectPath(args.projectId)}/posts/${encodeURIComponent(args.postId)}/logs?page=0&size=100&order=createdAt`
  )
  return asRecordArray(response.result)
    .map(mapDoorayComment)
    .filter((comment) => comment.id && comment.body)
}
