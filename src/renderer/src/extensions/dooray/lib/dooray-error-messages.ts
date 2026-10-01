import { translate } from '@/i18n/i18n'

const IPC_ERROR_PREFIX = /^Error invoking remote method '[^']*':\s*/
const ERROR_NAME_PREFIX = /^(?:[A-Z]\w*)?Error:\s*/

// Electron IPC rejections arrive as "Error invoking remote method 'x': SomeError: msg".
function stripIpcErrorPrefix(message: string): string {
  return message.replace(IPC_ERROR_PREFIX, '').replace(ERROR_NAME_PREFIX, '')
}

// Main-process error strings are English; map the known ones to the UI locale.
export function translateDoorayError(rawMessage: string): string {
  const message = stripIpcErrorPrefix(rawMessage)
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
    default:
      return message
  }
}
