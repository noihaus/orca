import { translate } from '@/i18n/i18n'
import { compactIpcErrorMessage, readIpcErrorMessage } from '@/lib/ipc-error'

// Main-process error strings are English; map the known ones to the UI locale.
export function translateDoorayError(rawMessage: string): string {
  const message = compactIpcErrorMessage(rawMessage) ?? rawMessage
  switch (message) {
    case 'API token is required.':
      return translate(
        'auto.ext.dooray.components.dooray.errors.token_required',
        'API token is required.'
      )
    case 'Enter a valid Dooray URL.':
      return translate(
        'auto.ext.dooray.components.dooray.errors.invalid_url',
        'Enter a valid Dooray URL.'
      )
    case 'Dooray did not return a member profile for this token.':
      return translate(
        'auto.ext.dooray.components.dooray.errors.no_member_profile',
        'Dooray did not return a member profile for this token.'
      )
    case 'Not connected to Dooray.':
      return translate(
        'auto.ext.dooray.components.dooray.errors.not_connected',
        'Not connected to Dooray.'
      )
    case 'Dooray did not respond in time.':
      return translate(
        'auto.ext.dooray.components.dooray.errors.timed_out',
        'Dooray did not respond in time.'
      )
    case 'Connection failed.':
      return translate(
        'auto.ext.dooray.components.dooray.errors.connection_failed',
        'Connection failed.'
      )
    default:
      return message
  }
}

// User-visible text for a caught error: IPC wrapper stripped, known messages localized.
export function readDoorayErrorMessage(error: unknown, fallback: string): string {
  const message = readIpcErrorMessage(error)
  return message ? translateDoorayError(message) : fallback
}
