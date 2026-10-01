// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  useDoorayTaskBaseRefPrompt,
  type DoorayBaseRefPrompt
} from './dooray-task-base-ref-context'
import { DoorayTaskBaseRefDialogHost } from './DoorayTaskBaseRefDialogHost'

vi.mock('./DoorayTaskBaseRefDialog', () => ({
  DoorayTaskBaseRefDialog: ({
    request,
    onSettle
  }: {
    request: { branch: string }
    onSettle: (choice: { baseRef: string | null } | 'cancel') => void
  }) => (
    <button type="button" onClick={() => onSettle({ baseRef: request.branch })}>
      {`settle ${request.branch}`}
    </button>
  )
}))

let prompt: DoorayBaseRefPrompt | null = null
function Capture(): null {
  prompt = useDoorayTaskBaseRefPrompt()
  return null
}

function ask(branch: string): Promise<unknown> {
  let pending: Promise<unknown> = Promise.resolve()
  act(() => {
    pending = prompt!({
      branch,
      repoId: 'r',
      worktreePath: '/r',
      workspaceLabel: 'r',
      defaultSubmodulePaths: []
    })
  })
  return pending
}

afterEach(cleanup)

describe('DoorayTaskBaseRefDialogHost', () => {
  it('is null while no host is mounted', () => {
    render(<Capture />)
    expect(prompt).toBeNull()
  })

  it('queues prompts from a sibling and resolves each with its own choice', async () => {
    render(
      <>
        <Capture />
        <DoorayTaskBaseRefDialogHost />
      </>
    )
    const first = ask('one')
    const second = ask('two')
    fireEvent.click(await screen.findByText('settle one'))
    await expect(first).resolves.toEqual({ baseRef: 'one' })
    fireEvent.click(await screen.findByText('settle two'))
    await expect(second).resolves.toEqual({ baseRef: 'two' })
  })

  it('cancels pending prompts when the last host unmounts', async () => {
    const view = render(
      <>
        <Capture />
        <DoorayTaskBaseRefDialogHost />
      </>
    )
    const pending = ask('orphan')
    view.unmount()
    await expect(pending).resolves.toBe('cancel')
  })
})
