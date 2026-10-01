import { useSyncExternalStore } from 'react'

export type DoorayBaseRefRequest = {
  branch: string
  repoId: string
  worktreePath: string
  // Names the worktree (and project) being switched, which need not be the active one.
  workspaceLabel: string
  defaultSubmodulePaths: readonly string[]
}

// baseRef null = branch from the current HEAD.
export type DoorayBaseRefChoice = {
  baseRef: string | null
  fetchBase?: boolean
  submodulePaths?: readonly string[]
}

export type DoorayBaseRefPrompt = (
  request: DoorayBaseRefRequest
) => Promise<DoorayBaseRefChoice | 'cancel'>

export type QueuedDoorayBaseRefRequest = DoorayBaseRefRequest & {
  id: number
  resolve: (choice: DoorayBaseRefChoice | 'cancel') => void
}

// Module-level so the dialog host can be a sibling app surface instead of a provider wrapping the app.
let queue: readonly QueuedDoorayBaseRefRequest[] = []
let nextId = 0
let hostCount = 0
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Requests queue so a second start never steals the open dialog's promise.
const promptBaseRef: DoorayBaseRefPrompt = (request) =>
  new Promise((resolve) => {
    queue = [...queue, { ...request, id: nextId, resolve }]
    nextId += 1
    emit()
  })

export function settleDoorayBaseRefRequest(
  id: number,
  choice: DoorayBaseRefChoice | 'cancel'
): void {
  const entry = queue.find((candidate) => candidate.id === id)
  if (!entry) {
    return
  }
  queue = queue.filter((candidate) => candidate !== entry)
  entry.resolve(choice)
  emit()
}

// Returns the unregister function; the last host leaving cancels what nobody can answer.
export function registerDoorayBaseRefHost(): () => void {
  hostCount += 1
  emit()
  return () => {
    hostCount -= 1
    if (hostCount === 0) {
      const orphaned = queue
      queue = []
      for (const entry of orphaned) {
        entry.resolve('cancel')
      }
    }
    emit()
  }
}

export function useActiveDoorayBaseRefRequest(): QueuedDoorayBaseRefRequest | null {
  return useSyncExternalStore(subscribe, () => queue[0] ?? null)
}

// Null while no dialog host is mounted; callers then switch without asking for a base.
export function useDoorayTaskBaseRefPrompt(): DoorayBaseRefPrompt | null {
  return useSyncExternalStore(subscribe, () => (hostCount > 0 ? promptBaseRef : null))
}
