import { INSTALLED_CREDENTIAL_SERVICES } from './extensions/installed-extension-manifest' // fork-seam: integration-credential-service
const BUILTIN_SERVICES = ['Linear', 'Jira', 'Bitbucket'] as const
const CREDENTIAL_SERVICES = [...BUILTIN_SERVICES, ...INSTALLED_CREDENTIAL_SERVICES] as const
export type IntegrationCredentialService = (typeof CREDENTIAL_SERVICES)[number]

export function credentialDecryptionMessage(service: IntegrationCredentialService): string {
  return `Could not decrypt saved ${service} credential. Approve Keychain access or reconnect ${service}.`
}

// Why: decrypt errors cross IPC/RPC boundaries where only the message
// survives serialization, so detection matches on the canonical message.
export function isIntegrationCredentialDecryptionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return CREDENTIAL_SERVICES.some((s) => message.includes(credentialDecryptionMessage(s))) // fork-seam: integration-credential-service
}
