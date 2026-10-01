import type {
  DoorayTag,
  DoorayTagGroup
} from '../../../../../shared/extensions/dooray/dooray-types'

export function groupDoorayTags(
  tags: DoorayTag[]
): { group: DoorayTagGroup | null; tags: DoorayTag[] }[] {
  const grouped = new Map<string | null, DoorayTag[]>()
  const groupOrder: (string | null)[] = []

  for (const tag of tags) {
    const groupId = tag.tagGroup?.id ?? null
    if (!grouped.has(groupId)) {
      grouped.set(groupId, [])
      groupOrder.push(groupId)
    }
    grouped.get(groupId)!.push(tag)
  }

  return groupOrder.map((groupId) => ({
    group:
      groupId === null ? null : (tags.find((t) => t.tagGroup?.id === groupId)?.tagGroup ?? null),
    tags: grouped.get(groupId)!
  }))
}

export function missingMandatoryTagGroups(tags: DoorayTag[], selected: string[]): DoorayTagGroup[] {
  const missing: DoorayTagGroup[] = []
  const seenGroups = new Set<string>()

  for (const tagId of selected) {
    const tag = tags.find((t) => t.id === tagId)
    if (tag?.tagGroup) {
      seenGroups.add(tag.tagGroup.id)
    }
  }

  for (const tag of tags) {
    if (tag.tagGroup && tag.tagGroup.mandatory && !seenGroups.has(tag.tagGroup.id)) {
      if (!missing.some((g) => g.id === tag.tagGroup!.id)) {
        missing.push(tag.tagGroup)
      }
    }
  }

  return missing
}

export function toggleDoorayTag(tags: DoorayTag[], selected: string[], tagId: string): string[] {
  const tag = tags.find((t) => t.id === tagId)
  if (!tag) {
    return selected
  }

  if (selected.includes(tagId)) {
    return selected.filter((id) => id !== tagId)
  }

  if (tag.tagGroup?.selectOne) {
    const filtered = selected.filter((id) => {
      const t = tags.find((t) => t.id === id)
      return t?.tagGroup?.id !== tag.tagGroup?.id
    })
    return [...filtered, tagId]
  }

  return [...selected, tagId]
}

export function pruneSelectOneTagIds(tags: DoorayTag[], ids: string[]): string[] {
  const result: string[] = []
  const seenGroups = new Set<string>()

  for (const id of ids) {
    const tag = tags.find((t) => t.id === id)
    if (!tag) {
      continue
    }

    if (tag.tagGroup && tag.tagGroup.selectOne) {
      if (seenGroups.has(tag.tagGroup.id)) {
        continue
      }
      seenGroups.add(tag.tagGroup.id)
    }

    result.push(id)
  }

  return result
}
