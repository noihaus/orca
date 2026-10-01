import type { MouseEvent } from 'react'
import { useAppStore } from '@/store'

// In-app browser tab when a worktree is active, otherwise the system browser.
export function openDoorayUrl(url: string): void {
  const state = useAppStore.getState()
  const worktreeId = state.activeWorktreeId
  if (worktreeId && state.getKnownWorktreeById(worktreeId)) {
    state.createBrowserTab(worktreeId, url, { activate: true })
    return
  }
  void window.api.shell.openUrl(url)
}

// Only http(s) links are intercepted; anything else keeps the markdown renderer's default.
export function handleDoorayMarkdownLinkClick(
  event: Pick<MouseEvent, 'preventDefault'>,
  href: string | undefined
): void {
  const url = href?.trim()
  if (!url || !/^https?:\/\//i.test(url)) {
    return
  }
  event.preventDefault()
  openDoorayUrl(url)
}
