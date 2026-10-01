import { describe, it, expect } from 'vitest'
import type {
  DoorayIssue,
  DoorayPriority
} from '../../../../../shared/extensions/dooray/dooray-types'
import {
  doorayPriorityRank,
  sortDoorayIssues,
  filterDoorayIssues,
  defaultDooraySortDirection,
  doorayServerOrder
} from './dooray-issue-ordering'

describe('dooray-issue-ordering', () => {
  describe('doorayPriorityRank', () => {
    it('priority rank', () => {
      const priorities: (DoorayPriority | undefined)[] = ['lowest', undefined, 'highest', 'normal']
      const ranks = priorities.map((p) => doorayPriorityRank(p))
      expect(ranks).toEqual([4, 5, 0, 2])
    })
  })

  describe('doorayServerOrder', () => {
    it('server order only for created/updated', () => {
      expect(doorayServerOrder('updated', 'asc')).toBe('updatedAt')
      expect(doorayServerOrder('created', 'desc')).toBe('-createdAt')
      expect(doorayServerOrder('priority', 'asc')).toBeUndefined()
    })
  })

  describe('defaultDooraySortDirection', () => {
    it('created/updated default to desc, others asc', () => {
      expect(defaultDooraySortDirection('created')).toBe('desc')
      expect(defaultDooraySortDirection('updated')).toBe('desc')
      expect(defaultDooraySortDirection('number')).toBe('asc')
      expect(defaultDooraySortDirection('subject')).toBe('asc')
      expect(defaultDooraySortDirection('priority')).toBe('asc')
      expect(defaultDooraySortDirection('milestone')).toBe('asc')
      expect(defaultDooraySortDirection('workflow')).toBe('asc')
    })
  })

  describe('sortDoorayIssues', () => {
    const baseIssue: DoorayIssue = {
      id: '1',
      projectId: 'p1',
      projectCode: 'TEST',
      number: 1,
      taskNumber: 'TEST/1',
      subject: 'Alpha',
      workflowId: 'w1',
      workflowName: 'Backlog',
      workflowClass: 'backlog',
      assignees: [],
      priority: 'highest',
      milestoneName: 'v1.0',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      url: 'http://test.com/1'
    }

    it('sorts by number numerically', () => {
      const issues: DoorayIssue[] = [
        { ...baseIssue, id: '1', number: 10 },
        { ...baseIssue, id: '2', number: 2 }
      ]
      const sorted = sortDoorayIssues(issues, 'number', 'asc')
      expect(sorted.map((i) => i.number)).toEqual([2, 10])
    })

    it('sorts by subject with localeCompare asc', () => {
      const issues: DoorayIssue[] = [
        { ...baseIssue, id: '1', subject: 'Zebra' },
        { ...baseIssue, id: '2', subject: 'Alpha' }
      ]
      const sorted = sortDoorayIssues(issues, 'subject', 'asc')
      expect(sorted.map((i) => i.subject)).toEqual(['Alpha', 'Zebra'])
    })

    it('sorts by subject desc', () => {
      const issues: DoorayIssue[] = [
        { ...baseIssue, id: '1', subject: 'Zebra' },
        { ...baseIssue, id: '2', subject: 'Alpha' }
      ]
      const sorted = sortDoorayIssues(issues, 'subject', 'desc')
      expect(sorted.map((i) => i.subject)).toEqual(['Zebra', 'Alpha'])
    })

    it('sorts by workflow with localeCompare asc', () => {
      const issues: DoorayIssue[] = [
        { ...baseIssue, id: '1', workflowName: 'Working' },
        { ...baseIssue, id: '2', workflowName: 'Backlog' }
      ]
      const sorted = sortDoorayIssues(issues, 'workflow', 'asc')
      expect(sorted.map((i) => i.workflowName)).toEqual(['Backlog', 'Working'])
    })

    it('sorts by workflow desc', () => {
      const issues: DoorayIssue[] = [
        { ...baseIssue, id: '1', workflowName: 'Backlog' },
        { ...baseIssue, id: '2', workflowName: 'Working' }
      ]
      const sorted = sortDoorayIssues(issues, 'workflow', 'desc')
      expect(sorted.map((i) => i.workflowName)).toEqual(['Working', 'Backlog'])
    })

    it('sorts by milestone asc with nulls last', () => {
      const issues: DoorayIssue[] = [
        { ...baseIssue, id: '1', milestoneName: null },
        { ...baseIssue, id: '2', milestoneName: 'v2.0' },
        { ...baseIssue, id: '3', milestoneName: 'v1.0' }
      ]
      const sorted = sortDoorayIssues(issues, 'milestone', 'asc')
      expect(sorted.map((i) => i.milestoneName)).toEqual(['v1.0', 'v2.0', null])
    })

    it('sorts by milestone desc with nulls last', () => {
      const issues: DoorayIssue[] = [
        { ...baseIssue, id: '1', milestoneName: null },
        { ...baseIssue, id: '2', milestoneName: 'v2.0' },
        { ...baseIssue, id: '3', milestoneName: 'v1.0' }
      ]
      const sorted = sortDoorayIssues(issues, 'milestone', 'desc')
      expect(sorted.map((i) => i.milestoneName)).toEqual(['v2.0', 'v1.0', null])
    })

    it('sorts by priority asc (highest to lowest)', () => {
      const issues: DoorayIssue[] = [
        { ...baseIssue, id: '1', priority: 'lowest' },
        { ...baseIssue, id: '2', priority: 'highest' },
        { ...baseIssue, id: '3', priority: 'normal' }
      ]
      const sorted = sortDoorayIssues(issues, 'priority', 'asc')
      expect(sorted.map((i) => i.priority)).toEqual(['highest', 'normal', 'lowest'])
    })

    it('sorts by priority desc (lowest to highest)', () => {
      const issues: DoorayIssue[] = [
        { ...baseIssue, id: '1', priority: 'highest' },
        { ...baseIssue, id: '2', priority: 'lowest' },
        { ...baseIssue, id: '3', priority: 'normal' }
      ]
      const sorted = sortDoorayIssues(issues, 'priority', 'desc')
      expect(sorted.map((i) => i.priority)).toEqual(['lowest', 'normal', 'highest'])
    })

    it('sorts by priority with unset last in asc', () => {
      const issues: DoorayIssue[] = [
        { ...baseIssue, id: '1', priority: undefined },
        { ...baseIssue, id: '2', priority: 'highest' },
        { ...baseIssue, id: '3', priority: 'lowest' }
      ]
      const sorted = sortDoorayIssues(issues, 'priority', 'asc')
      expect(sorted.map((i) => i.priority)).toEqual(['highest', 'lowest', undefined])
    })

    it('sorts by priority with unset last in desc', () => {
      const issues: DoorayIssue[] = [
        { ...baseIssue, id: '1', priority: undefined },
        { ...baseIssue, id: '2', priority: 'highest' },
        { ...baseIssue, id: '3', priority: 'lowest' }
      ]
      const sorted = sortDoorayIssues(issues, 'priority', 'desc')
      expect(sorted.map((i) => i.priority)).toEqual(['lowest', 'highest', undefined])
    })

    it('sorts by created asc', () => {
      const issues: DoorayIssue[] = [
        { ...baseIssue, id: '1', createdAt: '2026-01-03T00:00:00Z' },
        { ...baseIssue, id: '2', createdAt: '2026-01-01T00:00:00Z' }
      ]
      const sorted = sortDoorayIssues(issues, 'created', 'asc')
      expect(sorted.map((i) => i.createdAt)).toEqual([
        '2026-01-01T00:00:00Z',
        '2026-01-03T00:00:00Z'
      ])
    })

    it('sorts by created desc', () => {
      const issues: DoorayIssue[] = [
        { ...baseIssue, id: '1', createdAt: '2026-01-01T00:00:00Z' },
        { ...baseIssue, id: '2', createdAt: '2026-01-03T00:00:00Z' }
      ]
      const sorted = sortDoorayIssues(issues, 'created', 'desc')
      expect(sorted.map((i) => i.createdAt)).toEqual([
        '2026-01-03T00:00:00Z',
        '2026-01-01T00:00:00Z'
      ])
    })

    it('sorts by updated asc', () => {
      const issues: DoorayIssue[] = [
        { ...baseIssue, id: '1', updatedAt: '2026-01-03T00:00:00Z' },
        { ...baseIssue, id: '2', updatedAt: '2026-01-01T00:00:00Z' }
      ]
      const sorted = sortDoorayIssues(issues, 'updated', 'asc')
      expect(sorted.map((i) => i.updatedAt)).toEqual([
        '2026-01-01T00:00:00Z',
        '2026-01-03T00:00:00Z'
      ])
    })

    it('sorts by updated desc', () => {
      const issues: DoorayIssue[] = [
        { ...baseIssue, id: '1', updatedAt: '2026-01-01T00:00:00Z' },
        { ...baseIssue, id: '2', updatedAt: '2026-01-03T00:00:00Z' }
      ]
      const sorted = sortDoorayIssues(issues, 'updated', 'desc')
      expect(sorted.map((i) => i.updatedAt)).toEqual([
        '2026-01-03T00:00:00Z',
        '2026-01-01T00:00:00Z'
      ])
    })

    it('does not mutate input', () => {
      const issues: DoorayIssue[] = [
        { ...baseIssue, id: '1', number: 2 },
        { ...baseIssue, id: '2', number: 1 }
      ]
      const original = issues.map((i) => i.number)
      sortDoorayIssues(issues, 'number', 'asc')
      expect(issues.map((i) => i.number)).toEqual(original)
    })
  })

  describe('filterDoorayIssues', () => {
    const issues: DoorayIssue[] = [
      {
        id: '1',
        projectId: 'p1',
        projectCode: 'TEST',
        number: 1,
        taskNumber: 'TEST/1',
        subject: 'Issue 1',
        workflowId: 'w1',
        workflowName: 'Open',
        workflowClass: 'registered',
        assignees: [],
        priority: 'high',
        milestoneName: 'v1.0',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        url: 'http://test.com/1'
      },
      {
        id: '2',
        projectId: 'p1',
        projectCode: 'TEST',
        number: 2,
        taskNumber: 'TEST/2',
        subject: 'Issue 2',
        workflowId: 'w2',
        workflowName: 'In Progress',
        workflowClass: 'working',
        assignees: [],
        priority: undefined,
        milestoneName: null,
        createdAt: '2026-01-02',
        updatedAt: '2026-01-02',
        url: 'http://test.com/2'
      }
    ]

    it('filters by milestone name', () => {
      const filtered = filterDoorayIssues(issues, { milestoneName: 'v1.0' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].number).toBe(1)
    })

    it('filters by workflow id', () => {
      const filtered = filterDoorayIssues(issues, { workflowId: 'w2' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].number).toBe(2)
    })

    it('filters by priority', () => {
      const filtered = filterDoorayIssues(issues, { priority: 'high' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].number).toBe(1)
    })

    it('matches none priority to missing priority', () => {
      const filtered = filterDoorayIssues(issues, { priority: 'none' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].number).toBe(2)
    })

    it('returns all issues when no filters', () => {
      const filtered = filterDoorayIssues(issues, {})
      expect(filtered).toHaveLength(2)
    })
  })
})
