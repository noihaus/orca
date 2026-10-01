import { describe, expect, it } from 'vitest'
import { translateDoorayError } from './dooray-error-messages'

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
