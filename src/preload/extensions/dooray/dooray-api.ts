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
} from '../../../shared/extensions/dooray/dooray-types'
import type { TaskBranchPreloadApi } from '../../../shared/extensions/dooray/task-branch-types'

type ProjectArgs = { projectId: string }
type PostArgs = { projectId: string; postId: string }

export type DoorayPreloadApi = {
  connect: (args: DoorayConnectArgs) => Promise<DoorayConnectResult>
  disconnect: () => Promise<void>
  status: () => Promise<DoorayStatus>
  testConnection: () => Promise<DoorayConnectResult>
  listProjects: () => Promise<DoorayProject[]>
  listIssues: (args: DoorayListIssuesArgs) => Promise<DoorayIssueList>
  getIssue: (args: PostArgs) => Promise<DoorayIssue | null>
  getIssueByNumber: (args: ProjectArgs & { postNumber: number }) => Promise<DoorayIssue | null>
  createIssue: (args: DoorayCreateIssueArgs) => Promise<DoorayCreateResult>
  listMilestones: (args: ProjectArgs) => Promise<DoorayMilestone[]>
  uploadIssueFile: (args: DoorayUploadIssueFileArgs) => Promise<DoorayMutationResult>
  listTags: (args: ProjectArgs) => Promise<DoorayTag[]>
  listTemplates: (args: ProjectArgs) => Promise<DoorayTemplateSummary[]>
  getTemplate: (args: ProjectArgs & { templateId: string }) => Promise<DoorayTemplate | null>
  searchMembers: (args: { name: string }) => Promise<DoorayMember[]>
  issueComments: (args: PostArgs) => Promise<DoorayComment[]>
  addIssueComment: (args: PostArgs & { body: string }) => Promise<DoorayCreateResult>
  listWorkflows: (args: ProjectArgs) => Promise<DoorayWorkflow[]>
  setWorkflow: (args: PostArgs & { workflowId: string }) => Promise<DoorayMutationResult>
  // Local git worktrees only; the web client has no IPC for it, so consumers must feature-check.
  taskBranch?: TaskBranchPreloadApi
}
