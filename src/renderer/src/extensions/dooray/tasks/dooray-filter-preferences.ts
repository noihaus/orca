import type {
  DoorayIssueFilter,
  DoorayIssueOrder,
  DoorayPriority
} from '../../../../../shared/extensions/dooray/dooray-types'
import type { DooraySortKey } from '../lib/dooray-issue-ordering'

// Tasks page and sidebar keep separate preferences so one never silently filters the other.
export type DoorayPreferenceSurface = 'tasks' | 'sidebar'

export type DoorayListPreferences = {
  filter: DoorayIssueFilter
  sortKey: DooraySortKey
  sortDir: 'asc' | 'desc'
  serverOrder: DoorayIssueOrder
}

export type DoorayProjectFilterPreferences = {
  milestone: string | null
  workflowId: string | null
  priority: DoorayPriority | null
}

export const DEFAULT_DOORAY_LIST_PREFERENCES: DoorayListPreferences = {
  filter: 'assigned',
  sortKey: 'created',
  sortDir: 'desc',
  serverOrder: '-createdAt'
}

export const EMPTY_DOORAY_PROJECT_FILTERS: DoorayProjectFilterPreferences = {
  milestone: null,
  workflowId: null,
  priority: null
}

const ISSUE_FILTERS = ['assigned', 'all', 'done'] as const satisfies readonly DoorayIssueFilter[]
const SORT_KEYS = [
  'number',
  'subject',
  'workflow',
  'milestone',
  'priority',
  'created',
  'updated'
] as const satisfies readonly DooraySortKey[]
const SORT_DIRECTIONS = ['asc', 'desc'] as const
const SERVER_ORDERS = [
  'createdAt',
  '-createdAt',
  'updatedAt',
  '-updatedAt'
] as const satisfies readonly DoorayIssueOrder[]
const PRIORITIES = [
  'highest',
  'high',
  'normal',
  'low',
  'lowest',
  'none'
] as const satisfies readonly DoorayPriority[]

function listKey(surface: DoorayPreferenceSurface): string {
  return `orca:dooray-list-preferences:${surface}`
}

function projectKey(surface: DoorayPreferenceSurface, projectId: string): string {
  return `orca:dooray-project-filters:${surface}:${projectId}`
}

function pick<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return allowed.find((candidate) => candidate === value) ?? fallback
}

function pickOptional<T extends string>(allowed: readonly T[], value: unknown): T | null {
  return allowed.find((candidate) => candidate === value) ?? null
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readStoredRecord(key: string): Record<string, unknown> | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? { ...parsed } : null
  } catch {
    return null
  }
}

function writeStoredRecord(key: string, value: object | null): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(key)
    } else {
      window.localStorage.setItem(key, JSON.stringify(value))
    }
  } catch {
    // Storage can be blocked; the in-memory choice still works for this session.
  }
}

export function readDoorayListPreferences(surface: DoorayPreferenceSurface): DoorayListPreferences {
  const stored = readStoredRecord(listKey(surface))
  if (!stored) {
    return DEFAULT_DOORAY_LIST_PREFERENCES
  }
  const defaults = DEFAULT_DOORAY_LIST_PREFERENCES
  return {
    filter: pick(ISSUE_FILTERS, stored.filter, defaults.filter),
    sortKey: pick(SORT_KEYS, stored.sortKey, defaults.sortKey),
    sortDir: pick(SORT_DIRECTIONS, stored.sortDir, defaults.sortDir),
    serverOrder: pick(SERVER_ORDERS, stored.serverOrder, defaults.serverOrder)
  }
}

export function writeDoorayListPreferences(
  surface: DoorayPreferenceSurface,
  preferences: DoorayListPreferences
): void {
  writeStoredRecord(listKey(surface), preferences)
}

export function readDoorayProjectFilterPreferences(
  surface: DoorayPreferenceSurface,
  projectId: string
): DoorayProjectFilterPreferences {
  const stored = readStoredRecord(projectKey(surface, projectId))
  if (!stored) {
    return EMPTY_DOORAY_PROJECT_FILTERS
  }
  return {
    milestone: nonEmptyString(stored.milestone),
    workflowId: nonEmptyString(stored.workflowId),
    priority: pickOptional(PRIORITIES, stored.priority)
  }
}

export function writeDoorayProjectFilterPreferences(
  surface: DoorayPreferenceSurface,
  projectId: string,
  filters: DoorayProjectFilterPreferences
): void {
  const empty =
    filters.milestone === null && filters.workflowId === null && filters.priority === null
  writeStoredRecord(projectKey(surface, projectId), empty ? null : filters)
}

// Shared per-surface snapshot so hooks read preferences through useSyncExternalStore.
const listPreferenceCache = new Map<DoorayPreferenceSurface, DoorayListPreferences>()
const listPreferenceListeners = new Set<() => void>()

export function getDoorayListPreferencesSnapshot(
  surface: DoorayPreferenceSurface
): DoorayListPreferences {
  const cached = listPreferenceCache.get(surface)
  if (cached) {
    return cached
  }
  const read = readDoorayListPreferences(surface)
  listPreferenceCache.set(surface, read)
  return read
}

export function subscribeDoorayListPreferences(listener: () => void): () => void {
  listPreferenceListeners.add(listener)
  return () => listPreferenceListeners.delete(listener)
}

export function updateDoorayListPreferences(
  surface: DoorayPreferenceSurface,
  patch: Partial<DoorayListPreferences>
): void {
  const next = { ...getDoorayListPreferencesSnapshot(surface), ...patch }
  listPreferenceCache.set(surface, next)
  writeDoorayListPreferences(surface, next)
  for (const listener of listPreferenceListeners) {
    listener()
  }
}

export function clearDoorayListPreferenceCache(): void {
  listPreferenceCache.clear()
}
