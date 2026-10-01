import { describe, expect, it } from 'vitest'
import { mapDoorayIssue, mapDoorayTemplate, toWorkflowClass } from './dooray-issue-mapping'
import { makeTestDoorayClient } from './dooray-test-client'

const client = makeTestDoorayClient()

describe('Dooray issue mapping', () => {
  it('maps a raw post', () => {
    expect(
      mapDoorayIssue(client, {
        id: 'p9',
        number: 7,
        taskNumber: 'ORCA/7',
        subject: 'S',
        project: { id: 'pr', code: 'ORCA' },
        workflow: { id: 'w', name: 'Working' },
        workflowClass: 'working',
        users: { to: [{ member: { name: 'Kim' } }, { member: {} }] },
        priority: 'high',
        milestone: { name: 'M1' },
        body: { content: 'B' },
        createdAt: 'c',
        updatedAt: 'u'
      })
    ).toEqual({
      id: 'p9',
      projectId: 'pr',
      projectCode: 'ORCA',
      number: 7,
      taskNumber: 'ORCA/7',
      subject: 'S',
      body: 'B',
      workflowId: 'w',
      workflowName: 'Working',
      workflowClass: 'working',
      assignees: ['Kim'],
      priority: 'high',
      milestoneName: 'M1',
      createdAt: 'c',
      updatedAt: 'u',
      url: 'https://nhnent.dooray.com/project/tasks/p9'
    })
  })

  it('taskNumber falls back to code/number then number; url empty without webUrl', () => {
    const noWeb = makeTestDoorayClient({ webUrl: null })
    const a = mapDoorayIssue(noWeb, { id: 'a', number: 3, project: { code: 'X' } })
    expect(a.taskNumber).toBe('X/3')
    expect(a.url).toBe('')
    expect(mapDoorayIssue(client, { id: 'b', number: 4 }).taskNumber).toBe('4')
  })

  it('unknown workflow class becomes registered; priority none is omitted', () => {
    expect(toWorkflowClass('weird')).toBe('registered')
    expect(toWorkflowClass('closed')).toBe('closed')
    const issue = mapDoorayIssue(client, { id: 'a', workflowClass: 'x', priority: 'none' })
    expect(issue.workflowClass).toBe('registered')
    expect(issue).not.toHaveProperty('priority')
    expect(issue).not.toHaveProperty('body')
  })

  it('maps a template, dropping invalid priority and memberless entries', () => {
    expect(
      mapDoorayTemplate('t1', {
        templateName: 'T',
        subject: 's',
        body: { content: 'b' },
        guide: 'g',
        tags: [{ id: 'x' }, {}],
        priority: 'bogus',
        users: {
          to: [{ member: { organizationMemberId: 'm', name: 'N' } }, { member: {} }],
          cc: 'nope'
        }
      })
    ).toEqual({
      id: 't1',
      templateName: 'T',
      subject: 's',
      body: 'b',
      guide: 'g',
      tagIds: ['x'],
      priority: 'none',
      toMembers: [{ id: 'm', name: 'N', userCode: '' }],
      ccMembers: []
    })
  })
})
