import { describe, expect, it } from 'vitest'
import { jsonResponse, netFetchMock, useDoorayTestEnvironment } from './dooray-test-harness'
import { makeTestDoorayClient, lastCall } from './dooray-test-client'
import {
  getDoorayTemplate,
  listDoorayMilestones,
  listDoorayProjects,
  listDoorayTags,
  listDoorayTemplates,
  listDoorayWorkflows,
  searchDoorayMembers
} from './dooray-project-queries'

const client = makeTestDoorayClient()
const ok = (result: unknown) => jsonResponse({ header: { isSuccessful: true }, result })
const rawMilestone = (id: string, status: string) => ({ id, name: id, status })

describe('Dooray project queries', () => {
  useDoorayTestEnvironment()

  it('listProjects keeps only entries with id and code', async () => {
    netFetchMock.mockResolvedValueOnce(ok([{ id: '1', code: 'A' }, { id: '2' }, { code: 'C' }]))
    expect(await listDoorayProjects(client)).toEqual([{ id: '1', code: 'A' }])
    expect(lastCall().url.search).toBe('?member=me&size=100&page=0')
  })

  it('listMilestones pages past 50', async () => {
    netFetchMock
      .mockResolvedValueOnce(
        ok(Array.from({ length: 50 }, (_, i) => rawMilestone(`m${i}`, 'closed')))
      )
      .mockResolvedValueOnce(ok([rawMilestone('open1', 'open')]))
    const ms = await listDoorayMilestones(client, { projectId: 'p1' })
    expect(ms).toHaveLength(51)
    expect(ms.at(-1)).toMatchObject({ id: 'open1', status: 'open' })
    expect(lastCall(1).url.searchParams.get('page')).toBe('1')
    expect(netFetchMock).toHaveBeenCalledTimes(2)
  })

  it('listMilestones stops after 20 pages', async () => {
    netFetchMock.mockImplementation(async () =>
      ok(Array.from({ length: 50 }, (_, i) => rawMilestone(`m${i}`, 'open')))
    )
    await listDoorayMilestones(client, { projectId: 'p1' })
    expect(netFetchMock).toHaveBeenCalledTimes(20)
  })

  it('tags carry an optional group', async () => {
    netFetchMock.mockResolvedValueOnce(
      ok([
        { id: 't1', name: 'a', tagGroup: { id: 'g', name: 'G', mandatory: true } },
        { id: 't2', name: 'b' },
        { id: 't3' }
      ])
    )
    expect(await listDoorayTags(client, { projectId: 'p' })).toEqual([
      { id: 't1', name: 'a', tagGroup: { id: 'g', name: 'G', mandatory: true, selectOne: false } },
      { id: 't2', name: 'b' }
    ])
  })

  it('templates, template detail, workflows, members', async () => {
    netFetchMock.mockResolvedValueOnce(ok([{ id: 'a', templateName: 'T', isDefault: true }, {}]))
    expect(await listDoorayTemplates(client, { projectId: 'p' })).toEqual([
      { id: 'a', templateName: 'T', isDefault: true }
    ])
    netFetchMock.mockResolvedValueOnce(ok({ templateName: 'T' }))
    const t = await getDoorayTemplate(client, { projectId: 'p', templateId: 'x/y' })
    expect(t?.id).toBe('x/y')
    expect(lastCall(1).url.pathname).toBe('/project/v1/projects/p/templates/x%2Fy')
    netFetchMock.mockResolvedValueOnce(ok(null))
    expect(await getDoorayTemplate(client, { projectId: 'p', templateId: 'z' })).toBeNull()
    netFetchMock.mockResolvedValueOnce(ok([{ id: 'w', name: 'N', class: 'closed' }, { id: 'v' }]))
    expect(await listDoorayWorkflows(client, { projectId: 'p' })).toEqual([
      { id: 'w', name: 'N', workflowClass: 'closed' }
    ])
    netFetchMock.mockResolvedValueOnce(ok([{ id: 'm', name: 'Kim', userCode: 'k' }, { id: 'n' }]))
    expect(await searchDoorayMembers(client, { name: 'K&m' })).toEqual([
      { id: 'm', name: 'Kim', userCode: 'k' }
    ])
    expect(lastCall(4).url.searchParams.get('name')).toBe('K&m')
    expect(lastCall(4).url.searchParams.get('size')).toBe('20')
  })
})
