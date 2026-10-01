import { useId } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'
import type { DoorayProject } from '../../../../../shared/extensions/dooray/dooray-types'
import { getDoorayPriorityLabel } from '../tasks/DoorayPriorityIndicator'
import {
  DOORAY_NONE_VALUE,
  DOORAY_TASK_PRIORITIES,
  isDoorayPriority
} from './dooray-new-task-options'
import type { DoorayNewTaskForm } from './use-dooray-new-task-form'

type RowProps = { form: DoorayNewTaskForm; disabled: boolean }

export function DoorayProjectTemplateRow({
  form,
  disabled,
  projects
}: RowProps & { projects: DoorayProject[] }): React.JSX.Element {
  const projectId = useId()
  const templateId = useId()
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-2">
        <Label htmlFor={projectId}>
          {translate('auto.ext.dooray.components.dooray.new.task.dialog.project', 'Project')}
        </Label>
        <Select
          value={form.projectId ?? undefined}
          onValueChange={form.changeProject}
          disabled={disabled || projects.length === 0}
        >
          <SelectTrigger id={projectId} className="w-full">
            <SelectValue
              placeholder={translate(
                'auto.ext.dooray.components.TaskPageDooray.select_project',
                'Select project'
              )}
            />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={templateId}>
          {translate('auto.ext.dooray.components.dooray.new.task.dialog.template', 'Template')}
        </Label>
        <Select
          value={form.templateId}
          onValueChange={form.changeTemplate}
          disabled={disabled || form.templateLoading}
        >
          <SelectTrigger id={templateId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DOORAY_NONE_VALUE}>
              {translate(
                'auto.ext.dooray.components.dooray.new.task.dialog.no_template',
                'No template'
              )}
            </SelectItem>
            {form.templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.templateName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export function DoorayWorkflowPriorityRow({ form, disabled }: RowProps): React.JSX.Element {
  const workflowId = useId()
  const priorityId = useId()
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-2">
        <Label htmlFor={workflowId}>
          {translate('auto.ext.dooray.components.dooray.new.task.dialog.workflow', 'Workflow')}
        </Label>
        <Select
          value={form.workflowId}
          onValueChange={form.setWorkflowId}
          disabled={disabled || form.workflows.length === 0}
        >
          <SelectTrigger id={workflowId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DOORAY_NONE_VALUE}>
              {translate(
                'auto.ext.dooray.components.dooray.new.task.dialog.no_workflow',
                'Default'
              )}
            </SelectItem>
            {form.workflows.map((workflow) => (
              <SelectItem key={workflow.id} value={workflow.id}>
                {workflow.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={priorityId}>
          {translate('auto.ext.dooray.components.dooray.new.task.dialog.priority', 'Priority')}
        </Label>
        <Select
          value={form.priority}
          onValueChange={(value) => isDoorayPriority(value) && form.setPriority(value)}
          disabled={disabled}
        >
          <SelectTrigger id={priorityId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOORAY_TASK_PRIORITIES.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {getDoorayPriorityLabel(priority)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
