import { ipcRenderer } from 'electron'
import type { DoorayPreloadApi } from './dooray-api'

export const doorayApi: DoorayPreloadApi = {
  connect: (args) => ipcRenderer.invoke('dooray:connect', args),
  disconnect: () => ipcRenderer.invoke('dooray:disconnect'),
  status: () => ipcRenderer.invoke('dooray:status'),
  testConnection: () => ipcRenderer.invoke('dooray:testConnection'),
  listProjects: () => ipcRenderer.invoke('dooray:listProjects'),
  listIssues: (args) => ipcRenderer.invoke('dooray:listIssues', args),
  getIssue: (args) => ipcRenderer.invoke('dooray:getIssue', args),
  getIssueByNumber: (args) => ipcRenderer.invoke('dooray:getIssueByNumber', args),
  createIssue: (args) => ipcRenderer.invoke('dooray:createIssue', args),
  listMilestones: (args) => ipcRenderer.invoke('dooray:listMilestones', args),
  uploadIssueFile: (args) => ipcRenderer.invoke('dooray:uploadIssueFile', args),
  listTags: (args) => ipcRenderer.invoke('dooray:listTags', args),
  listTemplates: (args) => ipcRenderer.invoke('dooray:listTemplates', args),
  getTemplate: (args) => ipcRenderer.invoke('dooray:getTemplate', args),
  searchMembers: (args) => ipcRenderer.invoke('dooray:searchMembers', args),
  issueComments: (args) => ipcRenderer.invoke('dooray:issueComments', args),
  addIssueComment: (args) => ipcRenderer.invoke('dooray:addIssueComment', args),
  listWorkflows: (args) => ipcRenderer.invoke('dooray:listWorkflows', args),
  setWorkflow: (args) => ipcRenderer.invoke('dooray:setWorkflow', args),
  taskBranch: {
    listSubmodules: (args) => ipcRenderer.invoke('dooray:taskBranch:listSubmodules', args),
    inspect: (args) => ipcRenderer.invoke('dooray:taskBranch:inspect', args),
    stash: (args) => ipcRenderer.invoke('dooray:taskBranch:stash', args),
    discard: (args) => ipcRenderer.invoke('dooray:taskBranch:discard', args),
    switch: (args) => ipcRenderer.invoke('dooray:taskBranch:switch', args)
  }
}
