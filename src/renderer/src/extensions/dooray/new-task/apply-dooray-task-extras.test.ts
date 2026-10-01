import { beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import { applyDoorayTaskExtras } from './apply-dooray-task-extras'
import type { DoorayPendingAttachment } from './dooray-task-attachments'

const toastError = vi.hoisted(() => vi.fn())
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }))

function attachment(name: string): DoorayPendingAttachment {
  return { id: name, name, mimeType: 'image/png', size: 3, dataBase64: 'AAA=' }
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const api = { setWorkflow: vi.fn(), uploadIssueFile: vi.fn() }

beforeEach(async () => {
  await i18n.changeLanguage('en')
  vi.clearAllMocks()
})

describe('applyDoorayTaskExtras', () => {
  it('sets the workflow before uploading attachments one at a time', async () => {
    const calls: string[] = []
    const first = deferred<{ ok: true }>()
    api.setWorkflow.mockImplementation(async () => {
      calls.push('workflow')
      return { ok: true }
    })
    api.uploadIssueFile.mockImplementation((args: { file: { name: string } }) => {
      calls.push(`upload:${args.file.name}`)
      return args.file.name === 'a.png' ? first.promise : Promise.resolve({ ok: true })
    })

    const done = applyDoorayTaskExtras(api, {
      projectId: 'p',
      postId: 'post',
      workflowId: 'wf',
      attachments: [attachment('a.png'), attachment('b.png')]
    })
    await vi.waitFor(() => expect(calls).toEqual(['workflow', 'upload:a.png']))
    first.resolve({ ok: true })
    await done

    expect(calls).toEqual(['workflow', 'upload:a.png', 'upload:b.png'])
    expect(api.setWorkflow).toHaveBeenCalledWith({
      projectId: 'p',
      postId: 'post',
      workflowId: 'wf'
    })
    expect(api.uploadIssueFile).toHaveBeenCalledWith({
      projectId: 'p',
      postId: 'post',
      file: { name: 'a.png', mimeType: 'image/png', dataBase64: 'AAA=' }
    })
    expect(toastError).not.toHaveBeenCalled()
  })

  it('skips the workflow call when none was chosen', async () => {
    await applyDoorayTaskExtras(api, {
      projectId: 'p',
      postId: 'post',
      workflowId: null,
      attachments: []
    })
    expect(api.setWorkflow).not.toHaveBeenCalled()
  })

  it('aggregates failures into one toast each for workflow and attachments', async () => {
    api.setWorkflow.mockResolvedValue({ ok: false, error: 'denied' })
    api.uploadIssueFile
      .mockResolvedValueOnce({ ok: false, error: 'too big' })
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error('timeout'))

    await applyDoorayTaskExtras(api, {
      projectId: 'p',
      postId: 'post',
      workflowId: 'wf',
      attachments: [attachment('a'), attachment('b'), attachment('c')]
    })

    expect(api.uploadIssueFile).toHaveBeenCalledTimes(3)
    expect(toastError).toHaveBeenCalledTimes(2)
    expect(toastError).toHaveBeenNthCalledWith(
      1,
      'Task was created, but applying the workflow failed: denied'
    )
    expect(toastError).toHaveBeenNthCalledWith(
      2,
      'Task was created, but 2 attachment(s) failed: too big; timeout'
    )
  })
})
