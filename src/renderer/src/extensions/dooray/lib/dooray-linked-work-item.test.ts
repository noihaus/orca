// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useComposerState } from '@/hooks/useComposerState'
import { useAppStore } from '@/store'
import { makeDoorayIssue } from '../issue/dooray-issue-fixture'
import { buildDoorayLinkedWorkItem, getDoorayIssueWorkspaceSeed } from './dooray-linked-work-item'

const issue = makeDoorayIssue({
  taskNumber: 'dooray-D-TF/2619',
  subject: 'Fix login',
  url: 'https://nhn.dooray.com/project/tasks/1'
})

describe('buildDoorayLinkedWorkItem', () => {
  it('reuses jiraIdentifier and pins the exact branch', () => {
    expect(buildDoorayLinkedWorkItem(issue)).toEqual({
      type: 'issue',
      number: 0,
      title: 'dooray-D-TF/2619 Fix login',
      url: 'https://nhn.dooray.com/project/tasks/1',
      jiraIdentifier: 'dooray-D-TF/2619',
      branchNameOverride: 'feature/dooray-D-TF/2619'
    })
  })

  it('derives a non-empty workspace seed', () => {
    expect(getDoorayIssueWorkspaceSeed(issue).length).toBeGreaterThan(0)
  })
})

describe('composer seeded with a Dooray task', () => {
  let originalApi: PropertyDescriptor | undefined
  beforeEach(() => {
    originalApi = Object.getOwnPropertyDescriptor(window, 'api')
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        preflight: { detectAgents: vi.fn().mockResolvedValue([]) },
        ui: { onFileDrop: vi.fn(() => vi.fn()) }
      }
    })
  })
  afterEach(() => {
    if (originalApi) {
      Object.defineProperty(window, 'api', originalApi)
    } else {
      Reflect.deleteProperty(window, 'api')
    }
  })

  it('keeps the linked item (no Jira source context) and the exact branch', () => {
    useAppStore.setState({ repos: [], projects: [], projectGroups: [], newWorkspaceDraft: null })
    const item = buildDoorayLinkedWorkItem(issue)
    const { result } = renderHook(() =>
      useComposerState({
        initialName: getDoorayIssueWorkspaceSeed(issue),
        initialLinkedWorkItem: item,
        persistDraft: false,
        createGateMode: 'quick'
      })
    )
    expect(result.current.cardProps.linkedWorkItem).toEqual(item)
    expect(result.current.cardProps.branchNameOverride).toBe('feature/dooray-D-TF/2619')
  })
})
