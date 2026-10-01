// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DoorayStatus } from '../../../../shared/extensions/dooray/dooray-types'
import { i18n } from '@/i18n/i18n'
import { getProviderRuntimeContextKey } from '@/lib/provider-runtime-context'
import { useAppStore } from '@/store'
import { DoorayIntegrationCard } from './DoorayIntegrationCard'
import { DoorayOnboardingRow } from './DoorayOnboardingRow'

const toastError = vi.hoisted(() => vi.fn())
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }))

const viewer = { id: 'u1', name: 'Kim', userCode: 'kim', email: 'k@example.com' }
const checkDoorayConnection = vi.fn()
const disconnectDooray = vi.fn()
const testDoorayConnection = vi.fn()

function seed(status: DoorayStatus): void {
  useAppStore.setState({
    doorayStatus: status,
    doorayStatusChecked: true,
    doorayStatusContextKey: getProviderRuntimeContextKey(useAppStore.getState().settings),
    checkDoorayConnection,
    disconnectDooray,
    testDoorayConnection
  })
}

const connected: DoorayStatus = {
  connected: true,
  viewer,
  apiUrl: 'https://api.dooray.com',
  webUrl: 'https://t.dooray.com'
}

describe('DoorayIntegrationCard', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.clearAllMocks()
    checkDoorayConnection.mockResolvedValue(undefined)
  })
  afterEach(cleanup)

  it('shows the viewer and disconnects when connected', async () => {
    seed(connected)
    disconnectDooray.mockResolvedValue(undefined)
    render(<DoorayIntegrationCard />)
    expect(screen.getByText('Connected as Kim')).toBeTruthy()
    expect(screen.getByText(/t\.dooray\.com · k@example\.com/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Dooray' }))
    await waitFor(() => expect(disconnectDooray).toHaveBeenCalled())
    expect(toastError).not.toHaveBeenCalled()
  })

  it('toasts when disconnect rejects', async () => {
    seed(connected)
    disconnectDooray.mockRejectedValue(new Error('boom'))
    render(<DoorayIntegrationCard />)
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Dooray' }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('boom'))
  })

  it('shows a test failure inline', async () => {
    seed(connected)
    testDoorayConnection.mockResolvedValue({ ok: false, error: 'Not connected to Dooray.' })
    render(<DoorayIntegrationCard />)
    fireEvent.click(screen.getByRole('button', { name: 'Test' }))
    expect(await screen.findByText('Not connected to Dooray.')).toBeTruthy()
  })

  it('offers connect and re-check when disconnected', () => {
    seed({ connected: false, viewer: null })
    render(<DoorayIntegrationCard />)
    expect(screen.getByRole('button', { name: 'Connect Dooray' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Re-check' }))
    expect(checkDoorayConnection).toHaveBeenCalled()
  })

  it('surfaces a credential error from the status', () => {
    seed({ ...connected, credentialError: 'Stored token is unreadable.' })
    render(<DoorayIntegrationCard />)
    expect(screen.getByText('Stored token is unreadable.')).toBeTruthy()
  })
})

describe('DoorayOnboardingRow', () => {
  const openUrl = vi.fn()
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.clearAllMocks()
    checkDoorayConnection.mockResolvedValue(undefined)
    Object.defineProperty(window, 'api', { value: { shell: { openUrl } }, configurable: true })
    useAppStore.setState({ activeWorktreeId: null })
  })
  afterEach(cleanup)

  it('opens the token page and checks status on mount', () => {
    seed({ connected: false, viewer: null })
    render(<DoorayOnboardingRow />)
    expect(checkDoorayConnection).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Open token page' }))
    expect(openUrl).toHaveBeenCalledWith('https://nhnent.dooray.com/setting/api/token')
  })

  it('shows the connected viewer', () => {
    seed(connected)
    render(<DoorayOnboardingRow />)
    expect(screen.getByText(/Connected as Kim/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Open token page' })).toBeNull()
  })
})

describe('dooray extension slots', () => {
  it('registers the card and onboarding row', async () => {
    const { doorayRendererExtension } = await import('./index')
    expect(doorayRendererExtension.integrationCards).toHaveLength(1)
    expect(doorayRendererExtension.onboardingIntegrationRows).toHaveLength(1)
  })
})
