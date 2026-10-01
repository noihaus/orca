import { describe, expect, it } from 'vitest'
import type { DoorayMilestone } from '../../../../../shared/extensions/dooray/dooray-types'
import { formatDoorayMilestoneLabel, visibleDoorayMilestones } from './dooray-milestone-labels'

const milestone = (id: string, status: 'open' | 'closed'): DoorayMilestone => ({
  id,
  name: `M${id}`,
  startedAt: '2026-09-01T00:00:00+09:00',
  endedAt: '2026-09-30T00:00:00+09:00',
  status
})

describe('formatDoorayMilestoneLabel', () => {
  it('appends the dotted date range', () => {
    expect(formatDoorayMilestoneLabel(milestone('1', 'open'))).toBe('M1 · 2026.09.01~2026.09.30')
  })

  it('falls back to one end or the bare name', () => {
    expect(formatDoorayMilestoneLabel({ name: 'A', startedAt: '', endedAt: '2026-10-01' })).toBe(
      'A · 2026.10.01'
    )
    expect(formatDoorayMilestoneLabel({ name: 'A', startedAt: '', endedAt: '' })).toBe('A')
  })
})

describe('visibleDoorayMilestones', () => {
  const all = [milestone('1', 'open'), milestone('2', 'closed'), milestone('3', 'closed')]

  it('keeps open milestones plus the selected one', () => {
    expect(visibleDoorayMilestones(all, false, '3').map((m) => m.id)).toEqual(['1', '3'])
  })

  it('keeps everything when closed ones are included', () => {
    expect(visibleDoorayMilestones(all, true, null)).toHaveLength(3)
  })
})
