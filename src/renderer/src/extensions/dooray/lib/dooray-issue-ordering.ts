import type {
  DoorayIssue,
  DoorayIssueOrder,
  DoorayPriority
} from '../../../../../shared/extensions/dooray/dooray-types'

export type DooraySortKey =
  | 'number'
  | 'subject'
  | 'workflow'
  | 'milestone'
  | 'priority'
  | 'created'
  | 'updated'

export function doorayPriorityRank(p?: DoorayPriority): number {
  if (p === 'highest') {
    return 0
  }
  if (p === 'high') {
    return 1
  }
  if (p === 'normal') {
    return 2
  }
  if (p === 'low') {
    return 3
  }
  if (p === 'lowest') {
    return 4
  }
  return 5
}

export function sortDoorayIssues(
  issues: DoorayIssue[],
  key: DooraySortKey,
  dir: 'asc' | 'desc'
): DoorayIssue[] {
  const sorted = [...issues]

  sorted.sort((a, b) => {
    let cmp = 0

    switch (key) {
      case 'number':
        cmp = a.number - b.number
        break
      case 'subject':
        cmp = a.subject.localeCompare(b.subject)
        break
      case 'workflow':
        cmp = a.workflowName.localeCompare(b.workflowName)
        break
      case 'milestone': {
        const aNull = a.milestoneName == null
        const bNull = b.milestoneName == null
        if (aNull && bNull) {
          cmp = 0
        } else if (aNull) {
          cmp = 1
        } else if (bNull) {
          cmp = -1
        } else if (a.milestoneName && b.milestoneName) {
          cmp = a.milestoneName.localeCompare(b.milestoneName)
        }
        break
      }
      case 'priority': {
        // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: priority is subset of DoorayPriority
        const aRank = doorayPriorityRank(a.priority as DoorayPriority)
        // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: priority is subset of DoorayPriority
        const bRank = doorayPriorityRank(b.priority as DoorayPriority)
        cmp = aRank - bRank
        break
      }
      case 'created':
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'updated':
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        break
    }

    return dir === 'asc' ? cmp : -cmp
  })

  return sorted
}

export function filterDoorayIssues(
  issues: DoorayIssue[],
  f: { milestoneName?: string; workflowId?: string; priority?: DoorayPriority }
): DoorayIssue[] {
  return issues.filter((issue) => {
    if (f.milestoneName !== undefined && issue.milestoneName !== f.milestoneName) {
      return false
    }
    if (f.workflowId !== undefined && issue.workflowId !== f.workflowId) {
      return false
    }
    if (f.priority !== undefined) {
      if (f.priority === 'none') {
        if (issue.priority !== undefined) {
          return false
        }
      } else if (issue.priority !== f.priority) {
        return false
      }
    }
    return true
  })
}

export function defaultDooraySortDirection(key: DooraySortKey): 'asc' | 'desc' {
  if (key === 'created' || key === 'updated') {
    return 'desc'
  }
  return 'asc'
}

export function doorayServerOrder(
  key: DooraySortKey,
  dir: 'asc' | 'desc'
): DoorayIssueOrder | undefined {
  if (key === 'created') {
    return dir === 'asc' ? 'createdAt' : '-createdAt'
  }
  if (key === 'updated') {
    return dir === 'asc' ? 'updatedAt' : '-updatedAt'
  }
  return undefined
}
