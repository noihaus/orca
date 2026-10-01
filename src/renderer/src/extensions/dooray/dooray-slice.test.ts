import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DoorayStatus } from '../../../../shared/extensions/dooray/dooray-types'
import { createDooraySlice, type DooraySlice } from './dooray-slice'

const doorayStatus = vi.fn()
const doorayConnect = vi.fn()
const doorayDisconnect = vi.fn()
const doorayTestConnection = vi.fn()

vi.mock('./runtime-dooray-client', () => ({
  doorayStatus: (...args: unknown[]) => doorayStatus(...args),
  doorayConnect: (...args: unknown[]) => doorayConnect(...args),
  doorayDisconnect: (...args: unknown[]) => doorayDisconnect(...args),
  doorayTestConnection: (...args: unknown[]) => doorayTestConnection(...args)
}))

const viewer = { id: 'u1', name: 'Kim', userCode: 'kim', email: 'k@example.com' }
const connected: DoorayStatus = { connected: true, viewer, apiUrl: 'https://api.dooray.com' }
const disconnected: DoorayStatus = { connected: false, viewer: null }

type TestState = DooraySlice & { settings: { activeRuntimeEnvironmentId: string | null } }

// The slice reads only `settings` from the wider state, so a minimal store double suffices.
function createTestStore() {
  const holder: { state: Record<string, unknown> } = {
    state: { settings: { activeRuntimeEnvironmentId: null } }
  }
  const set = vi.fn()
  set.mockImplementation((partial: unknown) => {
    const patch = typeof partial === 'function' ? partial(holder.state) : partial
    holder.state = { ...holder.state, ...patch }
  })
  const get = vi.fn()
  get.mockImplementation(() => holder.state)
  const api = { setState: set, getState: get, getInitialState: get, subscribe: vi.fn() }
  const slice = createDooraySlice(set, get, api)
  holder.state = { ...holder.state, ...slice }
  return {
    getState: (): TestState => {
      const { state } = holder
      return { ...slice, ...state, settings: { activeRuntimeEnvironmentId: envId(state) } }
    },
    setState: (patch: Partial<TestState>) => set(patch)
  }
}

function envId(state: Record<string, unknown>): string | null {
  const settings = state.settings
  return typeof settings === 'object' &&
    settings !== null &&
    'activeRuntimeEnvironmentId' in settings
    ? String(settings.activeRuntimeEnvironmentId ?? '') || null
    : null
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

beforeEach(() => {
  for (const fn of [doorayStatus, doorayConnect, doorayDisconnect, doorayTestConnection]) {
    fn.mockReset()
  }
})

describe('dooray slice', () => {
  it('starts unchecked and disconnected', () => {
    const state = createTestStore().getState()
    expect(state.doorayStatus).toEqual(disconnected)
    expect(state.doorayStatusChecked).toBe(false)
    expect(state.doorayStatusContextKey).toBeNull()
  })

  it('records status and context key after a check', async () => {
    doorayStatus.mockResolvedValue(connected)
    const store = createTestStore()
    await store.getState().checkDoorayConnection()
    expect(store.getState().doorayStatus).toEqual(connected)
    expect(store.getState().doorayStatusChecked).toBe(true)
    expect(store.getState().doorayStatusContextKey).toMatch(/^local#/)
  })

  it('marks checked and disconnected when the read fails', async () => {
    doorayStatus.mockRejectedValue(new Error('offline'))
    const store = createTestStore()
    await store.getState().checkDoorayConnection()
    expect(store.getState().doorayStatus).toEqual(disconnected)
    expect(store.getState().doorayStatusChecked).toBe(true)
  })

  it('discards a check that resolves after the runtime context changed', async () => {
    const pending = deferred<DoorayStatus>()
    doorayStatus.mockReturnValue(pending.promise)
    const store = createTestStore()
    const check = store.getState().checkDoorayConnection()
    store.setState({ settings: { activeRuntimeEnvironmentId: 'env-2' } })
    pending.resolve(connected)
    await check
    expect(store.getState().doorayStatus).toEqual(disconnected)
    expect(store.getState().doorayStatusChecked).toBe(false)
  })

  it('discards an older check superseded by a newer one', async () => {
    const first = deferred<DoorayStatus>()
    doorayStatus.mockReturnValueOnce(first.promise).mockResolvedValueOnce(disconnected)
    const store = createTestStore()
    const older = store.getState().checkDoorayConnection()
    await store.getState().checkDoorayConnection()
    first.resolve(connected)
    await older
    expect(store.getState().doorayStatus).toEqual(disconnected)
  })

  it('connect stores the refreshed status on success', async () => {
    doorayConnect.mockResolvedValue({ ok: true, viewer })
    doorayStatus.mockResolvedValue(connected)
    const store = createTestStore()
    const result = await store.getState().connectDooray({ apiToken: 't' })
    expect(result).toEqual({ ok: true, viewer })
    expect(store.getState().doorayStatus).toEqual(connected)
  })

  it('connect returns the failure and leaves status untouched', async () => {
    doorayConnect.mockResolvedValue({ ok: false, error: 'bad token' })
    const store = createTestStore()
    const result = await store.getState().connectDooray({ apiToken: 't' })
    expect(result).toEqual({ ok: false, error: 'bad token' })
    expect(store.getState().doorayStatusChecked).toBe(false)
  })

  it('connect turns a thrown error into a failed result', async () => {
    doorayConnect.mockRejectedValue(new Error('network'))
    const result = await createTestStore().getState().connectDooray({ apiToken: 't' })
    expect(result).toEqual({ ok: false, error: 'network' })
  })

  it('connect reports supersession when the context changed mid-flight', async () => {
    const pending = deferred<{ ok: true; viewer: typeof viewer }>()
    doorayConnect.mockReturnValue(pending.promise)
    const store = createTestStore()
    const connecting = store.getState().connectDooray({ apiToken: 't' })
    store.setState({ settings: { activeRuntimeEnvironmentId: 'env-2' } })
    pending.resolve({ ok: true, viewer })
    const result = await connecting
    expect(result.ok).toBe(false)
    expect(store.getState().doorayStatus).toEqual(disconnected)
  })

  it('test refreshes status after a successful test', async () => {
    doorayTestConnection.mockResolvedValue({ ok: true, viewer })
    doorayStatus.mockResolvedValue(connected)
    const store = createTestStore()
    await store.getState().testDoorayConnection()
    expect(store.getState().doorayStatus).toEqual(connected)
  })

  it('disconnect clears the connected status', async () => {
    doorayStatus.mockResolvedValueOnce(connected).mockResolvedValueOnce(disconnected)
    doorayDisconnect.mockResolvedValue(undefined)
    const store = createTestStore()
    await store.getState().checkDoorayConnection()
    await store.getState().disconnectDooray()
    expect(store.getState().doorayStatus).toEqual(disconnected)
  })
})
