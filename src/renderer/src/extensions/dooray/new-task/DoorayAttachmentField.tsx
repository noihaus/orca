import { useEffect, useRef } from 'react'
import { Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import {
  formatAttachmentSize,
  pastedImageName,
  readDoorayAttachments,
  type DoorayPendingAttachment
} from './dooray-task-attachments'
import { DoorayRemovableChip } from './DoorayRemovableChip'

type DoorayAttachmentFieldProps = {
  attachments: DoorayPendingAttachment[]
  onAdd: (attachments: DoorayPendingAttachment[]) => void
  onRemove: (id: string) => void
  disabled?: boolean
}

async function addReadableFiles(
  files: readonly { blob: Blob; name: string }[],
  onAdd: (attachments: DoorayPendingAttachment[]) => void
): Promise<void> {
  const { attachments, failedNames } = await readDoorayAttachments(files)
  if (attachments.length > 0) {
    onAdd(attachments)
  }
  if (failedNames.length > 0) {
    toast.error(
      translate(
        'auto.ext.dooray.components.dooray.new.task.fields.attach_read_failed',
        'Could not read {{value0}}',
        { value0: failedNames.join(', ') }
      )
    )
  }
}

function pasteShortcutLabel(): string {
  return navigator.userAgent.includes('Mac') ? '⌘V' : 'Ctrl+V'
}

export function DoorayAttachmentField({
  attachments,
  onAdd,
  onRemove,
  disabled
}: DoorayAttachmentFieldProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)

  // Document-level so a screenshot pastes anywhere in the open dialog; unmounts with it.
  useEffect(() => {
    if (disabled) {
      return
    }
    const handlePaste = (event: ClipboardEvent): void => {
      const files = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null)
      if (files.length === 0) {
        return
      }
      event.preventDefault()
      void addReadableFiles(
        files.map((file) => ({ blob: file, name: file.name || pastedImageName(Date.now()) })),
        onAdd
      )
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [disabled, onAdd])

  const handlePick = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (picked.length > 0) {
      void addReadableFiles(
        picked.map((file) => ({ blob: file, name: file.name })),
        onAdd
      )
    }
  }

  return (
    <div className="space-y-1.5">
      <input ref={inputRef} type="file" multiple hidden onChange={handlePick} />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="size-3.5" />
          {translate('auto.ext.dooray.components.dooray.new.task.fields.attach_files', 'Add files')}
        </Button>
        <span className="text-[11px] text-muted-foreground">
          {translate(
            'auto.ext.dooray.components.dooray.new.task.fields.attach_paste_shortcut_hint',
            'or paste an image with {{value0}}',
            { value0: pasteShortcutLabel() }
          )}
        </span>
      </div>
      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {attachments.map((attachment) => (
            <DoorayRemovableChip
              key={attachment.id}
              label={attachment.name}
              detail={formatAttachmentSize(attachment.size)}
              disabled={disabled}
              removeLabel={translate(
                'auto.ext.dooray.components.dooray.new.task.fields.remove_attachment',
                'Remove {{value0}}',
                { value0: attachment.name }
              )}
              onRemove={() => onRemove(attachment.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
