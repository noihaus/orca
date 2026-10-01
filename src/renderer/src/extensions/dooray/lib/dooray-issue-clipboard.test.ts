import { beforeEach, describe, expect, it, vi } from 'vitest'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

import { buildDoorayPrompt, copyDoorayText } from './dooray-issue-clipboard'

const writeClipboardText = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('window', { api: { ui: { writeClipboardText } } })
})

describe('dooray-issue-clipboard', () => {
  it('builds the prompt with the url when present', () => {
    expect(buildDoorayPrompt({ taskNumber: 'A/1', subject: 'Fix', url: 'https://d/1' })).toBe(
      'Complete Dooray task A/1: Fix\n\nhttps://d/1'
    )
    expect(buildDoorayPrompt({ taskNumber: 'A/1', subject: 'Fix', url: '' })).toBe(
      'Complete Dooray task A/1: Fix'
    )
  })

  it('toasts success and failure', async () => {
    writeClipboardText.mockResolvedValueOnce(undefined)
    await copyDoorayText('x', 'URL')
    expect(toast.success).toHaveBeenCalled()
    writeClipboardText.mockRejectedValueOnce(new Error('no'))
    await copyDoorayText('x', 'URL')
    expect(toast.error).toHaveBeenCalled()
  })
})
