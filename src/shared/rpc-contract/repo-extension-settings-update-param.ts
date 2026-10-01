import { z } from 'zod'
import { validateRepoExtensionSettings } from '../repo-extension-settings'

// null clears; anything else must pass the same plain-object / 16KB check as the IPC path.
export const RepoExtensionSettingsUpdate = z
  .record(z.string(), z.unknown())
  .nullable()
  .optional()
  .superRefine((value, ctx) => {
    if (value == null) {
      return
    }
    const result = validateRepoExtensionSettings(value)
    if (!result.ok) {
      ctx.addIssue({ code: 'custom', message: result.error })
    }
  })
