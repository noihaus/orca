import type { DoorayMilestone } from '../../../../../shared/extensions/dooray/dooray-types'

function toDayLabel(value: string): string {
  return value.slice(0, 10).replaceAll('-', '.')
}

// `name · YYYY.MM.DD~YYYY.MM.DD`, degrading to whichever end of the range exists.
export function formatDoorayMilestoneLabel(
  milestone: Pick<DoorayMilestone, 'name' | 'startedAt' | 'endedAt'>
): string {
  const started = toDayLabel(milestone.startedAt)
  const ended = toDayLabel(milestone.endedAt)
  const range = started && ended ? `${started}~${ended}` : started || ended
  return range ? `${milestone.name} · ${range}` : milestone.name
}

// The selected milestone stays listed even when closed so a picker never loses its value.
export function visibleDoorayMilestones(
  milestones: readonly DoorayMilestone[],
  includeClosed: boolean,
  selectedId: string | null
): DoorayMilestone[] {
  return milestones.filter(
    (milestone) => includeClosed || milestone.status === 'open' || milestone.id === selectedId
  )
}
