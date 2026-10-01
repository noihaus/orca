import { createContext, useContext } from 'react'

export type DoorayBaseRefRequest = {
  branch: string
  repoId: string
  worktreePath: string
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

// React-only on purpose: the provider is registered eagerly and must not pull in the store.
export const DoorayTaskBaseRefContext = createContext<DoorayBaseRefPrompt | null>(null)

// Null outside the provider; callers then switch without asking for a base.
export function useDoorayTaskBaseRefPrompt(): DoorayBaseRefPrompt | null {
  return useContext(DoorayTaskBaseRefContext)
}
