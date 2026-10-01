import type {
  DoorayCreateIssueArgs,
  DoorayCreateResult,
  DoorayMutationResult,
  DoorayUploadIssueFileArgs
} from '../../../shared/extensions/dooray/dooray-types'
import { asRecord, asString } from './dooray-json-guards'
import { toPriority } from './dooray-issue-mapping'
import { doorayProjectPath } from './dooray-issue-queries'
import { DOORAY_UPLOAD_TIMEOUT_MS, doorayRequest, type DoorayClient } from './dooray-request'

const MARKDOWN = 'text/x-markdown'

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function cleanIds(ids: string[] | undefined): string[] {
  return (ids ?? []).map((id) => id.trim()).filter(Boolean)
}

function toMemberRefs(ids: string[] | undefined) {
  return cleanIds(ids).map((id) => ({ type: 'member', member: { organizationMemberId: id } }))
}

export async function createDoorayIssue(
  client: DoorayClient,
  args: DoorayCreateIssueArgs
): Promise<DoorayCreateResult> {
  const to = toMemberRefs(args.toMemberIds)
  const cc = toMemberRefs(args.ccMemberIds)
  const tagIds = cleanIds(args.tagIds)
  const milestoneId = args.milestoneId?.trim()
  const priority = toPriority(args.priority)
  try {
    const response = await doorayRequest(client, `${doorayProjectPath(args.projectId)}/posts`, {
      method: 'POST',
      body: JSON.stringify({
        subject: args.subject,
        body: { mimeType: MARKDOWN, content: args.body ?? '' },
        ...(to.length > 0 || cc.length > 0
          ? { users: { ...(to.length > 0 ? { to } : {}), ...(cc.length > 0 ? { cc } : {}) } }
          : {}),
        ...(tagIds.length > 0 ? { tagIds } : {}),
        ...(priority && priority !== 'none' ? { priority } : {}),
        ...(milestoneId ? { milestoneId } : {})
      })
    })
    return { ok: true, id: asString(asRecord(response.result).id) }
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'Task creation failed.') }
  }
}

export async function addDoorayIssueComment(
  client: DoorayClient,
  args: { projectId: string; postId: string; body: string }
): Promise<DoorayCreateResult> {
  try {
    const response = await doorayRequest(
      client,
      `${doorayProjectPath(args.projectId)}/posts/${encodeURIComponent(args.postId)}/logs`,
      { method: 'POST', body: JSON.stringify({ body: { mimeType: MARKDOWN, content: args.body } }) }
    )
    return { ok: true, id: asString(asRecord(response.result).id) }
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'Comment failed.') }
  }
}

export async function setDoorayWorkflow(
  client: DoorayClient,
  args: { projectId: string; postId: string; workflowId: string }
): Promise<DoorayMutationResult> {
  try {
    await doorayRequest(
      client,
      `${doorayProjectPath(args.projectId)}/posts/${encodeURIComponent(args.postId)}/set-workflow`,
      { method: 'POST', body: JSON.stringify({ workflowId: args.workflowId }) }
    )
    return { ok: true }
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'Workflow update failed.') }
  }
}

export async function uploadDoorayIssueFile(
  client: DoorayClient,
  args: DoorayUploadIssueFileArgs
): Promise<DoorayMutationResult> {
  const { file } = args
  const bytes = Buffer.from(file.dataBase64, 'base64')
  if (bytes.byteLength === 0) {
    return { ok: false, error: `${file.name}: attachment is empty.` }
  }
  const form = new FormData()
  form.append(
    'file',
    new Blob([bytes], { type: file.mimeType || 'application/octet-stream' }),
    file.name
  )
  try {
    await doorayRequest(
      client,
      `${doorayProjectPath(args.projectId)}/posts/${encodeURIComponent(args.postId)}/files`,
      { method: 'POST', body: form, timeoutMs: DOORAY_UPLOAD_TIMEOUT_MS }
    )
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? `${file.name}: ${error.message}` : `${file.name}: upload failed.`
    }
  }
}
