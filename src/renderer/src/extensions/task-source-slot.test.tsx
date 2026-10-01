// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TaskPageComposerActionsModel } from '@/components/use-task-page-composer-actions'
import { getSourceOptions } from '@/components/task-page-localized-options'
import { TaskPageContent } from '@/components/task-page/Content'
import { SidebarTaskNavButton } from '@/components/sidebar/SidebarTaskNavButton'
import { getTaskSourceContextSummary } from '@/components/task-source-context-summary'
import { getAutomationTargetAvailability } from '@/components/automations/automation-target-availability'
import { TasksPane } from '@/components/settings/TasksPane'
import { getAutomationSourceDisplay } from '@/components/automations/automation-source-display'
import { shouldHideTaskPageListChrome } from '@/components/task-page-list-chrome-visibility'
import type { GlobalSettings } from '../../../shared/global-settings-types'
import { isTaskProvider, type TaskProvider } from '../../../shared/task-providers'
import type { TaskSourceContext } from '../../../shared/task-source-context'
import { extensionTaskSourceLabel } from './extension-slot-hooks'
import {
  extensionTaskSourceOptions,
  visibleExtensionTaskSourceShortcuts
} from './extension-task-source-options'
import type { RendererExtension } from './renderer-extension-contract'

const fixture = vi.hoisted(() => {
  const ensureStatus = vi.fn()
  const extension = {
    id: 'fixture',
    taskSource: {
      providerId: 'fixture',
      label: () => 'Fixture',
      Icon: ({ className }: { className?: string }) => (
        <svg className={className} data-testid="fixture-icon" />
      ),
      useStatus: () => ({ ready: true, connected: true }),
      ensureStatus,
      Panel: ({ onStartNewWorkspace, startRepo }) => (
        <div data-testid="fixture-panel">
          <span>{startRepo?.id ?? 'no repo'}</span>
          <button
            type="button"
            onClick={() =>
              onStartNewWorkspace(
                {
                  type: 'issue',
                  number: 0,
                  title: 'Fixture item',
                  url: 'https://tasks.example.test/1',
                  jiraIdentifier: 'FX-1'
                },
                'fx-1-fixture-item'
              )
            }
          >
            Start fixture item
          </button>
        </div>
      ),
      navShortcutLabel: () => 'Open Fixture tasks'
    }
  } satisfies RendererExtension
  return { ensureStatus, extension }
})

const store = vi.hoisted(() => {
  const state: Record<string, unknown> = {}
  return { state }
})

vi.mock('../../../shared/extensions/installed-extension-manifest', () => ({
  INSTALLED_TASK_PROVIDER_EXTENSIONS: [
    { id: 'fixture', defaultVisible: true, alwaysAvailable: true }
  ],
  INSTALLED_CREDENTIAL_SERVICES: [],
  INSTALLED_RUNTIME_NAMESPACE_API_KEYS: []
}))

vi.mock('./installed-renderer-extensions', () => ({
  INSTALLED_RENDERER_EXTENSIONS: [fixture.extension]
}))

vi.mock('@/store', () => ({
  useAppStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) => selector(store.state),
    { getState: () => store.state }
  )
}))

vi.mock('@/store/selectors', () => ({ useRepoMap: () => new Map() }))

// Built-in Tasks bodies pull in Monaco, which leaks a document click listener into happy-dom.
vi.mock('@/components/PullRequestPage', () => ({ default: () => null }))
vi.mock('@/components/GitHubItemDialog', () => ({ default: () => null }))
vi.mock('@/components/github-project/ProjectViewWrapper', () => ({ default: () => null }))
vi.mock('@/components/task-page/github/List', () => ({ TaskPageGitHubList: () => null }))
vi.mock('@/components/task-page/gitlab/TodoList', () => ({ TaskPageGitLabTodoList: () => null }))
vi.mock('@/components/task-page/gitlab/ItemList', () => ({ TaskPageGitLabItemList: () => null }))
vi.mock('@/components/task-page/jira/Content', () => ({ TaskPageJiraContent: () => null }))

vi.mock('@/components/settings/use-task-source-provider-readiness', async () => {
  const { extensionTaskProviderDefaults } =
    await import('../../../shared/extensions/extension-task-sources')
  const ready = { connected: true, checking: false, visible: true }
  return {
    useTaskSourceProviderReadiness: () => ({
      ...extensionTaskProviderDefaults(() => ready),
      github: ready,
      gitlab: ready,
      linear: { ...ready, skillInstalled: true, skillChecking: false },
      jira: ready
    })
  }
})

vi.mock('@/components/settings/use-integration-provider-status-refresh', () => ({
  useIntegrationProviderStatusRefresh: vi.fn()
}))

vi.mock('@/lib/local-preflight-context', () => ({
  getLocalPreflightContext: () => ({}),
  localPreflightContextKey: () => 'local'
}))

// Typed through the runtime guard so this file also typechecks against the real (empty) manifest.
function fixtureProvider(): TaskProvider {
  const id: unknown = 'fixture'
  if (!isTaskProvider(id)) {
    throw new Error('the fixture manifest mock is not applied')
  }
  return id
}

let root: Root | null = null
let container: HTMLDivElement | null = null

async function render(element: React.JSX.Element): Promise<HTMLDivElement> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root?.render(element)
  })
  return container
}

async function click(element: Element | null): Promise<void> {
  expect(element).not.toBeNull()
  await act(async () => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

beforeEach(() => {
  fixture.ensureStatus.mockClear()
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
})

describe('extension task source slot', () => {
  it('lists the extension tab ahead of the built-in sources', () => {
    const options = getSourceOptions()
    expect(options.map((option) => option.id)).toEqual([
      'fixture',
      'github',
      'gitlab',
      'linear',
      'jira'
    ])
    expect(options[0].label).toBe('Fixture')
  })

  it('renders the extension panel as the Tasks body and opens the composer from it', async () => {
    const openModal = vi.fn()
    const model = {
      taskSource: 'fixture',
      primaryRepo: { id: 'repo-1' },
      openModal
    }
    const view = await render(
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the extension branch of TaskPageContent reads only these three model fields.
      <TaskPageContent model={model as unknown as TaskPageComposerActionsModel} />
    )

    expect(view.querySelector('[data-testid="fixture-panel"]')?.textContent).toContain('repo-1')
    expect(fixture.ensureStatus).toHaveBeenCalledTimes(1)

    await click(view.querySelector('button'))
    expect(openModal).toHaveBeenCalledWith('new-workspace-composer', {
      linkedWorkItem: {
        type: 'issue',
        number: 0,
        title: 'Fixture item',
        url: 'https://tasks.example.test/1',
        jiraIdentifier: 'FX-1'
      },
      prefilledName: 'fx-1-fixture-item',
      telemetrySource: 'sidebar'
    })
  })

  it('adds a sidebar shortcut that opens the extension source', async () => {
    const openTaskPage = vi.fn()
    store.state = {
      openTaskPage,
      updateSettings: vi.fn(),
      activeView: 'terminal',
      repos: [],
      settings: { visibleTaskProviders: ['fixture', 'github'], defaultTaskSource: 'github' },
      preflightStatus: null,
      preflightStatusChecked: true,
      preflightStatusContextKey: 'local',
      refreshPreflightStatus: vi.fn(),
      linearStatus: { connected: false },
      linearStatusChecked: true,
      checkLinearConnection: vi.fn(),
      prefetchWorkItems: vi.fn(),
      activeRepoId: null
    }
    const view = await render(<SidebarTaskNavButton />)

    await click(view.querySelector('button[aria-label="Open Fixture tasks"]'))
    expect(openTaskPage).toHaveBeenCalledWith({ taskSource: 'fixture' })
  })

  it('summarizes the extension as an account-backed source without an account label', () => {
    expect(
      getTaskSourceContextSummary({ provider: fixtureProvider(), providerLabel: 'Fixture' }).label
    ).toMatch(/^Fixture · .+ · Current account$/)
    expect(
      shouldHideTaskPageListChrome({
        taskSource: fixtureProvider(),
        hasGitHubDetail: true,
        hasGitLabDetail: true,
        hasJiraDetail: true,
        hasLinearIssueDetail: true,
        hasLinearProjectContext: true,
        hasLinearViewContext: true
      })
    ).toBe(false)
  })

  it('reports extension sources as unsupported automation targets', () => {
    const sourceContext: TaskSourceContext = {
      kind: 'task-source',
      provider: fixtureProvider(),
      projectId: 'project-1',
      hostId: 'local'
    }
    expect(getAutomationSourceDisplay(sourceContext)?.label).toMatch(/^Fixture · /)
    const args = {
      automation: { sourceContext, workspaceMode: 'new' },
      repo: { id: 'repo-1', path: '/repo' },
      workspace: null,
      projectHostSetups: [],
      sshConnectionStates: new Map()
    }
    const availability = getAutomationTargetAvailability(
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the source-context check runs before any other automation or repo field is read.
      args as unknown as Parameters<typeof getAutomationTargetAvailability>[0]
    )
    expect(availability).toMatchObject({
      canRunNow: false,
      reason: 'source-provider-unsupported'
    })
  })

  it('lists the extension in Tasks settings with only a visibility step', async () => {
    store.state = {
      settingsSearchQuery: '',
      openSettingsPage: vi.fn(),
      openSettingsTarget: vi.fn(),
      refreshPreflightStatus: vi.fn(),
      checkJiraConnection: vi.fn()
    }
    const settings = { visibleTaskProviders: ['fixture', 'github'], defaultTaskSource: 'github' }
    const view = await render(
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: TasksPane reads only the task-provider settings.
      <TasksPane settings={settings as GlobalSettings} updateSettings={vi.fn()} />
    )
    const cardNames = [...view.querySelectorAll('p.font-semibold')].map((node) => node.textContent)
    expect(cardNames.slice(0, 2)).toEqual(['Fixture', 'GitHub'])
    expect(view.querySelector('button[aria-label*="Fixture"]')).not.toBeNull()
  })
})

describe('extension task source options', () => {
  const Icon = (): React.JSX.Element => <svg />
  const registered = {
    id: 'registered',
    taskSource: { ...fixture.extension.taskSource, providerId: 'fixture', Icon }
  } satisfies RendererExtension

  it('falls back to the provider id when no renderer task source is registered', () => {
    expect(extensionTaskSourceLabel('fixture', [])).toBe('fixture')
    expect(extensionTaskSourceOptions(undefined, []).map((o) => o.label)).toEqual(['fixture'])
  })

  it('offers sidebar shortcuts only for visible, registered extension providers', () => {
    expect(visibleExtensionTaskSourceShortcuts(['github', 'fixture'], [registered])).toEqual([
      expect.objectContaining({ id: 'fixture', label: 'Open Fixture tasks' })
    ])
    expect(visibleExtensionTaskSourceShortcuts(['fixture'], [])).toEqual([])
    expect(visibleExtensionTaskSourceShortcuts(['github'], [registered])).toEqual([])
  })
})
