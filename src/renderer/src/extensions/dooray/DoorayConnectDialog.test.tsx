// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { DoorayConnectDialog } from './DoorayConnectDialog'

const viewer = { id: 'u1', name: 'Kim', userCode: 'kim', email: 'k@example.com' }
const connectDooray = vi.fn()

function renderDialog(onOpenChange = vi.fn(), onConnected = vi.fn()) {
  render(<DoorayConnectDialog open onOpenChange={onOpenChange} onConnected={onConnected} />)
  return { onOpenChange, onConnected }
}

function typeToken(value: string): void {
  fireEvent.change(screen.getByPlaceholderText('Dooray personal API token'), {
    target: { value }
  })
}

describe('DoorayConnectDialog', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    connectDooray.mockReset()
    useAppStore.setState({ connectDooray })
  })
  afterEach(cleanup)

  it('sends empty URL fields as undefined and trims the token', async () => {
    connectDooray.mockResolvedValue({ ok: true, viewer })
    const { onOpenChange, onConnected } = renderDialog()
    typeToken('  tok  ')
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
    await waitFor(() => expect(onConnected).toHaveBeenCalled())
    expect(connectDooray).toHaveBeenCalledWith({
      apiToken: 'tok',
      apiUrl: undefined,
      webUrl: undefined
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('sends typed URLs', async () => {
    connectDooray.mockResolvedValue({ ok: true, viewer })
    renderDialog()
    typeToken('tok')
    fireEvent.change(screen.getByPlaceholderText('https://api.dooray.com'), {
      target: { value: ' https://api.example.com ' }
    })
    fireEvent.change(screen.getByPlaceholderText('https://yourtenant.dooray.com'), {
      target: { value: 'https://t.dooray.com' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
    await waitFor(() => expect(connectDooray).toHaveBeenCalled())
    expect(connectDooray).toHaveBeenCalledWith({
      apiToken: 'tok',
      apiUrl: 'https://api.example.com',
      webUrl: 'https://t.dooray.com'
    })
  })

  it('disables submit without a token', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: 'Connect' })).toHaveProperty('disabled', true)
  })

  it('does not close while connecting', async () => {
    let resolve: (value: unknown) => void = () => {}
    connectDooray.mockReturnValue(new Promise((r) => (resolve = r)))
    const { onOpenChange } = renderDialog()
    typeToken('tok')
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
    await screen.findByText('Verifying…')
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true)
    expect(onOpenChange).not.toHaveBeenCalled()
    resolve({ ok: false, error: 'x' })
    await waitFor(() => expect(screen.queryByText('Verifying…')).toBeNull())
  })

  it('shows a translated known error', async () => {
    connectDooray.mockResolvedValue({
      ok: false,
      error: 'Dooray did not return a member profile for this token.'
    })
    renderDialog()
    typeToken('tok')
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
    expect(
      await screen.findByText('Dooray did not return a member profile for this token.')
    ).toBeTruthy()
  })
})
