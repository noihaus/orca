import { describe, it, expect } from 'vitest'
import type {
  DoorayTag,
  DoorayTagGroup
} from '../../../../../shared/extensions/dooray/dooray-types'
import {
  groupDoorayTags,
  missingMandatoryTagGroups,
  toggleDoorayTag,
  pruneSelectOneTagIds
} from './dooray-tag-groups'

describe('dooray-tag-groups', () => {
  const type: DoorayTagGroup = { id: 'g1', name: 'Type', mandatory: true, selectOne: true }
  const tags: DoorayTag[] = [
    { id: 't1', name: 'Bug', tagGroup: type },
    { id: 't2', name: 'Feature', tagGroup: type },
    { id: 't3', name: 'misc' }
  ]

  describe('missingMandatoryTagGroups', () => {
    it('mandatory missing (review focus)', () => {
      expect(missingMandatoryTagGroups(tags, ['t3'])).toEqual([type])
      expect(missingMandatoryTagGroups(tags, ['t1'])).toEqual([])
    })
  })

  describe('toggleDoorayTag', () => {
    it('selectOne radio', () =>
      expect(toggleDoorayTag(tags, ['t1', 't3'], 't2')).toEqual(['t3', 't2']))

    it('toggling selected tag removes it', () => {
      expect(toggleDoorayTag(tags, ['t1', 't3'], 't1')).toEqual(['t3'])
    })

    it('toggling unselected non-selectOne tag adds it', () => {
      expect(toggleDoorayTag(tags, ['t1'], 't3')).toEqual(['t1', 't3'])
    })
  })

  describe('pruneSelectOneTagIds', () => {
    it('prune template tags', () =>
      expect(pruneSelectOneTagIds(tags, ['t1', 't2', 't3'])).toEqual(['t1', 't3']))
  })

  describe('groupDoorayTags', () => {
    it('ungrouped last', () =>
      expect(groupDoorayTags(tags).map((g) => g.group?.id ?? null)).toEqual(['g1', null]))
  })
})
