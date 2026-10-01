import { useId, useRef } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { translate } from '@/i18n/i18n'
import type {
  DoorayIssue,
  DoorayProject
} from '../../../../../shared/extensions/dooray/dooray-types'
import { DoorayAttachmentField } from './DoorayAttachmentField'
import { DoorayMemberPicker } from './DoorayMemberPicker'
import { DoorayMilestoneField } from './DoorayMilestoneField'
import { DoorayProjectTemplateRow, DoorayWorkflowPriorityRow } from './DoorayNewTaskSelectRows'
import { DoorayTagField } from './DoorayTagField'
import { useDoorayNewTaskForm } from './use-dooray-new-task-form'

export type DoorayNewTaskDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: DoorayProject[]
  defaultProjectId: string | null
  onCreated: (issue: DoorayIssue | null) => void
}

type DoorayNewTaskFormBodyProps = Omit<DoorayNewTaskDialogProps, 'open' | 'onOpenChange'> & {
  onClose: () => void
  onSubmittingChange: (submitting: boolean) => void
}

function DoorayNewTaskFormBody({
  projects,
  defaultProjectId,
  onCreated,
  onClose,
  onSubmittingChange
}: DoorayNewTaskFormBodyProps): React.JSX.Element {
  const form = useDoorayNewTaskForm({
    projects,
    defaultProjectId,
    onClose,
    onCreated,
    onSubmittingChange
  })
  const subjectId = useId()
  const bodyId = useId()
  const assigneesId = useId()
  const ccId = useId()
  const disabled = form.submitting
  const memberSearchPlaceholder = translate(
    'auto.ext.dooray.components.dooray.new.task.dialog.member_search',
    'Search members by name…'
  )

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.submit()
      }}
    >
      <div className="scrollbar-sleek -m-1 flex max-h-[65vh] flex-col gap-3 overflow-y-auto p-1">
        <DoorayProjectTemplateRow form={form} disabled={disabled} projects={projects} />
        <div className="space-y-2">
          <Label htmlFor={subjectId}>
            {translate('auto.ext.dooray.components.dooray.new.task.dialog.subject', 'Subject')}
          </Label>
          <Input
            id={subjectId}
            autoFocus
            value={form.subject}
            onChange={(event) => form.setSubject(event.target.value)}
            disabled={disabled}
            placeholder={translate(
              'auto.ext.dooray.components.dooray.new.task.dialog.subject_placeholder',
              'Task subject'
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={bodyId}>
            {translate(
              'auto.ext.dooray.components.dooray.new.task.dialog.body',
              'Description (markdown, optional)'
            )}
          </Label>
          {form.guide.trim() ? (
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] whitespace-pre-wrap text-muted-foreground">
              {form.guide}
            </p>
          ) : null}
          <Textarea
            id={bodyId}
            rows={6}
            value={form.body}
            onChange={(event) => form.setBody(event.target.value)}
            disabled={disabled}
          />
        </div>
        <DoorayTagField
          tags={form.tags}
          selectedTagIds={form.tagIds}
          onChange={form.setTagIds}
          disabled={disabled}
        />
        <DoorayWorkflowPriorityRow form={form} disabled={disabled} />
        <DoorayMilestoneField
          milestones={form.milestones}
          milestoneId={form.milestoneId}
          onMilestoneChange={form.setMilestoneId}
          disabled={disabled}
        />
        <div className="space-y-2">
          <Label htmlFor={assigneesId}>
            {translate('auto.ext.dooray.components.dooray.new.task.dialog.assignees', 'Assignees')}
          </Label>
          <DoorayMemberPicker
            id={assigneesId}
            members={form.toMembers}
            onChange={form.setToMembers}
            placeholder={memberSearchPlaceholder}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={ccId}>
            {translate('auto.ext.dooray.components.dooray.new.task.dialog.cc', 'CC')}
          </Label>
          <DoorayMemberPicker
            id={ccId}
            members={form.ccMembers}
            onChange={form.setCcMembers}
            placeholder={memberSearchPlaceholder}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label>
            {translate(
              'auto.ext.dooray.components.dooray.new.task.dialog.attachments',
              'Attachments'
            )}
          </Label>
          <DoorayAttachmentField
            attachments={form.attachments}
            onAdd={form.addAttachments}
            onRemove={form.removeAttachment}
            disabled={disabled}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={disabled}>
          {translate('auto.ext.dooray.components.dooray.new.task.dialog.cancel', 'Cancel')}
        </Button>
        <Button type="submit" disabled={!form.canSubmit}>
          {form.submitting ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              {translate('auto.ext.dooray.components.dooray.new.task.dialog.creating', 'Creating…')}
            </>
          ) : (
            translate('auto.ext.dooray.components.dooray.new.task.dialog.create', 'Create task')
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function DoorayNewTaskDialog({
  open,
  onOpenChange,
  ...formProps
}: DoorayNewTaskDialogProps): React.JSX.Element {
  // A ref, not state: the guard only needs the latest value when Radix asks to close.
  const submittingRef = useRef(false)
  return (
    <Dialog open={open} onOpenChange={(next) => !submittingRef.current && onOpenChange(next)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {translate(
              'auto.ext.dooray.components.dooray.new.task.dialog.title',
              'New Dooray task'
            )}
          </DialogTitle>
          <DialogDescription>
            {translate(
              'auto.ext.dooray.components.dooray.new.task.dialog.description',
              'Create a task in the selected Dooray project.'
            )}
          </DialogDescription>
        </DialogHeader>
        {/* DialogContent unmounts when closed, so each open starts a fresh form. */}
        <DoorayNewTaskFormBody
          {...formProps}
          onClose={() => onOpenChange(false)}
          onSubmittingChange={(submitting) => {
            submittingRef.current = submitting
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
