export type DoorayViewer = { id: string; name: string; userCode: string; email: string | null }
export type DoorayStatus =
  | { connected: false; viewer: null }
  | {
      connected: true
      viewer: DoorayViewer
      apiUrl: string
      webUrl?: string
      credentialError?: string
    }
export type DoorayConnectArgs = { apiUrl?: string; webUrl?: string; apiToken: string }
export type DoorayConnectResult = { ok: true; viewer: DoorayViewer } | { ok: false; error: string }
export type DoorayMutationResult = { ok: true } | { ok: false; error: string }
export type DoorayCreateResult = { ok: true; id: string } | { ok: false; error: string }
export type DoorayIssueFilter = 'assigned' | 'all' | 'done'
export type DoorayIssueOrder = 'createdAt' | '-createdAt' | 'updatedAt' | '-updatedAt'
// Unknown workflow classes map to 'registered'.
export type DoorayWorkflowClass = 'backlog' | 'registered' | 'working' | 'closed'
export type DoorayPriority = 'highest' | 'high' | 'normal' | 'low' | 'lowest' | 'none'
export type DoorayProject = { id: string; code: string }
export type DoorayIssue = {
  id: string
  projectId: string
  projectCode: string
  number: number
  // raw.taskNumber ?? `${projectCode}/${number}` ?? `${number}`
  taskNumber: string
  subject: string
  body?: string
  workflowId: string
  workflowName: string
  workflowClass: DoorayWorkflowClass
  // users.to[].member.name
  assignees: string[]
  priority?: Exclude<DoorayPriority, 'none'>
  milestoneName: string | null
  createdAt: string
  updatedAt: string
  url: string
}
export type DoorayIssueList = { totalCount: number; issues: DoorayIssue[] }
export type DoorayListIssuesArgs = {
  projectId: string
  filter?: DoorayIssueFilter
  page?: number
  size?: number
  order?: DoorayIssueOrder
}
// authorName: creator.member.name || creator.name
export type DoorayComment = { id: string; body: string; createdAt: string; authorName: string }
export type DoorayWorkflow = { id: string; name: string; workflowClass: DoorayWorkflowClass }
export type DoorayTagGroup = { id: string; name: string; mandatory: boolean; selectOne: boolean }
export type DoorayTag = { id: string; name: string; tagGroup?: DoorayTagGroup }
export type DoorayMilestone = {
  id: string
  name: string
  startedAt: string
  endedAt: string
  status: 'open' | 'closed'
}
export type DoorayTemplateSummary = { id: string; templateName: string; isDefault: boolean }
export type DoorayMember = { id: string; name: string; userCode: string }
export type DoorayTemplate = {
  id: string
  templateName: string
  subject: string
  body: string
  guide: string
  tagIds: string[]
  priority: DoorayPriority
  toMembers: DoorayMember[]
  ccMembers: DoorayMember[]
}
export type DoorayCreateIssueArgs = {
  projectId: string
  subject: string
  body?: string
  tagIds?: string[]
  toMemberIds?: string[]
  ccMemberIds?: string[]
  priority?: DoorayPriority
  milestoneId?: string
}
export type DoorayUploadFile = { name: string; mimeType?: string; dataBase64: string }
export type DoorayUploadIssueFileArgs = {
  projectId: string
  postId: string
  file: DoorayUploadFile
}
export type DoorayStartMode = 'new-worktree' | 'existing-workspace'
export type RepoDoorayStart = {
  mode: DoorayStartMode
  targetWorktreeId?: string | null
  submodulePaths?: string[]
}
