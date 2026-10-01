// Why: upstream merges can silently drop a seam line; fork-seams.test.ts enforces this list against the source tree.
export const FORK_SEAMS = [
  { name: 'app-surfaces', file: 'src/renderer/src/App.tsx' },
  {
    name: 'audited-extension-fetch-calls',
    file: 'src/main/proxy-guarded-fetch-call-site-audit.test.ts'
  },
  { name: 'auto-update-gate', file: 'config/vitest.config.ts' },
  { name: 'auto-update-gate', file: 'src/main/updater.ts' },
  { name: 'auto-update-gate', file: 'src/main/updater/updater-setup.ts' },
  {
    name: 'confirmation-alternate-action',
    file: 'src/renderer/src/components/confirmation-dialog-context.ts'
  },
  {
    name: 'confirmation-alternate-action',
    file: 'src/renderer/src/components/confirmation-dialog.test.tsx'
  },
  {
    name: 'confirmation-alternate-action',
    file: 'src/renderer/src/components/confirmation-dialog.tsx'
  },
  { name: 'extension-provider-seeding', file: 'src/main/persistence-settings-ui-defaults.test.ts' },
  {
    name: 'extension-provider-seeding',
    file: 'src/main/persistence-source-control-ai-migration.test.ts'
  },
  {
    name: 'extension-provider-seeding',
    file: 'src/main/persistence/applying-settings/settings-update.ts'
  },
  {
    name: 'extension-provider-seeding',
    file: 'src/main/persistence/loading-store/normalize-loaded-global-settings.ts'
  },
  {
    name: 'extension-provider-seeding',
    file: 'src/main/persistence/loading-store/prepare-loaded-profile-settings.ts'
  },
  { name: 'extension-provider-seeding', file: 'src/shared/default-global-settings.ts' },
  { name: 'extension-provider-seeding', file: 'src/shared/global-settings-types.ts' },
  { name: 'i18n-extension-bundles', file: 'src/renderer/src/i18n/i18n.ts' },
  {
    name: 'integration-cards',
    file: 'src/renderer/src/components/feature-wall/use-feature-wall-task-source-presentation.ts'
  },
  {
    name: 'integration-cards',
    file: 'src/renderer/src/components/feature-wall/use-integration-connection-status.ts'
  },
  { name: 'integration-cards', file: 'src/renderer/src/components/settings/IntegrationsPane.tsx' },
  {
    name: 'integration-cards',
    file: 'src/renderer/src/components/settings/use-integration-provider-status-refresh.ts'
  },
  {
    name: 'integration-cards',
    file: 'src/renderer/src/components/setup-guide/use-setup-guide-progress.ts'
  },
  { name: 'integration-credential-service', file: 'src/shared/integration-credential-errors.ts' },
  {
    name: 'linked-work-item-branch',
    file: 'src/renderer/src/hooks/composer-state/source-context-state.ts'
  },
  {
    name: 'linked-work-item-branch',
    file: 'src/renderer/src/hooks/composer-state/source-identity-actions.ts'
  },
  {
    name: 'linked-work-item-branch',
    file: 'src/renderer/src/hooks/composer-state/target-change-actions.ts'
  },
  {
    name: 'linked-work-item-branch',
    file: 'src/renderer/src/hooks/useComposerState.integration.test.ts'
  },
  { name: 'linked-work-item-branch', file: 'src/renderer/src/lib/new-workspace.ts' },
  {
    name: 'linked-work-item-branch',
    file: 'src/renderer/src/store/slices/ui/ui-slice-contract-core.ts'
  },
  { name: 'localization-scripts', file: 'config/scripts/verify-localization-catalog.mjs' },
  { name: 'localization-scripts', file: 'config/scripts/verify-localization-extraction.mjs' },
  { name: 'main-ipc', file: 'src/main/ipc/register-core-handlers/register-core-handlers.ts' },
  {
    name: 'onboarding-integration-rows',
    file: 'src/renderer/src/components/onboarding/IntegrationsStep.tsx'
  },
  { name: 'preload-api', file: 'config/tsconfig.tc.web.json' },
  { name: 'preload-api', file: 'src/preload/api-types.ts' },
  { name: 'preload-api', file: 'src/preload/index.ts' },
  { name: 'publish-target', file: 'config/electron-builder.config.cjs' },
  { name: 'repo-extension-settings', file: 'src/main/ipc/repos/repo-update-handler.ts' },
  { name: 'repo-extension-settings', file: 'src/main/persistence-update-repo.test.ts' },
  {
    name: 'repo-extension-settings',
    file: 'src/main/persistence/loading-store/repo-lifecycle-operations.ts'
  },
  {
    name: 'repo-extension-settings',
    file: 'src/main/persistence/tracking-repos/repo-hydration.ts'
  },
  {
    name: 'repo-extension-settings',
    file: 'src/main/persistence/tracking-repos/repo-update-operations.ts'
  },
  {
    name: 'repo-extension-settings',
    file: 'src/main/runtime/runtime-repository-settings-controller.ts'
  },
  { name: 'repo-extension-settings', file: 'src/preload/api/repository-api.ts' },
  { name: 'repo-extension-settings', file: 'src/renderer/src/store/repos/repo-state.ts' },
  { name: 'repo-extension-settings', file: 'src/renderer/src/store/repos/repo-update.ts' },
  { name: 'repo-extension-settings', file: 'src/shared/repo-types.ts' },
  { name: 'repo-extension-settings', file: 'src/shared/rpc-contract/repo-update-params.ts' },
  {
    name: 'repository-settings-sections',
    file: 'src/renderer/src/components/settings/RepositoryPane.tsx'
  },
  {
    name: 'right-sidebar-extension-tab',
    file: 'src/main/persistence/applying-settings/ui-selection-normalization.ts'
  },
  {
    name: 'right-sidebar-extension-tab',
    file: 'src/renderer/src/components/right-sidebar/right-sidebar-effective-tab.ts'
  },
  {
    name: 'right-sidebar-extension-tab',
    file: 'src/renderer/src/components/right-sidebar/right-sidebar-panel-content.tsx'
  },
  {
    name: 'right-sidebar-extension-tab',
    file: 'src/renderer/src/components/right-sidebar/use-right-sidebar-activity-items.ts'
  },
  { name: 'right-sidebar-extension-tab', file: 'src/renderer/src/store/right-sidebar-route.ts' },
  { name: 'right-sidebar-extension-tab', file: 'src/shared/rpc-contract/client-ui-params.ts' },
  { name: 'right-sidebar-extension-tab', file: 'src/shared/ui-chrome-types.ts' },
  { name: 'runtime-commands', file: 'src/main/runtime/orca-runtime-state-fields.ts' },
  { name: 'runtime-rpc-methods', file: 'src/main/runtime/rpc/dispatcher.ts' },
  { name: 'store-slices', file: 'src/renderer/src/store/index.ts' },
  { name: 'store-slices', file: 'src/renderer/src/store/slices/store-test-helpers.ts' },
  { name: 'store-slices', file: 'src/renderer/src/store/types.ts' },
  {
    name: 'task-page-source',
    file: 'src/renderer/src/components/automations/automation-source-display.ts'
  },
  {
    name: 'task-page-source',
    file: 'src/renderer/src/components/automations/automation-target-availability.ts'
  },
  {
    name: 'task-page-source',
    file: 'src/renderer/src/components/settings/task-source-setup-state.test.ts'
  },
  { name: 'task-page-source', file: 'src/renderer/src/components/settings/TasksPane.test.tsx' },
  { name: 'task-page-source', file: 'src/renderer/src/components/settings/TasksPane.tsx' },
  {
    name: 'task-page-source',
    file: 'src/renderer/src/components/sidebar/SidebarTaskNavButton.tsx'
  },
  {
    name: 'task-page-source',
    file: 'src/renderer/src/components/task-page-list-chrome-visibility.ts'
  },
  { name: 'task-page-source', file: 'src/renderer/src/components/task-page-localized-options.tsx' },
  { name: 'task-page-source', file: 'src/renderer/src/components/task-page/Content.tsx' },
  { name: 'task-page-source', file: 'src/renderer/src/components/task-source-context-summary.ts' },
  { name: 'task-page-source', file: 'src/shared/task-providers.ts' },
  { name: 'task-page-source', file: 'src/shared/workspace-name.ts' },
  {
    name: 'task-provider-registry',
    file: 'src/renderer/src/components/settings/use-task-source-provider-readiness.ts'
  },
  { name: 'task-provider-registry', file: 'src/shared/rpc-contract/automation-params.ts' },
  { name: 'task-provider-registry', file: 'src/shared/task-provider-identity.ts' },
  { name: 'task-provider-registry', file: 'src/shared/task-providers.test.ts' },
  { name: 'task-provider-registry', file: 'src/shared/task-providers.ts' },
  { name: 'web-preload-api', file: 'src/renderer/src/web/web-preload-api-composition.test.ts' },
  { name: 'web-preload-api', file: 'src/renderer/src/web/web-preload-api.ts' }
] as const
