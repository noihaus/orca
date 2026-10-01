import { createContext, useContext, type Context } from 'react'

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

let baseRefContext: Context<DoorayBaseRefPrompt | null> | null = null

// React-only and created on first use: the provider is registered eagerly, so importing it must
// neither pull in the store nor call React.
export function getDoorayTaskBaseRefContext(): Context<DoorayBaseRefPrompt | null> {
  baseRefContext ??= createContext<DoorayBaseRefPrompt | null>(null)
  return baseRefContext
}

// Null outside the provider; callers then switch without asking for a base.
export function useDoorayTaskBaseRefPrompt(): DoorayBaseRefPrompt | null {
  return useContext(getDoorayTaskBaseRefContext())
}
