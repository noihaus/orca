import { describe, it, expect } from 'vitest'
import type { DoorayProject } from '../../../../../shared/extensions/dooray/dooray-types'
import {
  slugifyDoorayRef,
  getDoorayTaskBranchName,
  findDoorayWorkspaceMatch,
  parseDoorayTaskFromBranch
} from './dooray-branch-matching'

describe('dooray-branch-matching', () => {
  describe('slugifyDoorayRef', () => {
    it('keeps Hangul so Korean project codes do not collapse (review focus)', () => {
      expect(slugifyDoorayRef('refs/heads/feature/dooray-통합/12')).toBe('feature-dooray-통합-12')
    })

    it('prefers the longest project code', () => {
      const projects = [
        { id: 'x', code: 'D' },
        { id: 'y', code: 'dooray-D-TF' }
      ]
      expect(parseDoorayTaskFromBranch('feature/dooray-D-TF/2619', projects)?.project.id).toBe('y')
    })
  })

  describe('parseDoorayTaskFromBranch', () => {
    it('keeps Hangul so Korean project codes do not collapse (review focus)', () => {
      const projects: DoorayProject[] = [
        { id: 'a', code: 'dooray' },
        { id: 'b', code: 'dooray-통합' },
        { id: 'c', code: 'dooray-결재' }
      ]
      expect(parseDoorayTaskFromBranch('feature/dooray-결재/7', projects)).toEqual({
        project: projects[2],
        postNumber: 7
      })
      expect(parseDoorayTaskFromBranch('feature/dooray-통합/12', projects)?.project.id).toBe('b')
    })

    it('prefers the longest project code', () => {
      const projects: DoorayProject[] = [
        { id: 'x', code: 'D' },
        { id: 'y', code: 'dooray-D-TF' }
      ]
      expect(parseDoorayTaskFromBranch('feature/dooray-D-TF/2619', projects)?.project.id).toBe('y')
    })
  })

  describe('findDoorayWorkspaceMatch', () => {
    it('matches workspaces by whole token, latest active, skipping archived', () => {
      const wts = [
        { branch: 'feature/dooray-D-TF/26190', lastActivityAt: 9 },
        { branch: 'feature/dooray-D-TF/2619', lastActivityAt: 1 },
        { displayName: 'dooray-D-TF/2619 fix', lastActivityAt: 5 },
        { branch: 'feature/dooray-D-TF/2619', isArchived: true, lastActivityAt: 99 }
      ]
      expect(findDoorayWorkspaceMatch(wts, 'dooray-D-TF/2619')).toBe(wts[2])
    })
  })

  describe('getDoorayTaskBranchName', () => {
    it('branch is verbatim', () =>
      expect(getDoorayTaskBranchName({ taskNumber: 'dooray-D-TF/2619' })).toBe(
        'feature/dooray-D-TF/2619'
      ))
  })
})
