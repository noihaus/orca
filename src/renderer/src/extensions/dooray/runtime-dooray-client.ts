import type {
  DoorayComment,
  DoorayConnectArgs,
  DoorayConnectResult,
  DoorayCreateIssueArgs,
  DoorayCreateResult,
  DoorayIssue,
  DoorayIssueList,
  DoorayListIssuesArgs,
  DoorayMember,
  DoorayMilestone,
  DoorayMutationResult,
  DoorayProject,
  DoorayStatus,
  DoorayTag,
  DoorayTemplate,
  DoorayTemplateSummary,
  DoorayUploadIssueFileArgs,
  DoorayWorkflow
} from '../../../../shared/extensions/dooray/dooray-types'
import { callRuntimeRpc, RuntimeRpcCallError } from '@/runtime/runtime-rpc-client'
import { getJiraRuntimeTarget, type RuntimeJiraSettings } from '@/runtime/runtime-jira-target'

export type RuntimeDooraySettings = RuntimeJiraSettings

type ProjectArgs = { projectId: string }
type PostArgs = { projectId: string; postId: string }

export class DoorayRemoteUnsupportedError extends Error {
  constructor(method: string) {
    super(`The connected Orca host does not support ${method}. Update the host to use Dooray.`)
    this.name = 'DoorayRemoteUnsupportedError'
  }
}

const SHORT_TIMEOUT_MS = 15_000
const DEFAULT_TIMEOUT_MS = 30_000
const UPLOAD_TIMEOUT_MS = 120_000

async function dispatch<TResult>(
  settings: RuntimeDooraySettings,
  method: string,
  args: unknown,
  timeoutMs: number,
  local: () => Promise<TResult>
): Promise<TResult> {
  const target = getJiraRuntimeTarget(settings)
  if (target.kind !== 'environment') {
    return local()
  }
  try {
    return await callRuntimeRpc<TResult>(target, `dooray.${method}`, args, { timeoutMs })
  } catch (error) {
    if (error instanceof RuntimeRpcCallError && error.code === 'method_not_found') {
      throw new DoorayRemoteUnsupportedError(`dooray.${method}`)
    }
    throw error
  }
}

export const doorayStatus = (settings: RuntimeDooraySettings): Promise<DoorayStatus> =>
  dispatch(settings, 'status', undefined, SHORT_TIMEOUT_MS, () => window.api.dooray.status())

export const doorayConnect = (
  settings: RuntimeDooraySettings,
  args: DoorayConnectArgs
): Promise<DoorayConnectResult> =>
  dispatch(settings, 'connect', args, DEFAULT_TIMEOUT_MS, () => window.api.dooray.connect(args))

export const doorayDisconnect = (settings: RuntimeDooraySettings): Promise<void> =>
  dispatch(settings, 'disconnect', undefined, SHORT_TIMEOUT_MS, () =>
    window.api.dooray.disconnect()
  )

export const doorayTestConnection = (
  settings: RuntimeDooraySettings
): Promise<DoorayConnectResult> =>
  dispatch(settings, 'testConnection', undefined, DEFAULT_TIMEOUT_MS, () =>
    window.api.dooray.testConnection()
  )

export const doorayListProjects = (settings: RuntimeDooraySettings): Promise<DoorayProject[]> =>
  dispatch(settings, 'listProjects', undefined, DEFAULT_TIMEOUT_MS, () =>
    window.api.dooray.listProjects()
  )

export const doorayListIssues = (
  settings: RuntimeDooraySettings,
  args: DoorayListIssuesArgs
): Promise<DoorayIssueList> =>
  dispatch(settings, 'listIssues', args, DEFAULT_TIMEOUT_MS, () =>
    window.api.dooray.listIssues(args)
  )

export const doorayGetIssue = (
  settings: RuntimeDooraySettings,
  args: PostArgs
): Promise<DoorayIssue | null> =>
  dispatch(settings, 'getIssue', args, DEFAULT_TIMEOUT_MS, () => window.api.dooray.getIssue(args))

export const doorayGetIssueByNumber = (
  settings: RuntimeDooraySettings,
  args: ProjectArgs & { postNumber: number }
): Promise<DoorayIssue | null> =>
  dispatch(settings, 'getIssueByNumber', args, DEFAULT_TIMEOUT_MS, () =>
    window.api.dooray.getIssueByNumber(args)
  )

export const doorayCreateIssue = (
  settings: RuntimeDooraySettings,
  args: DoorayCreateIssueArgs
): Promise<DoorayCreateResult> =>
  dispatch(settings, 'createIssue', args, DEFAULT_TIMEOUT_MS, () =>
    window.api.dooray.createIssue(args)
  )

export const doorayListMilestones = (
  settings: RuntimeDooraySettings,
  args: ProjectArgs
): Promise<DoorayMilestone[]> =>
  dispatch(settings, 'listMilestones', args, DEFAULT_TIMEOUT_MS, () =>
    window.api.dooray.listMilestones(args)
  )

export const doorayUploadIssueFile = (
  settings: RuntimeDooraySettings,
  args: DoorayUploadIssueFileArgs
): Promise<DoorayMutationResult> =>
  dispatch(settings, 'uploadIssueFile', args, UPLOAD_TIMEOUT_MS, () =>
    window.api.dooray.uploadIssueFile(args)
  )

export const doorayListTags = (
  settings: RuntimeDooraySettings,
  args: ProjectArgs
): Promise<DoorayTag[]> =>
  dispatch(settings, 'listTags', args, DEFAULT_TIMEOUT_MS, () => window.api.dooray.listTags(args))

export const doorayListTemplates = (
  settings: RuntimeDooraySettings,
  args: ProjectArgs
): Promise<DoorayTemplateSummary[]> =>
  dispatch(settings, 'listTemplates', args, DEFAULT_TIMEOUT_MS, () =>
    window.api.dooray.listTemplates(args)
  )

export const doorayGetTemplate = (
  settings: RuntimeDooraySettings,
  args: ProjectArgs & { templateId: string }
): Promise<DoorayTemplate | null> =>
  dispatch(settings, 'getTemplate', args, DEFAULT_TIMEOUT_MS, () =>
    window.api.dooray.getTemplate(args)
  )

export const doorayListWorkflows = (
  settings: RuntimeDooraySettings,
  args: ProjectArgs
): Promise<DoorayWorkflow[]> =>
  dispatch(settings, 'listWorkflows', args, DEFAULT_TIMEOUT_MS, () =>
    window.api.dooray.listWorkflows(args)
  )

export const doorayIssueComments = (
  settings: RuntimeDooraySettings,
  args: PostArgs
): Promise<DoorayComment[]> =>
  dispatch(settings, 'issueComments', args, DEFAULT_TIMEOUT_MS, () =>
    window.api.dooray.issueComments(args)
  )

export const doorayAddIssueComment = (
  settings: RuntimeDooraySettings,
  args: PostArgs & { body: string }
): Promise<DoorayCreateResult> =>
  dispatch(settings, 'addIssueComment', args, DEFAULT_TIMEOUT_MS, () =>
    window.api.dooray.addIssueComment(args)
  )

export const dooraySearchMembers = (
  settings: RuntimeDooraySettings,
  args: { name: string }
): Promise<DoorayMember[]> =>
  dispatch(settings, 'searchMembers', args, SHORT_TIMEOUT_MS, () =>
    window.api.dooray.searchMembers(args)
  )

export const dooraySetWorkflow = (
  settings: RuntimeDooraySettings,
  args: PostArgs & { workflowId: string }
): Promise<DoorayMutationResult> =>
  dispatch(settings, 'setWorkflow', args, DEFAULT_TIMEOUT_MS, () =>
    window.api.dooray.setWorkflow(args)
  )

// The single data access point for Dooray UI: components never import the ops above directly.
export function getDoorayApi(settings: RuntimeDooraySettings) {
  return {
    status: () => doorayStatus(settings),
    connect: (args: DoorayConnectArgs) => doorayConnect(settings, args),
    disconnect: () => doorayDisconnect(settings),
    testConnection: () => doorayTestConnection(settings),
    listProjects: () => doorayListProjects(settings),
    listIssues: (args: DoorayListIssuesArgs) => doorayListIssues(settings, args),
    getIssue: (args: PostArgs) => doorayGetIssue(settings, args),
    getIssueByNumber: (args: ProjectArgs & { postNumber: number }) =>
      doorayGetIssueByNumber(settings, args),
    createIssue: (args: DoorayCreateIssueArgs) => doorayCreateIssue(settings, args),
    listMilestones: (args: ProjectArgs) => doorayListMilestones(settings, args),
    uploadIssueFile: (args: DoorayUploadIssueFileArgs) => doorayUploadIssueFile(settings, args),
    listTags: (args: ProjectArgs) => doorayListTags(settings, args),
    listTemplates: (args: ProjectArgs) => doorayListTemplates(settings, args),
    getTemplate: (args: ProjectArgs & { templateId: string }) => doorayGetTemplate(settings, args),
    searchMembers: (args: { name: string }) => dooraySearchMembers(settings, args),
    issueComments: (args: PostArgs) => doorayIssueComments(settings, args),
    addIssueComment: (args: PostArgs & { body: string }) => doorayAddIssueComment(settings, args),
    listWorkflows: (args: ProjectArgs) => doorayListWorkflows(settings, args),
    setWorkflow: (args: PostArgs & { workflowId: string }) => dooraySetWorkflow(settings, args)
  }
}

export type DoorayApi = ReturnType<typeof getDoorayApi>
