import type {
  DoorayIssue,
  DoorayProject
} from '../../../../../shared/extensions/dooray/dooray-types'

export function slugifyDoorayRef(value: string): string {
  return value
    .toLowerCase()
    .replace(/^refs\/heads\//, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

export function getDoorayTaskBranchName(issue: Pick<DoorayIssue, 'taskNumber'>): string {
  return `feature/${issue.taskNumber}`
}

export function findDoorayWorkspaceMatch<
  W extends { branch?: string; displayName?: string; isArchived?: boolean; lastActivityAt?: number }
>(wts: W[], taskNumber: string): W | null {
  const taskSlug = slugifyDoorayRef(taskNumber)

  if (!taskSlug) {
    return null
  }

  let matched: W | null = null
  let latestActivity = -Infinity

  for (const wt of wts) {
    if (wt.isArchived) {
      continue
    }

    const branchMatch = wt.branch
      ? slugifyDoorayRef(wt.branch).match(new RegExp(`(^|-)${taskSlug}(-|$)`))
      : null
    const displayNameMatch = wt.displayName
      ? slugifyDoorayRef(wt.displayName).match(new RegExp(`(^|-)${taskSlug}(-|$)`))
      : null

    if (branchMatch || displayNameMatch) {
      const activity = wt.lastActivityAt ?? -Infinity
      if (matched === null || activity > latestActivity) {
        latestActivity = activity
        matched = wt
      }
    }
  }

  return matched
}

export function parseDoorayTaskFromBranch(
  branch: string | null | undefined,
  projects: DoorayProject[]
): { project: DoorayProject; postNumber: number } | null {
  if (!branch) {
    return null
  }

  const branchSlug = slugifyDoorayRef(branch)

  const sortedProjects = [...projects].sort((a, b) => b.code.length - a.code.length)

  for (const project of sortedProjects) {
    const codeSlug = slugifyDoorayRef(project.code)
    const match = branchSlug.match(new RegExp(`(^|-)${codeSlug}-(\\d+)(-|$)`))
    if (match) {
      const postNumber = Number.parseInt(match[2], 10)
      return { project, postNumber }
    }
  }

  return null
}
