// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  useDoorayTaskBaseRefPrompt,
  type DoorayBaseRefPrompt
} from './dooray-task-base-ref-context'
import { DoorayTaskBaseRefDialogProvider } from './DoorayTaskBaseRefDialogProvider'

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

describe('DoorayTaskBaseRefDialogProvider', () => {
  it('is null outside the provider', () => {
    render(<Capture />)
    expect(prompt).toBeNull()
  })

  it('queues prompts and resolves each with its own choice', async () => {
    render(
      <DoorayTaskBaseRefDialogProvider>
        <Capture />
      </DoorayTaskBaseRefDialogProvider>
    )
    const first = ask('one')
    const second = ask('two')
    fireEvent.click(await screen.findByText('settle one'))
    await expect(first).resolves.toEqual({ baseRef: 'one' })
    fireEvent.click(await screen.findByText('settle two'))
    await expect(second).resolves.toEqual({ baseRef: 'two' })
  })
})
