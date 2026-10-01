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
    it('sorts by number numerically', () => {
      const issues: DoorayIssue[] = [
        {
          id: '1',
          projectId: 'p1',
          projectCode: 'TEST',
          number: 10,
          taskNumber: 'TEST/10',
          subject: 'Issue 10',
          workflowId: 'w1',
          workflowName: 'Open',
          workflowClass: 'registered',
          assignees: [],
          milestoneName: null,
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
          workflowId: 'w1',
          workflowName: 'Open',
          workflowClass: 'registered',
          assignees: [],
          milestoneName: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          url: 'http://test.com/2'
        }
      ]
      const sorted = sortDoorayIssues(issues, 'number', 'asc')
      expect(sorted.map((i) => i.number)).toEqual([2, 10])
    })

    it('does not mutate input', () => {
      const issues: DoorayIssue[] = [
        {
          id: '1',
          projectId: 'p1',
          projectCode: 'TEST',
          number: 2,
          taskNumber: 'TEST/2',
          subject: 'Issue 2',
          workflowId: 'w1',
          workflowName: 'Open',
          workflowClass: 'registered',
          assignees: [],
          milestoneName: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          url: 'http://test.com/1'
        },
        {
          id: '2',
          projectId: 'p1',
          projectCode: 'TEST',
          number: 1,
          taskNumber: 'TEST/1',
          subject: 'Issue 1',
          workflowId: 'w1',
          workflowName: 'Open',
          workflowClass: 'registered',
          assignees: [],
          milestoneName: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          url: 'http://test.com/2'
        }
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
