import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import type { DoorayIssue } from '../../../../../shared/extensions/dooray/dooray-types'

const K = 'auto.ext.dooray.components.DoorayIssueWorkspace'

export function buildDoorayPrompt(
  issue: Pick<DoorayIssue, 'taskNumber' | 'subject' | 'url'>
): string {
  const link = issue.url ? `\n\n${issue.url}` : ''
  return `Complete Dooray task ${issue.taskNumber}: ${issue.subject}${link}`
}

export async function copyDoorayText(text: string, label: string): Promise<void> {
  try {
    await window.api.ui.writeClipboardText(text)
    toast.success(translate(`${K}.copied`, '{{value0}} copied', { value0: label }))
  } catch {
    toast.error(
      translate(`${K}.copy_failed`, 'Failed to copy {{value0}}', { value0: label.toLowerCase() })
    )
  }
}
