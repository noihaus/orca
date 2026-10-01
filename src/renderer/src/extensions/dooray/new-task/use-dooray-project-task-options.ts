import { useEffect, useState } from 'react'
import type {
  DoorayMilestone,
  DoorayTag,
  DoorayTemplateSummary,
  DoorayWorkflow
} from '../../../../../shared/extensions/dooray/dooray-types'
import { useDoorayApi } from '../use-dooray-api'

export type DoorayProjectTaskOptions = {
  tags: DoorayTag[]
  templates: DoorayTemplateSummary[]
  workflows: DoorayWorkflow[]
  milestones: DoorayMilestone[]
}

const EMPTY_OPTIONS: DoorayProjectTaskOptions = {
  tags: [],
  templates: [],
  workflows: [],
  milestones: []
}

// Each list degrades to [] on failure so one broken endpoint never blocks task creation.
export function useDoorayProjectTaskOptions(projectId: string | null): DoorayProjectTaskOptions {
  const api = useDoorayApi()
  const [loaded, setLoaded] = useState<{ projectId: string; options: DoorayProjectTaskOptions }>()

  useEffect(() => {
    if (!projectId) {
      return
    }
    let stale = false
    const args = { projectId }
    void Promise.all([
      api.listTags(args).catch(() => []),
      api.listTemplates(args).catch(() => []),
      api.listWorkflows(args).catch(() => []),
      api.listMilestones(args).catch(() => [])
    ]).then(([tags, templates, workflows, milestones]) => {
      if (!stale) {
        setLoaded({ projectId, options: { tags, templates, workflows, milestones } })
      }
    })
    return () => {
      stale = true
    }
  }, [api, projectId])

  // Keyed on the project so a switch never shows the previous project's options.
  return loaded && loaded.projectId === projectId ? loaded.options : EMPTY_OPTIONS
}
