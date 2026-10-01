import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import type { DoorayMutationResult } from '../../../../../shared/extensions/dooray/dooray-types'
import type { DoorayApi } from '../runtime-dooray-client'
import { readDoorayErrorMessage, translateDoorayError } from '../lib/dooray-error-messages'
import type { DoorayPendingAttachment } from './dooray-task-attachments'

type DoorayTaskExtrasApi = Pick<DoorayApi, 'setWorkflow' | 'uploadIssueFile'>

type DoorayTaskExtrasArgs = {
  projectId: string
  postId: string
  workflowId: string | null
  attachments: readonly DoorayPendingAttachment[]
}

function failureOf(error: unknown, fallback: string): DoorayMutationResult {
  return { ok: false, error: readDoorayErrorMessage(error, fallback) }
}

// The issue already exists, so these steps only report failures instead of aborting.
export async function applyDoorayTaskExtras(
  api: DoorayTaskExtrasApi,
  args: DoorayTaskExtrasArgs
): Promise<void> {
  if (args.workflowId) {
    const workflowResult = await api
      .setWorkflow({ projectId: args.projectId, postId: args.postId, workflowId: args.workflowId })
      .catch((error: unknown) => failureOf(error, 'Workflow update failed.'))
    if (!workflowResult.ok) {
      toast.error(
        translate(
          'auto.ext.dooray.components.dooray.new.task.dialog.workflow_failed',
          'Task was created, but applying the workflow failed: {{value0}}',
          { value0: translateDoorayError(workflowResult.error) }
        )
      )
    }
  }

  const failures: string[] = []
  // Sequential so large files don't compete for the upload timeout.
  for (const attachment of args.attachments) {
    const uploaded = await api
      .uploadIssueFile({
        projectId: args.projectId,
        postId: args.postId,
        file: {
          name: attachment.name,
          mimeType: attachment.mimeType,
          dataBase64: attachment.dataBase64
        }
      })
      .catch((error: unknown) => failureOf(error, 'Attachment upload failed.'))
    if (!uploaded.ok) {
      failures.push(translateDoorayError(uploaded.error))
    }
  }
  if (failures.length > 0) {
    toast.error(
      translate(
        'auto.ext.dooray.components.dooray.new.task.dialog.attachments_failed',
        'Task was created, but {{value0}} attachment(s) failed: {{value1}}',
        { value0: failures.length, value1: failures.join('; ') }
      )
    )
  }
}
