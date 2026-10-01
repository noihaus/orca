import { describe, expect, it } from 'vitest'
import { readDoorayErrorMessage, translateDoorayError } from './dooray-error-messages'

describe('translateDoorayError', () => {
  it('strips the Electron IPC prefix and the error class name', () => {
    expect(
      translateDoorayError(
        "Error invoking remote method 'dooray:listProjects': CredentialDecryptionError: Could not decrypt."
      )
    ).toBe('Could not decrypt.')
    expect(translateDoorayError("Error invoking remote method 'dooray:x': Error: boom")).toBe(
      'boom'
    )
  })

  it('still maps known messages after stripping', () => {
    expect(
      translateDoorayError(
        "Error invoking remote method 'dooray:status': Error: Not connected to Dooray."
      )
    ).toBe('Not connected to Dooray.')
  })

  it('leaves plain messages untouched', () => {
    expect(translateDoorayError('Rate limited: try later')).toBe('Rate limited: try later')
  })
})

describe('readDoorayErrorMessage', () => {
  it('shows the message without the Electron IPC wrapper', () => {
    expect(
      readDoorayErrorMessage(
        new Error("Error invoking remote method 'dooray:x': Error: boom"),
        'fb'
      )
    ).toBe('boom')
  })

  it('falls back for non-Error values and empty messages', () => {
    expect(readDoorayErrorMessage('boom', 'Failed.')).toBe('Failed.')
    expect(
      readDoorayErrorMessage(new Error("Error invoking remote method 'dooray:x': "), 'Failed.')
    ).toBe('Failed.')
  })
})
