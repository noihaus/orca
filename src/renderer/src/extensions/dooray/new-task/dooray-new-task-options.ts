import type { DoorayPriority } from '../../../../../shared/extensions/dooray/dooray-types'

// Radix Select forbids an empty item value, so "no choice" needs a sentinel.
export const DOORAY_NONE_VALUE = '__none__'

export const DOORAY_TASK_PRIORITIES: readonly DoorayPriority[] = [
  'none',
  'highest',
  'high',
  'normal',
  'low',
  'lowest'
]

export function isDoorayPriority(value: string): value is DoorayPriority {
  return DOORAY_TASK_PRIORITIES.some((priority) => priority === value)
}
