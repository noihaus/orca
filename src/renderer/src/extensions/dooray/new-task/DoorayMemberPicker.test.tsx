// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DoorayMember } from '../../../../../shared/extensions/dooray/dooray-types'
import { i18n } from '@/i18n/i18n'
import { DoorayMemberPicker } from './DoorayMemberPicker'

const api = vi.hoisted(() => ({ searchMembers: vi.fn() }))
vi.mock('../use-dooray-api', () => ({ useDoorayApi: () => api }))

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const member = (id: string, name: string): DoorayMember => ({ id, name, userCode: id })

beforeEach(async () => {
  await i18n.changeLanguage('en')
  vi.clearAllMocks()
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

function type(value: string): void {
  fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value } })
}

describe('DoorayMemberPicker', () => {
  it('debounces search by 300ms and drops stale results', async () => {
    const stale = deferred<DoorayMember[]>()
    const fresh = deferred<DoorayMember[]>()
    api.searchMembers.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise)
    const onChange = vi.fn()
    render(<DoorayMemberPicker members={[]} onChange={onChange} placeholder="Search…" />)

    type('k')
    act(() => vi.advanceTimersByTime(299))
    expect(api.searchMembers).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(api.searchMembers).toHaveBeenCalledWith({ name: 'k' })

    type('ki')
    act(() => vi.advanceTimersByTime(300))
    expect(api.searchMembers).toHaveBeenLastCalledWith({ name: 'ki' })

    await act(async () => fresh.resolve([member('u2', 'Kim')]))
    await act(async () => stale.resolve([member('u1', 'Kang')]))

    expect(screen.queryByText('Kang')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Kim/ }))
    expect(onChange).toHaveBeenCalledWith([{ id: 'u2', name: 'Kim' }])
  })

  it('never searches for a blank query and hides already-added members', async () => {
    api.searchMembers.mockResolvedValue([member('u1', 'Kang'), member('u2', 'Kim')])
    render(
      <DoorayMemberPicker
        members={[{ id: 'u1', name: 'Kang' }]}
        onChange={vi.fn()}
        placeholder="Search…"
      />
    )
    type('   ')
    act(() => vi.advanceTimersByTime(300))
    expect(api.searchMembers).not.toHaveBeenCalled()

    type('k')
    await act(async () => vi.advanceTimersByTime(300))
    expect(screen.getByRole('button', { name: /Kim/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Kang/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Remove Kang' })).toBeTruthy()
  })
})
