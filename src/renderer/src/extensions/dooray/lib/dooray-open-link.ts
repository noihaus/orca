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
