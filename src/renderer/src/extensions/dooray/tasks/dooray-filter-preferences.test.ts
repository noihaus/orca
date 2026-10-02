// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_DOORAY_LIST_PREFERENCES,
  readDoorayListPreferences,
  readDoorayProjectFilterPreferences,
  writeDoorayListPreferences,
  writeDoorayProjectFilterPreferences
} from './dooray-filter-preferences'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('dooray list preferences', () => {
  it('returns defaults when nothing is stored', () => {
    expect(readDoorayListPreferences('tasks')).toEqual(DEFAULT_DOORAY_LIST_PREFERENCES)
  })

  it('round-trips scope filter, sort key, direction and server order per surface', () => {
    writeDoorayListPreferences('tasks', {
      filter: 'done',
      sortKey: 'priority',
      sortDir: 'asc',
      serverOrder: 'updatedAt'
    })
    expect(readDoorayListPreferences('tasks')).toEqual({
      filter: 'done',
      sortKey: 'priority',
      sortDir: 'asc',
      serverOrder: 'updatedAt'
    })
    expect(readDoorayListPreferences('sidebar')).toEqual(DEFAULT_DOORAY_LIST_PREFERENCES)
  })

  it('falls back per field when stored values are invalid', () => {
    window.localStorage.setItem(
      'orca:dooray-list-preferences:tasks',
      JSON.stringify({ filter: 'mine', sortKey: 'subject', sortDir: 'sideways', serverOrder: 7 })
    )
    expect(readDoorayListPreferences('tasks')).toEqual({
      ...DEFAULT_DOORAY_LIST_PREFERENCES,
      sortKey: 'subject'
    })
  })

  it('ignores malformed JSON', () => {
    window.localStorage.setItem('orca:dooray-list-preferences:tasks', '{not json')
    expect(readDoorayListPreferences('tasks')).toEqual(DEFAULT_DOORAY_LIST_PREFERENCES)
  })

  it('survives storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => writeDoorayListPreferences('tasks', DEFAULT_DOORAY_LIST_PREFERENCES)).not.toThrow()
    expect(readDoorayListPreferences('tasks')).toEqual(DEFAULT_DOORAY_LIST_PREFERENCES)
  })
})

describe('dooray project filter preferences', () => {
  it('keeps filters separate per surface and per project', () => {
    writeDoorayProjectFilterPreferences('tasks', 'p1', {
      milestone: 'Sprint 3',
      workflowId: 'wf-2',
      priority: 'high'
    })
    writeDoorayProjectFilterPreferences('tasks', 'p2', {
      milestone: null,
      workflowId: null,
      priority: 'none'
    })
    expect(readDoorayProjectFilterPreferences('tasks', 'p1')).toEqual({
      milestone: 'Sprint 3',
      workflowId: 'wf-2',
      priority: 'high'
    })
    expect(readDoorayProjectFilterPreferences('tasks', 'p2')).toEqual({
      milestone: null,
      workflowId: null,
      priority: 'none'
    })
    expect(readDoorayProjectFilterPreferences('sidebar', 'p1')).toEqual({
      milestone: null,
      workflowId: null,
      priority: null
    })
  })

  it('drops invalid stored values', () => {
    window.localStorage.setItem(
      'orca:dooray-project-filters:tasks:p1',
      JSON.stringify({ milestone: 3, workflowId: '', priority: 'urgent' })
    )
    expect(readDoorayProjectFilterPreferences('tasks', 'p1')).toEqual({
      milestone: null,
      workflowId: null,
      priority: null
    })
  })

  it('removes the entry when every filter is cleared', () => {
    writeDoorayProjectFilterPreferences('tasks', 'p1', {
      milestone: 'Sprint 3',
      workflowId: null,
      priority: null
    })
    writeDoorayProjectFilterPreferences('tasks', 'p1', {
      milestone: null,
      workflowId: null,
      priority: null
    })
    expect(window.localStorage.getItem('orca:dooray-project-filters:tasks:p1')).toBeNull()
  })
})
