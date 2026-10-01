import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useMountedRef } from '@/hooks/useMountedRef'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import type {
  DoorayIssue,
  DoorayPriority,
  DoorayProject
} from '../../../../../shared/extensions/dooray/dooray-types'
import { translateDoorayError } from '../lib/dooray-error-messages'
import { missingMandatoryTagGroups, pruneSelectOneTagIds } from '../lib/dooray-tag-groups'
import { useDoorayApi } from '../use-dooray-api'
import { applyDoorayTaskExtras } from './apply-dooray-task-extras'
import type { DoorayMemberRef } from './DoorayMemberPicker'
import { DOORAY_NONE_VALUE } from './dooray-new-task-options'
import type { DoorayPendingAttachment } from './dooray-task-attachments'
import { useDoorayProjectTaskOptions } from './use-dooray-project-task-options'

type UseDoorayNewTaskFormArgs = {
  projects: DoorayProject[]
  defaultProjectId: string | null
  onClose: () => void
  // null when the issue was created but could not be re-read.
  onCreated: (issue: DoorayIssue | null) => void
  onSubmittingChange: (submitting: boolean) => void
}

const toMemberRefs = (members: readonly DoorayMemberRef[]): DoorayMemberRef[] =>
  members.map(({ id, name }) => ({ id, name }))

// Mounted only while the dialog is open, so every open starts from fresh state.
export function useDoorayNewTaskForm({
  projects,
  defaultProjectId,
  onClose,
  onCreated,
  onSubmittingChange
}: UseDoorayNewTaskFormArgs) {
  const api = useDoorayApi()
  const viewer = useAppStore((s) => s.doorayStatus.viewer)
  const mountedRef = useMountedRef()
  const [projectId, setProjectId] = useState(defaultProjectId)
  const [templateId, setTemplateId] = useState(DOORAY_NONE_VALUE)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [guide, setGuide] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [workflowId, setWorkflowId] = useState(DOORAY_NONE_VALUE)
  const [milestoneId, setMilestoneId] = useState(DOORAY_NONE_VALUE)
  const [priority, setPriority] = useState<DoorayPriority>('none')
  const [toMembers, setToMembers] = useState<DoorayMemberRef[]>(() =>
    viewer ? toMemberRefs([viewer]) : []
  )
  const [ccMembers, setCcMembers] = useState<DoorayMemberRef[]>([])
  const [attachments, setAttachments] = useState<DoorayPendingAttachment[]>([])
  const [submitting, setSubmitting] = useState(false)
  const templateRequestRef = useRef(0)

  const effectiveProjectId =
    projectId && projects.some((project) => project.id === projectId)
      ? projectId
      : (projects[0]?.id ?? null)
  const {
    tags,
    templates,
    workflows,
    milestones,
    loaded: optionsLoaded
  } = useDoorayProjectTaskOptions(effectiveProjectId)

  const addAttachments = useCallback((added: DoorayPendingAttachment[]) => {
    setAttachments((prev) => [...prev, ...added])
  }, [])
  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id))
  }, [])

  const changeProject = (nextProjectId: string): void => {
    templateRequestRef.current += 1
    setTemplateLoading(false)
    setProjectId(nextProjectId)
    setTemplateId(DOORAY_NONE_VALUE)
    setGuide('')
    setTagIds([])
    setWorkflowId(DOORAY_NONE_VALUE)
    setMilestoneId(DOORAY_NONE_VALUE)
  }

  const changeTemplate = (nextTemplateId: string): void => {
    templateRequestRef.current += 1
    const requestId = templateRequestRef.current
    setTemplateId(nextTemplateId)
    setGuide('')
    if (nextTemplateId === DOORAY_NONE_VALUE || !effectiveProjectId) {
      setTemplateLoading(false)
      return
    }
    setTemplateLoading(true)
    api
      .getTemplate({ projectId: effectiveProjectId, templateId: nextTemplateId })
      .then((template) => {
        if (requestId !== templateRequestRef.current || !template) {
          return
        }
        setSubject(template.subject)
        setBody(template.body)
        setGuide(template.guide)
        setTagIds(pruneSelectOneTagIds(tags, template.tagIds))
        setPriority(template.priority)
        // Templates without members keep the current assignees (the viewer by default).
        if (template.toMembers.length > 0) {
          setToMembers(toMemberRefs(template.toMembers))
        }
        if (template.ccMembers.length > 0) {
          setCcMembers(toMemberRefs(template.ccMembers))
        }
      })
      .catch(() => {
        if (requestId === templateRequestRef.current) {
          toast.error(
            translate(
              'auto.ext.dooray.components.dooray.new.task.dialog.template_failed',
              'Failed to load the template.'
            )
          )
        }
      })
      .finally(() => {
        if (requestId === templateRequestRef.current && mountedRef.current) {
          setTemplateLoading(false)
        }
      })
  }

  const missingTagGroups = missingMandatoryTagGroups(tags, tagIds)
  // Dooray rejects a create missing a mandatory tag group (USER_INVALID_TAG_MANDATORY_PREFIX);
  // until tags load the mandatory groups are unknown, so the gate stays closed.
  const canSubmit =
    Boolean(effectiveProjectId && subject.trim()) &&
    optionsLoaded &&
    missingTagGroups.length === 0 &&
    !submitting

  const submit = async (): Promise<void> => {
    if (!canSubmit || !effectiveProjectId) {
      return
    }
    setSubmitting(true)
    onSubmittingChange(true)
    let createdIssue: DoorayIssue | null | undefined
    try {
      const result = await api.createIssue({
        projectId: effectiveProjectId,
        subject: subject.trim(),
        body,
        tagIds,
        toMemberIds: toMembers.map((member) => member.id),
        ccMemberIds: ccMembers.map((member) => member.id),
        ...(priority !== 'none' ? { priority } : {}),
        ...(milestoneId !== DOORAY_NONE_VALUE ? { milestoneId } : {})
      })
      if (!result.ok) {
        toast.error(translateDoorayError(result.error))
        return
      }
      await applyDoorayTaskExtras(api, {
        projectId: effectiveProjectId,
        postId: result.id,
        workflowId: workflowId === DOORAY_NONE_VALUE ? null : workflowId,
        attachments
      })
      createdIssue = await api
        .getIssue({ projectId: effectiveProjectId, postId: result.id })
        .catch(() => null)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? translateDoorayError(error.message)
          : translate(
              'auto.ext.dooray.components.dooray.new.task.dialog.failed',
              'Failed to create the task.'
            )
      )
    } finally {
      onSubmittingChange(false)
      if (mountedRef.current) {
        setSubmitting(false)
      }
    }
    if (createdIssue === undefined || !mountedRef.current) {
      return
    }
    onClose()
    if (!createdIssue) {
      toast.success(
        translate('auto.ext.dooray.components.dooray.new.task.dialog.created', 'Task created.')
      )
    }
    onCreated(createdIssue)
  }

  return {
    projectId: effectiveProjectId,
    changeProject,
    templates,
    templateId,
    templateLoading,
    changeTemplate,
    subject,
    setSubject,
    body,
    setBody,
    guide,
    tags,
    tagIds,
    setTagIds,
    workflows,
    workflowId,
    setWorkflowId,
    milestones,
    milestoneId,
    setMilestoneId,
    priority,
    setPriority,
    toMembers,
    setToMembers,
    ccMembers,
    setCcMembers,
    attachments,
    addAttachments,
    removeAttachment,
    submitting,
    canSubmit,
    submit
  }
}

export type DoorayNewTaskForm = ReturnType<typeof useDoorayNewTaskForm>
