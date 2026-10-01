import { _resetPreflightCache } from '../../preflight/agent-detection'
import type {
  DoorayConnectArgs,
  DoorayConnectResult
} from '../../../shared/extensions/dooray/dooray-types'
import { connectDooray, disconnectDooray } from './client'

// Credential changes invalidate cached agent detection, as Jira does.
export async function connectDoorayAccount(args: DoorayConnectArgs): Promise<DoorayConnectResult> {
  const result = await connectDooray(args)
  if (result.ok) {
    _resetPreflightCache()
  }
  return result
}

export function disconnectDoorayAccount(): void {
  disconnectDooray()
  _resetPreflightCache()
}
